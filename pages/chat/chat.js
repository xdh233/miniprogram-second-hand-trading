// chat.js - 修复版本（基于现有结构）
const userManager = require('../../utils/userManager');
const chatManager = require('../../utils/chatManager');
const apiConfig = require('../../utils/apiConfig');

Page({
  data: {
    userInfo: null,
    otherUser: null,
    chatId: null,
    userId: null,          // 目标用户ID
    itemId: null,          // 商品ID（来自item详情页）
    postId: null,          // 动态ID（来自post详情页）
    messages: [],
    inputText: '',
    showItemCard: false,   // 是否显示商品卡片
    relatedItem: null,     // 商品信息
    scrollTop: 0,
    loading: false,
    inputBottom: 0
  },

  onLoad(options) {
    console.log('聊天页面加载, options:', options);
    
    // 验证必要参数
    if (!options.userId) {
      console.error('缺少目标用户ID');
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      });
      wx.navigateBack();
      return;
    }

    const userId = parseInt(options.userId);
    if (isNaN(userId)) {
      console.error('用户ID格式错误:', options.userId);
      wx.showToast({
        title: '用户ID错误',
        icon: 'none'
      });
      wx.navigateBack();
      return;
    }

    // 确定场景和参数
    let itemId = null;
    let postId = null;
    let showItemCard = false;

    if (options.itemId) {
      // 来自商品详情页的场景
      itemId = parseInt(options.itemId);
      showItemCard = true;
      console.log('场景：商品聊天，itemId:', itemId);
    } else if (options.postId) {
      // 来自动态详情页的场景  
      postId = parseInt(options.postId);
      showItemCard = false;
      console.log('场景：动态聊天，postId:', postId);
    } else {
      // 纯聊天场景（可能来自聊天列表）
      showItemCard = false;
      console.log('场景：纯聊天');
    }

    this.setData({
      userId: userId,
      itemId: itemId,
      postId: postId,
      showItemCard: showItemCard
    });
    console.log('调试数据:', {
      showItemCard: this.data.showItemCard,
      relatedItem: this.data.relatedItem,
      itemId: this.data.itemId
    });
    // 初始化
    this.initializePage();
  },

  // 初始化页面
  async initializePage() {
    try {
      // 1. 检查登录状态
      if (!userManager.isLoggedIn()) {
        wx.redirectTo({
          url: '/pages/login/login'
        });
        return;
      }

      // 2. 获取当前用户信息
      const userInfo = userManager.getCurrentUser();
      if (!userInfo) {
        wx.showToast({
          title: '获取用户信息失败',
          icon: 'none'
        });
        return;
      }
      if (userInfo.avatar) {
        userInfo.avatar = apiConfig.getAvatarUrl(userInfo.avatar);
      }
      this.setData({ userInfo });

      // 3. 初始化聊天
      await this.initChat();

    } catch (error) {
      console.error('页面初始化失败:', error);
      wx.showToast({
        title: '初始化失败',
        icon: 'none'
      });
    }
  },

  // 初始化聊天
  async initChat() {
    console.log('开始初始化聊天');
    
    try {
      wx.showLoading({ title: '加载中...' });

      // 1. 获取目标用户信息
      const otherUser = await userManager.getUserInfo(this.data.userId);
      console.log('目标用户信息:', otherUser);
      if (otherUser.avatar) {
        otherUser.avatar = apiConfig.getAvatarUrl(otherUser.avatar);
      }

      // 2. 如果是商品聊天，获取商品信息
      let relatedItem = null;
      if (this.data.showItemCard && this.data.itemId) {
        try {
          relatedItem = await this.getItemInfo(this.data.itemId);
          console.log('商品信息:', relatedItem);
        } catch (error) {
          console.error('获取商品信息失败:', error);
          // 商品获取失败不影响聊天，但隐藏商品卡片
          this.setData({ showItemCard: false });
        }
      }

      // 3. 获取或创建聊天
      const chat = await chatManager.getOrCreateChat(
        this.data.userInfo.id,
        this.data.userId,
        this.data.itemId // 商品聊天传itemId，动态聊天传null
      );
      console.log('聊天信息:', chat);

      // 4. 更新页面数据
      this.setData({
        otherUser: otherUser,
        chatId: chat.id,
        relatedItem: relatedItem
      });

      wx.hideLoading();

      // 5. 加载消息历史
      await this.loadMessages();

      // 6. 开始轮询
      this.startPolling();

    } catch (error) {
      wx.hideLoading();
      console.error('初始化聊天失败:', error);
      wx.showToast({
        title: '聊天初始化失败',
        icon: 'none'
      });
    }
  },

  // 获取商品信息
  async getItemInfo(itemId) {
    try {
      console.log('开始获取商品信息，itemId:', itemId);
      const response = await apiConfig.get(`/items/${itemId}`);
      console.log('商品API响应:', response);
      console.log('响应类型:', typeof response);
      console.log('响应的keys:', Object.keys(response));
      
      // 🔧 修复：检查不同的响应格式
      let item = null;
      
      if (response && response.success && response.data) {
        // 格式1: {success: true, data: {...}}
        item = response.data;
        console.log('使用格式1，商品数据:', item);
      } else if (response && response.id) {
        // 格式2: 直接返回商品对象 {id: 12, title: "..."}
        item = response;
        console.log('使用格式2，商品数据:', item);
      } else {
        console.error('未知的响应格式:', response);
        throw new Error('商品数据格式错误');
      }
      
      if (!item || !item.id) {
        throw new Error('商品数据无效');
      }
      
      // 处理图片URL
      if (item.images && Array.isArray(item.images)) {
        item.images = item.images.map(img => apiConfig.getImageUrl(img));
      }
      
      console.log('最终商品信息:', item);
      return item;
    } catch (error) {
      console.error('获取商品信息详细错误:', error);
      console.error('错误堆栈:', error.stack);
      throw error;
    }
  },
  // 加载消息
  async loadMessages() {
    if (!this.data.chatId) return;

    try {
      console.log('加载聊天历史消息:', this.data.chatId);
      
      // 重置消息状态
      this.setData({
        messages: [],
        messageIds: new Set()
      });
      
      const result = await chatManager.getChatMessages(this.data.chatId, 1, 50);
      console.log('消息加载结果:', result);
      
      // 处理消息数据，添加显示需要的字段
      const processedMessages = this.processMessages(result.messages || []);

      // 记录消息ID
      const messageIds = new Set();
      processedMessages.forEach(msg => messageIds.add(msg.id));

      this.setData({
        messages: processedMessages,
        messageIds: messageIds,
        loading: false
      });

      // 标记为已读
      try {
        await chatManager.markAsRead(this.data.chatId);
      } catch (error) {
        console.log('标记已读失败:', error);
      }

      // 滚动到底部
      this.scrollToBottom();

    } catch (error) {
      console.error('加载消息失败:', error);
      this.setData({ 
        loading: false,
        messages: [],
        messageIds: new Set()
      });
      
      wx.showToast({
        title: '消息加载失败',
        icon: 'none'
      });
    }
  },

  // 处理消息数据
  processMessages(messages) {
    const currentUserId = this.data.userInfo.id;
    
    return messages.map((msg, index) => {
      const isSelf = msg.sender_id === currentUserId;
      
      // 判断是否显示时间
      let showTime = false;
      if (index === 0) {
        showTime = true;
      } else {
        const prevMsg = messages[index - 1];
        const timeDiff = new Date(msg.created_at) - new Date(prevMsg.created_at);
        showTime = timeDiff > 5 * 60 * 1000; // 5分钟间隔显示时间
      }

      let imageUrl = null;
      if (msg.image_url) {
        imageUrl = apiConfig.getImageUrl(msg.image_url);
      }
  
      // 处理商品卡片中的图片
      let itemData = msg.item_data;
      if (itemData && itemData.image) {
        itemData = {
          ...itemData,
          image: apiConfig.getImageUrl(itemData.image)
        };
      }
      return {
        ...msg,
        isSelf: isSelf,
        showTime: showTime,
        timeDisplay: this.formatMessageTime(msg.created_at),
        imageUrl: imageUrl || null,
        itemData: itemData || null,
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

  // 开始轮询
  startPolling() {
    if (!this.data.chatId) return;

    chatManager.startPolling(this.data.chatId, (newMessages) => {
      console.log('收到新消息:', newMessages);
      
      // 过滤掉已存在的消息
      const currentMessageIds = this.data.messageIds;
      const filteredNewMessages = newMessages.filter(msg => !currentMessageIds.has(msg.id));
      
      if (filteredNewMessages.length === 0) {
        console.log('没有真正的新消息');
        return;
      }
      
      console.log('处理新消息:', filteredNewMessages.length, '条');
      
      const processedNewMessages = this.processMessages(filteredNewMessages);
      const currentMessages = this.data.messages;
      
      // 更新消息ID集合
      const updatedMessageIds = new Set(currentMessageIds);
      processedNewMessages.forEach(msg => updatedMessageIds.add(msg.id));
      
      this.setData({
        messages: [...currentMessages, ...processedNewMessages],
        messageIds: updatedMessageIds
      });

      // 自动滚动到底部
      this.scrollToBottom();

      // 标记为已读
      chatManager.markAsRead(this.data.chatId);
    });
  },

  // 发送文本消息
  async sendTextMessage() {
    const content = this.data.inputText.trim();
    if (!content || !this.data.chatId) return;

    try {
      // 清空输入框
      this.setData({ inputText: '' });

      // 发送消息
      const message = await chatManager.sendMessage(
        this.data.chatId,
        this.data.userId,
        {
          type: 'text',
          content: content
        }
      );

      // 检查消息是否已存在
      if (this.data.messageIds.has(message.id)) {
        console.log('消息已存在，跳过添加');
        return;
      }

      // 添加到消息列表
      const processedMessage = this.processMessages([message]);
      const currentMessages = this.data.messages;
      const updatedMessageIds = new Set(this.data.messageIds);
      updatedMessageIds.add(message.id);
      
      this.setData({
        messages: [...currentMessages, ...processedMessage],
        messageIds: updatedMessageIds
      });

      // 滚动到底部
      this.scrollToBottom();

    } catch (error) {
      console.error('发送消息失败:', error);
      wx.showToast({
        title: '发送失败',
        icon: 'none'
      });
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

        // 添加到消息列表
        const processedMessage = this.processMessages([message]);
        const currentMessages = this.data.messages;
        
        this.setData({
          messages: [...currentMessages, ...processedMessage]
        });

        this.scrollToBottom();
      }
    } catch (error) {
      console.error('发送图片失败:', error);
      wx.showToast({
        title: '发送图片失败',
        icon: 'none'
      });
    }
  },

  // 滚动到底部
  scrollToBottom() {
    setTimeout(() => {
      this.setData({
        scrollTop: 999999
      });
    }, 100);
  },

  // 事件处理方法
  onInputChange(e) {
    this.setData({
      inputText: e.detail.value
    });
  },

  onKeyboardHeightChange(e) {
    this.setData({
      inputBottom: e.detail.height
    });
  },

  onBackTap() {
    wx.navigateBack();
  },

  onItemCardTap() {
    if (this.data.relatedItem) {
      wx.navigateTo({
        url: `/pages/item-detail/item-detail?id=${this.data.relatedItem.id}`
      });
    }
  },

  previewImage(e) {
    const url = e.currentTarget.dataset.url;
    wx.previewImage({
      current: url,
      urls: [url]
    });
  },

  // 页面生命周期
  onShow() {
    console.log('聊天页面显示');
  },

  onHide() {
    console.log('聊天页面隐藏');
    chatManager.stopPolling();
  },
  // 页面卸载时重置状态
  onUnload() {
    console.log('聊天页面卸载');
  }
});