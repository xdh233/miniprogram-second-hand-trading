// pages/chat/chat.js - 完整修复版本
const userManager = require('../../utils/userManager');
const chatManager = require('../../utils/chatManager');
const webSocketManager = require('../../utils/webSocketManager');
const apiConfig = require('../../utils/apiConfig');

Page({
  data: {
    userInfo: null,
    otherUser: null,
    chatId: null,
    userId: null,
    itemId: null,
    messages: [],
    inputText: '',
    showItemCard: false,
    relatedItem: null,
    scrollTop: 0,
    loading: false,
    inputBottom: 0,
    
    // WebSocket状态
    connectionStatus: 'connecting',
    
    // 页面状态
    isPageActive: true,
    reconnectAttempts: 0,
    maxReconnectAttempts: 3,
    
    // 消息相关
    messageIds: new Set()
  },

  onLoad(options) {
    console.log('聊天页面加载, options:', options);
    
    if (!options.userId) {
      wx.showToast({ title: '参数错误', icon: 'none' });
      wx.navigateBack();
      return;
    }

    const userId = parseInt(options.userId);
    if (isNaN(userId)) {
      wx.showToast({ title: '用户ID错误', icon: 'none' });
      wx.navigateBack();
      return;
    }

    // 设置页面参数
    let itemId = null;
    let showItemCard = false;

    if (options.itemId) {
      itemId = parseInt(options.itemId);
      showItemCard = true;
    }

    this.setData({
      userId: userId,
      itemId: itemId,
      showItemCard: showItemCard
    });

    this.initializePage();
  },

  // 初始化页面
  async initializePage() {
    try {
      if (!userManager.isLoggedIn()) {
        wx.redirectTo({ url: '/pages/login/login' });
        return;
      }

      const userInfo = userManager.getCurrentUser();
      if (!userInfo) {
        wx.showToast({ title: '获取用户信息失败', icon: 'none' });
        return;
      }
      
      if (userInfo.avatar) {
        userInfo.avatar = apiConfig.getAvatarUrl(userInfo.avatar);
      }
      this.setData({ userInfo });

      await this.initChat();
      this.setupWebSocketListeners();

    } catch (error) {
      console.error('页面初始化失败:', error);
      wx.showToast({ title: '初始化失败', icon: 'none' });
    }
  },

  // 初始化聊天
  async initChat() {
    try {
      wx.showLoading({ title: '加载中...' });

      // 获取目标用户信息
      const otherUser = await userManager.getUserInfo(this.data.userId);
      if (otherUser.avatar) {
        otherUser.avatar = apiConfig.getAvatarUrl(otherUser.avatar);
      }

      // 获取商品信息（如果有）
      let relatedItem = null;
      if (this.data.showItemCard && this.data.itemId) {
        try {
          relatedItem = await this.getItemInfo(this.data.itemId);
        } catch (error) {
          console.error('获取商品信息失败:', error);
          this.setData({ showItemCard: false });
        }
      }

      // 获取或创建聊天
      const chat = await chatManager.getOrCreateChat(
        this.data.userInfo.id,
        this.data.userId,
        this.data.itemId
      );

      this.setData({
        otherUser: otherUser,
        chatId: chat.id,
        relatedItem: relatedItem
      });

      wx.hideLoading();
      await this.loadMessages();

      // 启动聊天会话
      const connectionMode = await chatManager.startChatSession(
        chat.id, 
        this.handleNewMessage.bind(this)
      );
      
      this.setData({ 
        connectionStatus: connectionMode === 'websocket' ? 'connected' : 'polling' 
      });

    } catch (error) {
      wx.hideLoading();
      console.error('初始化聊天失败:', error);
      wx.showToast({ title: '聊天初始化失败', icon: 'none' });
    }
  },

  // WebSocket事件监听
  setupWebSocketListeners() {
    webSocketManager.on('connected', () => {
      this.setData({ connectionStatus: 'connected' });
    });

    webSocketManager.on('disconnected', () => {
      this.setData({ connectionStatus: 'polling' });
    });

    webSocketManager.on('connect_error', () => {
      this.setData({ connectionStatus: 'disconnected' });
    });
  },

  // 获取商品信息
  async getItemInfo(itemId) {
    try {
      const response = await apiConfig.get(`/items/${itemId}`);
      let item = response && response.success ? response.data : response;
      
      if (!item || !item.id) {
        throw new Error('商品数据无效');
      }
      
      if (item.images && Array.isArray(item.images)) {
        item.images = item.images.map(img => apiConfig.getImageUrl(img));
      }
      
      return item;
    } catch (error) {
      console.error('获取商品信息失败:', error);
      throw error;
    }
  },

  // 处理新消息
  handleNewMessage(messageData) {
    if (!this.data.messageIds) {
      this.setData({ messageIds: new Set() });
    }
    
    if (this.data.messageIds.has(messageData.id)) {
      return;
    }
    
    const processedMessage = this.processMessages([messageData]);
    if (processedMessage.length === 0) return;
    
    const currentMessages = this.data.messages || [];
    const updatedMessageIds = new Set(this.data.messageIds);
    updatedMessageIds.add(messageData.id);
    
    this.setData({
      messages: [...currentMessages, ...processedMessage],
      messageIds: updatedMessageIds
    });

    this.scrollToBottom();

    if (messageData.sender_id !== this.data.userInfo.id) {
      chatManager.markAsRead(this.data.chatId);
    }
  },

  // 加载消息
  async loadMessages() {
    if (!this.data.chatId) return;

    try {
      this.setData({
        messages: [],
        messageIds: new Set()
      });
      
      const result = await chatManager.getChatMessages(this.data.chatId, 1, 50);
      const processedMessages = this.processMessages(result.messages || []);

      const messageIds = new Set();
      processedMessages.forEach(msg => {
        if (msg.id) messageIds.add(msg.id);
      });

      this.setData({
        messages: processedMessages,
        messageIds: messageIds,
        loading: false
      });

      try {
        await chatManager.markAsRead(this.data.chatId);
      } catch (error) {
        console.log('标记已读失败:', error);
      }

      this.scrollToBottom();

    } catch (error) {
      console.error('加载消息失败:', error);
      this.setData({ 
        loading: false,
        messages: [],
        messageIds: new Set()
      });
      wx.showToast({ title: '消息加载失败', icon: 'none' });
    }
  },

  // 处理消息数据
  processMessages(messages) {
    const currentUserId = this.data.userInfo.id;
    
    return messages.map((msg, index) => {
      const isSelf = msg.sender_id === currentUserId;
      
      let showTime = false;
      if (index === 0) {
        showTime = true;
      } else {
        const prevMsg = messages[index - 1];
        const timeDiff = new Date(msg.created_at) - new Date(prevMsg.created_at);
        showTime = timeDiff > 5 * 60 * 1000;
      }

      let imageUrl = null;
      if (msg.image_url) {
        imageUrl = apiConfig.getImageUrl(msg.image_url);
      }
      
      return {
        ...msg,
        isSelf: isSelf,
        showTime: showTime,
        timeDisplay: this.formatMessageTime(msg.created_at),
        imageUrl: imageUrl || null,
        unique: `${msg.id}_${msg.created_at}`
      };
    });
  },

  // 格式化消息时间
  formatMessageTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

    if (msgDate.getTime() === today.getTime()) {
      return timeStr;
    } else {
      return `${date.getMonth() + 1}月${date.getDate()}日 ${timeStr}`;
    }
  },

  // 发送文本消息
  async sendTextMessage() {
    const content = this.data.inputText.trim();
    if (!content || !this.data.chatId) return;

    // 检查页面状态
    if (!this.data.isPageActive) {
      wx.showToast({ title: '请等待页面激活', icon: 'none' });
      return;
    }

    // 检查连接状态
    if (this.data.connectionStatus === 'disconnected') {
      wx.showToast({ title: '正在重连...', icon: 'loading' });
      await this.reconnectChatSession();
    }

    try {
      console.log('=== 聊天页面发送消息调试 ===');
      console.log('当前用户ID:', this.data.userInfo.id, 'type:', typeof this.data.userInfo.id);
      console.log('目标用户ID:', this.data.userId, 'type:', typeof this.data.userId);
      console.log('聊天ID:', this.data.chatId);
      console.log('消息内容:', content);
      console.log('页面活跃状态:', this.data.isPageActive);
      console.log('连接状态:', this.data.connectionStatus);
      
      this.setData({ inputText: '' });

      const message = await chatManager.sendMessage(
        this.data.chatId,
        this.data.userId,
        {
          type: 'text',
          content: content,
          senderId: this.data.userInfo.id
        }
      );

      if (this.data.connectionStatus === 'polling' && message.id) {
        this.handleNewMessage(message);
      }

    } catch (error) {
      console.error('发送消息失败:', error);
      
      // 如果是连接问题，尝试重连
      if (error.message && error.message.includes('连接')) {
        this.setData({ connectionStatus: 'disconnected' });
        setTimeout(() => {
          if (this.data.isPageActive) {
            this.reconnectChatSession();
          }
        }, 1000);
      }
      
      wx.showToast({ title: '发送失败', icon: 'none' });
    }
  },

  // 🔥 修复后的发送图片消息
  async sendImageMessage() {
    try {
      console.log('=== 聊天页面发送图片调试 ===');
      
      // 🔥 确保WebSocket状态正确
      webSocketManager.forceSetAppVisible();
      
      const wsStatus = webSocketManager.getStatus();
      console.log('WebSocket完整状态:', wsStatus);
      
      // 检查页面状态
      if (!this.data.isPageActive) {
        console.log('页面不活跃，无法发送消息');
        wx.showToast({ title: '请等待页面激活', icon: 'none' });
        return;
      }

      // 检查连接状态
      if (this.data.connectionStatus === 'disconnected') {
        console.log('连接已断开，尝试重连');
        wx.showToast({ title: '正在重连...', icon: 'loading' });
        await this.reconnectChatSession();
        
        // 重连后再次检查状态
        if (this.data.connectionStatus === 'disconnected') {
          wx.showToast({ title: '连接失败，请稍后重试', icon: 'none' });
          return;
        }
      }

      console.log('开始选择图片...');
      
      // 先检查基本条件
      if (!this.data.chatId || !this.data.userId) {
        console.error('缺少必要参数:', { chatId: this.data.chatId, userId: this.data.userId });
        wx.showToast({ title: '聊天信息错误', icon: 'none' });
        return;
      }

      // 选择图片
      const chooseResult = await new Promise((resolve, reject) => {
        wx.chooseMedia({
          count: 1,
          mediaType: ['image'],
          sizeType: ['compressed'],
          sourceType: ['album', 'camera'],
          success: resolve,
          fail: reject
        });
      });

      // 检查选择结果
      if (!chooseResult || !chooseResult.tempFiles || chooseResult.tempFiles.length === 0) {
        console.log('用户取消选择图片');
        return;
      }

      const selectedFile = chooseResult.tempFiles[0];
      const imagePath = selectedFile.tempFilePath;
      
      console.log('图片选择成功:', {
        path: imagePath,
        size: selectedFile.size,
        type: selectedFile.fileType
      });

      // 检查文件大小
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (selectedFile.size > maxSize) {
        wx.showToast({ title: '图片文件过大', icon: 'none' });
        return;
      }

      // 再次检查页面状态（用户选择图片可能需要时间）
      if (!this.data.isPageActive) {
        console.log('选择图片期间页面变为不活跃');
        wx.showToast({ title: '页面状态异常，请重试', icon: 'none' });
        return;
      }

      // 🔥 再次确保WebSocket状态
      webSocketManager.forceSetAppVisible();
      console.log('发送前再次确保WebSocket为前台状态');

      // 发送图片消息
      console.log('开始发送图片消息...');
      
      const message = await chatManager.sendImageMessage(
        this.data.chatId,
        this.data.userId,
        imagePath
      );

      console.log('图片消息发送成功:', message);

      // 处理发送结果
      if (this.data.connectionStatus === 'polling' && message && message.id) {
        this.handleNewMessage(message);
      }

    } catch (error) {
      console.error('发送图片消息完整错误:', error);
      
      // 特殊处理状态错误
      if (error.message && error.message.includes('后台')) {
        console.log('检测到后台状态错误，强制重置状态');
        webSocketManager.forceSetAppVisible();
        wx.showToast({ title: '状态异常已修复，请重试', icon: 'none' });
      } else if (error.message && (
        error.message.includes('WebSocket') || 
        error.message.includes('网络') ||
        error.message.includes('连接')
      )) {
        console.log('检测到连接问题，尝试重连');
        this.setData({ connectionStatus: 'disconnected' });
        wx.showToast({ title: '网络连接异常，请重试', icon: 'none' });
        
        // 异步重连，不阻塞用户
        setTimeout(() => {
          if (this.data.isPageActive) {
            this.reconnectChatSession();
          }
        }, 1000);
      } else {
        // 其他错误的处理
        let errorMessage = '发送图片失败';
        
        if (error.message) {
          if (error.message.includes('上传')) {
            errorMessage = '图片上传失败';
          } else if (error.message.includes('格式')) {
            errorMessage = '图片格式不支持';
          } else if (error.message.includes('用户')) {
            errorMessage = '用户状态异常，请重新进入';
          }
        }
        
        wx.showToast({ 
          title: errorMessage, 
          icon: 'none',
          duration: 2000
        });
      }
    }
  },

  // 重连聊天会话
  async reconnectChatSession() {
    if (!this.data.chatId || !this.data.isPageActive) {
      console.log('跳过重连 - 无聊天ID或页面不活跃');
      return;
    }

    try {
      console.log('开始重连聊天会话:', this.data.chatId);
      
      // 检查WebSocket状态
      const wsStatus = webSocketManager.getStatus();
      console.log('当前WebSocket状态:', wsStatus);
      
      // 如果WebSocket连接有问题，先重置
      if (!wsStatus.isConnected || wsStatus.authenticatedUserId !== this.data.userInfo.id) {
        console.log('WebSocket状态异常，重置连接');
        chatManager.stopChatSession();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // 重新启动聊天会话
      const connectionMode = await chatManager.startChatSession(
        this.data.chatId, 
        this.handleNewMessage.bind(this)
      );
      
      console.log('重连成功，连接模式:', connectionMode);
      this.setData({ 
        connectionStatus: connectionMode === 'websocket' ? 'connected' : 'polling',
        reconnectAttempts: 0
      });
      
    } catch (error) {
      console.error('重连聊天会话失败:', error);
      
      const attempts = this.data.reconnectAttempts + 1;
      this.setData({ reconnectAttempts: attempts });
      
      if (attempts < this.data.maxReconnectAttempts) {
        console.log(`重连失败，${2000 * attempts}ms后重试 (${attempts}/${this.data.maxReconnectAttempts})`);
        setTimeout(() => {
          if (this.data.isPageActive) {
            this.reconnectChatSession();
          }
        }, 2000 * attempts);
      } else {
        console.log('重连次数过多，使用轮询模式');
        this.setData({ connectionStatus: 'polling' });
        wx.showToast({ title: '连接不稳定，已切换为轮询模式', icon: 'none' });
      }
    }
  },

  // 滚动到底部
  scrollToBottom() {
    setTimeout(() => {
      this.setData({ scrollTop: 999999 });
    }, 100);
  },

  // ===================
  // 事件处理
  // ===================

  // 输入框变化
  onInputChange(e) {
    this.setData({ inputText: e.detail.value });
  },

  // 键盘高度变化
  onKeyboardHeightChange(e) {
    this.setData({ inputBottom: e.detail.height });
    
    if (e.detail.height > 0) {
      setTimeout(() => this.scrollToBottom(), 300);
    }
  },

  // 返回按钮
  onBackTap() {
    wx.navigateBack();
  },

  // 商品卡片点击
  onItemCardTap() {
    if (this.data.relatedItem) {
      wx.navigateTo({
        url: `/pages/item-detail/item-detail?id=${this.data.relatedItem.id}`
      });
    }
  },

  // 图片预览
  previewImage(e) {
    const url = e.currentTarget.dataset.url;
    wx.previewImage({
      current: url,
      urls: [url]
    });
  },

  // 长按消息
  onLongPressMessage(e) {
    const message = e.currentTarget.dataset.message;
    
    if (message && message.type === 'text') {
      wx.showActionSheet({
        itemList: ['复制'],
        success: (res) => {
          if (res.tapIndex === 0) {
            wx.setClipboardData({
              data: message.content,
              success: () => wx.showToast({ title: '已复制', icon: 'success' })
            });
          }
        }
      });
    }
  },

  // ===================
  // 页面生命周期
  // ===================

  onShow() {
    console.log('聊天页面显示');
    this.setData({ isPageActive: true });
    
    // 🔥 确保WebSocket状态正确
    webSocketManager.forceSetAppVisible();
    
    if (this.data.chatId) {
      setTimeout(async () => {
        try {
          console.log('页面显示 - 重新启动聊天会话');
          await this.reconnectChatSession();
        } catch (error) {
          console.error('页面显示时重连失败:', error);
        }
      }, 500);
    }
  },

  onHide() {
    console.log('聊天页面隐藏');
    this.setData({ isPageActive: false });
  },

  onUnload() {
    console.log('聊天页面卸载');
    this.setData({ isPageActive: false });
    chatManager.stopChatSession();
  }
});