// 简化版 pages/chat/chat.js
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
    
    // WebSocket状态 - 保留
    connectionStatus: 'connecting',
    
    // 消息相关 - 简化
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

  // WebSocket事件监听 - 简化版
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
  
    try {
      // 🔧 添加调试信息
      console.log('=== 聊天页面发送消息调试 ===');
      console.log('当前用户ID:', this.data.userInfo.id, 'type:', typeof this.data.userInfo.id);
      console.log('目标用户ID:', this.data.userId, 'type:', typeof this.data.userId);
      console.log('聊天ID:', this.data.chatId);
      console.log('消息内容:', content);
      
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
      wx.showToast({ title: '发送失败', icon: 'none' });
    }
  },

  // 发送图片消息
  async sendImageMessage() {
    try {
      const res = await wx.chooseMedia({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      });

      if (res.tempFilePaths && res.tempFilePaths.length > 0) {
        const imagePath = res.tempFilePaths[0];
        
        const message = await chatManager.sendImageMessage(
          this.data.chatId,
          this.data.userId,
          imagePath
        );

        if (this.data.connectionStatus === 'polling' && message.id) {
          this.handleNewMessage(message);
        }
      }
    } catch (error) {
      console.error('发送图片失败:', error);
      wx.showToast({ title: '发送图片失败', icon: 'none' });
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

  // 长按消息 - 简化版
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
    if (this.data.chatId) {
      chatManager.startChatSession(
        this.data.chatId, 
        this.handleNewMessage.bind(this)
      );
    }
  },

  onUnload() {
    chatManager.stopChatSession();
  }
});