// utils/chatManager.js - WebSocket版聊天管理器
const apiConfig = require('./apiConfig');
const webSocketManager = require('./webSocketManager');
const userManager = require('./userManager');

class ChatManager {
  constructor() {
    // WebSocket配置
    this.useWebSocket = true;
    this.webSocketConnected = false;
    
    // 轮询配置（降级方案）
    this.pollingInterval = null;
    this.currentChatId = null;
    this.lastMessageTime = null;
    this.isPolling = false;
    this.messageHandlers = new Map();
    this.POLLING_INTERVAL = 3000; // 3秒轮询一次
    
    // 消息缓存
    this.messageCache = new Map(); // chatId -> messages[]
    this.unreadCounts = new Map(); // chatId -> count
    
    // 初始化WebSocket事件监听
    this.initWebSocketListeners();
    
    console.log('ChatManager初始化完成 - WebSocket模式');
  }
  checkUserSwitch() {
    const currentUser = userManager.getCurrentUser();
    
    if (!currentUser) {
      console.log('用户未登录');
      return true; // 需要重新初始化
    }
    
    if (this.currentUserId && this.currentUserId !== currentUser.id) {
      console.log(`检测到用户切换: ${this.currentUserId} -> ${currentUser.id}`);
      return true; // 用户已切换
    }
    
    return false; // 用户未切换
  }
  // 🔌 初始化WebSocket事件监听
  initWebSocketListeners() {
    webSocketManager.on('new_message', (messageData) => {
      console.log('WebSocket收到新消息:', messageData);
      this.handleNewMessage(messageData); // 确保this指向正确
    });
    // WebSocket连接状态监听
    webSocketManager.on('connected', () => {
      console.log('WebSocket已连接，启用实时消息');
      this.webSocketConnected = true;
      this.stopPolling(); // 停止轮询
    });

    webSocketManager.on('disconnected', () => {
      console.log('WebSocket已断开，降级到轮询模式');
      this.webSocketConnected = false;
      // 如果有活跃聊天，启动轮询降级
      if (this.currentChatId) {
        this.startPolling(this.currentChatId);
      }
    });

    // 新消息监听
    webSocketManager.on('new_message', (messageData) => {
      console.log('WebSocket收到新消息:', messageData);
      this.handleNewMessage(messageData);
    });

    // 消息通知监听
    webSocketManager.on('message_notification', (notification) => {
      console.log('收到消息通知:', notification);
      this.handleMessageNotification(notification);
    });

    // 消息已读监听
    webSocketManager.on('messages_read', (data) => {
      console.log('消息已读状态更新:', data);
      this.handleMessagesRead(data);
    });

    // 用户输入状态监听
    webSocketManager.on('user_typing', (data) => {
      console.log('用户输入状态:', data);
      this.emit('user_typing', data);
    });

    // 在线状态监听
    webSocketManager.on('user_online', (data) => {
      this.emit('user_online', data);
    });

    webSocketManager.on('user_offline', (data) => {
      this.emit('user_offline', data);
    });
  }

  // 🚀 启动聊天管理器
  async startChatSession(chatId, messageCallback) {
    console.log('启动聊天会话:', chatId);
    
    const currentUser = userManager.getCurrentUser();
    if (!currentUser) {
      throw new Error('用户未登录');
    }
    
    // 🔧 检查用户是否切换
    if (this.checkUserSwitch()) {
      console.log('检测到用户切换，重置聊天管理器状态');
      
      // 停止现有会话
      this.stopChatSession();
      
      // 强制WebSocket重连
      if (webSocketManager.isConnected) {
        console.log('用户切换，强制WebSocket重连');
        webSocketManager.disconnect();
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // 更新当前用户ID
    this.currentUserId = currentUser.id;
    
    // 设置当前聊天和回调
    this.currentChatId = chatId;
    this.messageCallback = messageCallback;

    try {
      // 尝试WebSocket连接
      await webSocketManager.connect();
      
      // 检查WebSocket认证状态
      const wsStatus = webSocketManager.getStatus();
      if (wsStatus.authenticatedUserId !== currentUser.id) {
        console.error('WebSocket认证用户不匹配:', {
          websocket: wsStatus.authenticatedUserId,
          current: currentUser.id
        });
        
        // 强制重连
        webSocketManager.disconnect();
        await new Promise(resolve => setTimeout(resolve, 500));
        await webSocketManager.connect();
      }
      
      if (webSocketManager.isConnected) {
        console.log('使用WebSocket模式');
        webSocketManager.joinChat(chatId);
        return 'websocket';
      }
    } catch (error) {
      console.error('WebSocket连接失败，降级到轮询模式:', error);
    }

    // 降级到轮询模式
    console.log('使用轮询模式');
    this.startPolling();
    return 'polling';
  }

  // 🛑 停止聊天会话
  stopChatSession() {
    console.log('停止聊天会话');
    
    if (this.currentChatId && webSocketManager.isConnected) {
      webSocketManager.leaveChat();
    }
    
    this.currentChatId = null;
    this.messageCallback = null;
    this.currentUserId = null; // 🔧 新增：清除用户ID
    
    // 停止轮询
    this.stopPolling();
  }

  // ===================
  // 聊天相关方法
  // ===================

  // 创建或获取聊天
  async getOrCreateChat(user1Id, user2Id, relatedItemId = null) {
    try {
      console.log('创建/获取聊天:', { user1Id, user2Id, relatedItemId });
      
      const response = await apiConfig.post('/chats', {
        user2_id: user2Id,
        related_item_id: relatedItemId
      });

      console.log('聊天API响应:', response);

      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.message || '创建聊天失败');
      }
    } catch (error) {
      console.error('创建/获取聊天失败:', error);
      throw error;
    }
  }

  // 获取用户的聊天列表
  async getUserChats(userId) {
    try {
      console.log('获取用户聊天列表:', userId);
      
      const response = await apiConfig.get(`/chats/user/${userId}`);
      
      console.log('聊天列表API响应:', response);
      
      if (response.success) {
        const chats = response.data.chats || [];
        
        // 更新未读数缓存
        chats.forEach(chat => {
          this.unreadCounts.set(chat.id, chat.unreadCount || 0);
        });
        
        return chats;
      }
      
      return [];
    } catch (error) {
      console.error('获取聊天列表失败:', error);
      return [];
    }
  }

  // 获取聊天历史消息
  async getChatMessages(chatId, page = 1, limit = 20) {
    try {
      console.log('获取聊天消息:', { chatId, page, limit });
      
      const response = await apiConfig.get(`/chats/${chatId}/messages`, {
        page,
        limit
      });
      
      console.log('消息API响应:', response);
      
      if (response.success) {
        const result = {
          messages: response.data.messages || [],
          hasMore: response.data.hasMore || false,
          total: response.data.total || 0
        };
        
        // 缓存消息
        this.messageCache.set(chatId, result.messages);
        
        return result;
      }
      
      return { messages: [], hasMore: false, total: 0 };
    } catch (error) {
      console.error('获取聊天历史失败:', error);
      return { messages: [], hasMore: false, total: 0 };
    }
  }

  // ===================
  // 消息发送方法
  // ===================

  // 发送消息（智能路由：WebSocket优先，API降级）
  async sendMessage(chatId, receiverId, messageData) {
    console.log('发送消息:', { chatId, receiverId, messageData });
    
    const currentUser = userManager.getCurrentUser();
    if (!currentUser) {
      throw new Error('用户未登录');
    }
    
    // 🔧 检查用户是否切换
    if (this.checkUserSwitch()) {
      console.error('检测到用户切换，请重新启动聊天会话');
      throw new Error('用户身份已变更，请刷新页面');
    }

    try {
      // 检查WebSocket状态和认证
      const wsStatus = webSocketManager.getStatus();
      if (webSocketManager.isConnected && wsStatus.authenticatedUserId === currentUser.id) {
        console.log('通过WebSocket发送消息');
        webSocketManager.sendChatMessage(chatId, receiverId, messageData);
        return { success: true, method: 'websocket' };
      } else {
        console.log('WebSocket不可用或认证不匹配，使用API发送消息');
        const response = await apiConfig.post('/chats/messages', {
          chat_id: chatId,
          receiver_id: receiverId,
          type: messageData.type,
          content: messageData.content,
          image_url: messageData.imageUrl,
          item_data: messageData.itemData
        });
        
        return { ...response, method: 'api' };
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      throw error;
    }
  }


  // 通过API发送消息
  async sendMessageViaAPI(chatId, receiverId, messageData) {
    try {
      const response = await apiConfig.post('/chats/messages', {
        chat_id: chatId,
        receiver_id: receiverId,
        type: messageData.type || 'text',
        content: messageData.content || '',
        image_url: messageData.imageUrl || null,
        item_data: messageData.itemData || null
      });

      console.log('发送消息API响应:', response);

      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.message || '发送失败');
      }
    } catch (error) {
      console.error('发送消息API失败:', error);
      throw error;
    }
  }

  // 发送图片消息
  async sendImageMessage(chatId, receiverId, imagePath) {
    try {
      console.log('开始发送图片消息:', { chatId, receiverId, imagePath });
      
      // 1. 先上传图片
      console.log('上传图片:', imagePath);
      wx.showLoading({ title: '上传图片中...' });
      
      const imageUrl = await apiConfig.uploadFile('/upload/single', imagePath, 'image');
      console.log('图片上传成功:', imageUrl);
      
      wx.hideLoading();
      wx.showLoading({ title: '发送中...' });

      // 2. 发送消息
      const messageData = {
        type: 'image',
        content: '[图片]',
        imageUrl: typeof imageUrl === 'string' ? imageUrl : imageUrl.url
      };

      const result = await this.sendMessage(chatId, receiverId, messageData);
      wx.hideLoading();
      
      return result;
    } catch (error) {
      wx.hideLoading();
      console.error('发送图片消息失败:', error);
      throw error;
    }
  }

  // 标记消息为已读
  async markAsRead(chatId) {
    try {
      // 优先使用WebSocket
      if (this.webSocketConnected && webSocketManager.isConnected) {
        webSocketManager.markMessagesRead(chatId);
      }
      
      // 同时调用API确保数据一致性
      await apiConfig.put(`/chats/${chatId}/read`);
      
      // 更新本地未读数
      this.unreadCounts.set(chatId, 0);
      
    } catch (error) {
      console.error('标记已读失败:', error);
    }
  }

  // ===================
  // 输入状态管理
  // ===================

  // 开始输入
  startTyping(chatId) {
    if (this.webSocketConnected && webSocketManager.isConnected) {
      webSocketManager.startTyping(chatId);
    }
  }

  // 停止输入
  stopTyping(chatId) {
    if (this.webSocketConnected && webSocketManager.isConnected) {
      webSocketManager.stopTyping(chatId);
    }
  }

  // ===================
  // 消息处理方法
  // ===================

  // 处理新消息
  handleNewMessage(messageData) {
    const chatId = messageData.chatId || messageData.chat_id;
    
    // 更新消息缓存
    if (this.messageCache.has(chatId)) {
      const messages = this.messageCache.get(chatId);
      messages.push(messageData);
      this.messageCache.set(chatId, messages);
    }
    
    // 如果不是当前聊天，更新未读数
    if (chatId !== this.currentChatId) {
      const currentCount = this.unreadCounts.get(chatId) || 0;
      this.unreadCounts.set(chatId, currentCount + 1);
    }
    
    // 🔧 修复：直接调用消息回调
    if (this.messageCallback && typeof this.messageCallback === 'function') {
      console.log('调用消息回调函数');
      try {
        this.messageCallback(messageData);
      } catch (error) {
        console.error('消息回调执行失败:', error);
      }
    } else {
      console.warn('消息回调函数不存在:', this.messageCallback);
    }
    
    // 通知页面
    this.emit('new_message', messageData);
  }

  // 处理消息通知
  handleMessageNotification(notification) {
    // 显示系统通知
    if (notification.chatId !== this.currentChatId) {
      wx.showToast({
        title: `${notification.senderName}: ${notification.content}`,
        icon: 'none',
        duration: 2000
      });
    }
    
    this.emit('message_notification', notification);
  }

  // 处理消息已读状态
  handleMessagesRead(data) {
    // 更新消息状态等
    this.emit('messages_read', data);
  }

  // ===================
  // 轮询降级方案
  // ===================

  // 开始轮询（降级方案）
  startPolling(chatId, callback) {
    if (this.webSocketConnected) {
      console.log('WebSocket已连接，跳过轮询');
      return;
    }

    console.log('开始轮询新消息（降级模式）:', chatId);
    
    this.currentChatId = chatId;
    this.isPolling = true;
    this.lastMessageTime = null;
    
    if (callback) {
      this.setMessageCallback(callback);
    }
    
    // 立即检查一次
    this.checkNewMessages();
    
    // 定时轮询
    this.pollingInterval = setInterval(() => {
      if (!this.webSocketConnected) {
        this.checkNewMessages();
      } else {
        // WebSocket已连接，停止轮询
        this.stopPolling();
      }
    }, this.POLLING_INTERVAL);
  }

  // 停止轮询
  stopPolling() {
    console.log('停止轮询消息');
    
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isPolling = false;
    this.lastMessageTime = null;
  }

  // 检查新消息（轮询用）
  async checkNewMessages() {
    if (!this.isPolling || this.webSocketConnected) {
      return;
    }

    const token = wx.getStorageSync('userToken');
    if (!token) {
      console.log('没有有效token，停止轮询');
      this.stopPolling();
      return;
    }

    if (!this.currentChatId) {
      console.log('没有当前聊天ID，跳过检查');
      return;
    }

    try {
      const params = { limit: 10 };
      
      if (this.lastMessageTime) {
        params.since = this.lastMessageTime;
      }

      console.log('轮询检查新消息:', { chatId: this.currentChatId, params });

      const response = await apiConfig.get(`/chats/${this.currentChatId}/messages`, params);

      if (response.success && response.data.messages.length > 0) {
        console.log('轮询发现新消息:', response.data.messages.length);
        
        this.lastMessageTime = new Date().toISOString();
        
        // 处理新消息
        response.data.messages.forEach(message => {
          this.handleNewMessage(message);
        });
      }

    } catch (error) {
      console.error('轮询检查新消息失败:', error);

      if (error.message && (
        error.message.includes('无权访问') || 
        error.message.includes('登录已过期') ||
        error.message.includes('Forbidden') ||
        error.message.includes('Unauthorized')
      )) {
        console.log('检测到权限错误，停止轮询:', error.message);
        this.stopPolling();
        return;
      }
    }
  }

  // ===================
  // 事件系统
  // ===================

  setMessageCallback(callback) {
    this.on('new_message', callback);
  }

  on(event, handler) {
    if (!this.messageHandlers.has(event)) {
      this.messageHandlers.set(event, []);
    }
    this.messageHandlers.get(event).push(handler);
  }

  off(event, handler) {
    const handlers = this.messageHandlers.get(event) || [];
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  }

  emit(event, data) {
    const handlers = this.messageHandlers.get(event) || [];
    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error('事件处理器执行失败:', error);
      }
    });
  }

  // ===================
  // 工具方法
  // ===================

  // 获取连接状态
  getConnectionStatus() {
    const wsStatus = webSocketManager.getStatus();
    const currentUser = userManager.getCurrentUser();
    
    return {
      currentChatId: this.currentChatId,
      currentUserId: this.currentUserId,
      actualUserId: currentUser?.id,
      userMatches: this.currentUserId === currentUser?.id,
      webSocket: {
        connected: wsStatus.isConnected,
        authenticatedUserId: wsStatus.authenticatedUserId,
        authMatches: wsStatus.authenticatedUserId === currentUser?.id
      },
      polling: {
        active: !!this.pollingTimer
      }
    };
  }

  // 获取未读消息总数
  getTotalUnreadCount() {
    return Array.from(this.unreadCounts.values()).reduce((sum, count) => sum + count, 0);
  }

  // 清理资源
  cleanup() {
    console.log('清理聊天管理器');
    
    this.stopChatSession();
    webSocketManager.disconnect();
    
    this.messageCache.clear();
    this.unreadCounts.clear();
    this.messageHandlers.clear();
  }

  // 删除聊天
  async deleteChat(chatId) {
    try {
      const response = await apiConfig.delete(`/chats/${chatId}`);
      
      if (response.success) {
        // 清理本地缓存
        this.messageCache.delete(chatId);
        this.unreadCounts.delete(chatId);
        
        return true;
      } else {
        throw new Error(response.message || '删除失败');
      }
    } catch (error) {
      console.error('删除聊天失败:', error);
      throw error;
    }
  }
}

// 创建单例
const chatManager = new ChatManager();

module.exports = chatManager;