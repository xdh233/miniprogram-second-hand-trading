// utils/webSocketManager.js - 完整修复版本
const userManager = require('./userManager');

class WebSocketManager {
  constructor() {
    this.socketTask = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.maxReconnectDelay = 30000;
    this.heartbeatInterval = 30000;
    
    // 🔥 修复：小程序生命周期状态管理
    this.appHidden = false; // 默认前台
    this.lastAppShowTime = Date.now(); // 初始化为当前时间
    this.lastAppHideTime = null;
    this.shouldReconnectOnShow = false;
    this.stateCheckEnabled = true; // 是否启用状态检查
    
    // 事件监听器
    this.eventListeners = new Map();
    
    // 当前聊天状态
    this.currentChatId = null;
    this.isInChat = false;
    
    // WebSocket服务器地址
    this.serverUrl = 'ws://49.234.193.54:3000';
    
    // 消息队列
    this.messageQueue = [];
    
    console.log('WebSocket管理器初始化完成，appHidden:', this.appHidden);
  }

  // 🔥 智能状态检查 - 判断小程序是否真的在后台
  isAppActuallyHidden() {
    // 如果从未收到过隐藏事件，认为是前台
    if (!this.lastAppHideTime) {
      return false;
    }
    
    // 如果显示时间比隐藏时间新，认为是前台
    if (this.lastAppShowTime && this.lastAppShowTime > this.lastAppHideTime) {
      return false;
    }
    
    // 检查是否超过一定时间没有操作
    const now = Date.now();
    const hideTime = this.lastAppHideTime || 0;
    const timeSinceHide = now - hideTime;
    
    // 如果隐藏时间超过10分钟，可能是真的在后台
    if (timeSinceHide > 10 * 60 * 1000) {
      return true;
    }
    
    // 其他情况保守认为是前台
    return false;
  }

  // 🔥 处理小程序显示
  handleAppShow() {
    console.log('WebSocket管理器：处理小程序显示');
    this.appHidden = false;
    this.lastAppShowTime = Date.now();
    
    console.log('小程序状态已更新:', {
      appHidden: this.appHidden,
      lastAppShowTime: this.lastAppShowTime,
      lastAppHideTime: this.lastAppHideTime
    });
    
    // 如果标记需要重连，或者连接已断开，尝试重连
    if (this.shouldReconnectOnShow || !this.isConnected) {
      console.log('小程序显示时需要重连WebSocket');
      this.shouldReconnectOnShow = false;
      
      setTimeout(() => {
        if (!this.appHidden && userManager.isLoggedIn()) {
          this.reconnectAfterAppShow();
        }
      }, 1000);
    } else if (this.isConnected) {
      console.log('WebSocket已连接，检查认证状态');
      this.checkAndReauthenticate();
    }
    
    // 恢复心跳
    if (this.isConnected && !this.heartbeatTimer) {
      console.log('恢复WebSocket心跳');
      this.startHeartbeat();
    }
  }

  // 🔥 处理小程序隐藏
  handleAppHide() {
    console.log('WebSocket管理器：处理小程序隐藏');
    this.appHidden = true;
    this.lastAppHideTime = Date.now();
    
    console.log('小程序状态已更新:', {
      appHidden: this.appHidden,
      lastAppShowTime: this.lastAppShowTime,
      lastAppHideTime: this.lastAppHideTime
    });
    
    // 停止心跳，但保持连接
    this.stopHeartbeat();
    
    // 清除重连定时器，避免后台重连
    if (this.reconnectTimer) {
      console.log('清除后台重连定时器');
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    // 标记可能需要在显示时重连
    if (this.isConnected) {
      this.shouldReconnectOnShow = false;
    } else {
      this.shouldReconnectOnShow = true;
    }
  }

  // 🔥 强制设置前台状态
  forceSetAppVisible() {
    console.log('强制设置小程序为前台状态');
    this.appHidden = false;
    this.lastAppShowTime = Date.now();
    this.shouldReconnectOnShow = false;
  }

  // 🔥 设置状态检查开关
  setStateCheckEnabled(enabled) {
    this.stateCheckEnabled = enabled;
    console.log('状态检查已', enabled ? '启用' : '禁用');
  }

  // 小程序显示后的重连逻辑
  async reconnectAfterAppShow() {
    try {
      console.log('小程序显示后执行重连');
      
      if (this.isConnected || this.isConnecting) {
        console.log('断开现有连接');
        this.disconnect();
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      if (!userManager.isLoggedIn()) {
        console.log('用户未登录，跳过重连');
        return;
      }
      
      const networkStatus = await this.checkNetworkStatus();
      if (!networkStatus.isConnected) {
        console.log('网络未连接，跳过重连');
        setTimeout(() => {
          if (!this.appHidden) {
            this.reconnectAfterAppShow();
          }
        }, 3000);
        return;
      }
      
      console.log('开始重新连接WebSocket');
      await this.connect();
      console.log('小程序显示后重连成功');
      
    } catch (error) {
      console.error('小程序显示后重连失败:', error);
      
      if (!this.appHidden) {
        setTimeout(() => {
          this.reconnectAfterAppShow();
        }, 5000);
      }
    }
  }

  // 检查网络状态
  checkNetworkStatus() {
    return new Promise((resolve) => {
      wx.getNetworkType({
        success: (res) => {
          resolve({
            networkType: res.networkType,
            isConnected: res.networkType !== 'none'
          });
        },
        fail: () => {
          resolve({
            networkType: 'unknown',
            isConnected: false
          });
        }
      });
    });
  }

  // 检查并重新认证
  async checkAndReauthenticate() {
    try {
      const currentUser = userManager.getCurrentUser();
      
      if (!currentUser) {
        console.log('用户未登录，断开WebSocket');
        this.disconnect();
        return;
      }

      if (this.authenticatedUserId !== currentUser.id) {
        console.log('认证用户不匹配，重新认证', {
          authenticated: this.authenticatedUserId,
          current: currentUser.id
        });
        
        const token = wx.getStorageSync('userToken');
        if (token) {
          this.authenticate(token);
        } else {
          console.error('没有有效token，断开连接');
          this.disconnect();
        }
      } else {
        console.log('认证状态正常');
      }
      
    } catch (error) {
      console.error('检查认证状态失败:', error);
    }
  }

  // 检查认证状态
  checkAuthStatus() {
    const currentUser = userManager.getCurrentUser();
    const currentToken = wx.getStorageSync('userToken');
    
    if (!currentUser || !currentToken) {
      console.log('用户未登录，WebSocket应断开');
      return false;
    }
    
    if (this.isConnected && this.authenticatedUserId && this.authenticatedUserId !== currentUser.id) {
      console.log(`WebSocket认证用户(${this.authenticatedUserId})与当前用户(${currentUser.id})不匹配，需要重连`);
      return false;
    }
    
    return true;
  }

  // 🔌 连接WebSocket
  connect() {
    if (this.appHidden) {
      console.log('小程序在后台，跳过WebSocket连接');
      this.shouldReconnectOnShow = true;
      return Promise.reject(new Error('小程序在后台'));
    }

    if (this.isConnected || this.isConnecting) {
      if (!this.checkAuthStatus()) {
        console.log('认证状态不匹配，强制重连...');
        this.disconnect();
      } else {
        console.log('WebSocket已连接且认证状态匹配');
        return Promise.resolve();
      }
    }

    return new Promise((resolve, reject) => {
      if (!userManager.isLoggedIn()) {
        console.log('用户未登录，跳过WebSocket连接');
        reject(new Error('用户未登录'));
        return;
      }

      const token = wx.getStorageSync('userToken');
      if (!token) {
        console.log('没有有效token，无法连接WebSocket');
        reject(new Error('没有有效token'));
        return;
      }

      const currentUser = userManager.getCurrentUser();
      console.log(`开始WebSocket连接，用户ID: ${currentUser.id}`);

      this.isConnecting = true;
      console.log('开始连接WebSocket...', this.serverUrl);

      try {
        this.socketTask = wx.connectSocket({
          url: `${this.serverUrl}?token=${token}`,
          success: (res) => {
            console.log('WebSocket连接请求成功:', res);
          },
          fail: (error) => {
            console.error('WebSocket连接请求失败:', error);
            this.handleConnectError(error);
            reject(error);
          }
        });

        // 连接打开
        this.socketTask.onOpen((res) => {
          console.log('✅ WebSocket连接成功:', res);
          this.isConnected = true;
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.shouldReconnectOnShow = false;
          
          this.authenticatedUserId = currentUser.id;
          console.log(`WebSocket已认证用户ID: ${this.authenticatedUserId}`);
          
          if (!this.appHidden) {
            this.startHeartbeat();
          }
          
          this.processMessageQueue();
          this.emit('connected');
          resolve();
        });

        // 接收消息
        this.socketTask.onMessage((res) => {
          try {
            const data = JSON.parse(res.data);
            this.handleMessage(data);
          } catch (error) {
            console.error('解析WebSocket消息失败:', error, res.data);
          }
        });

        // 连接错误
        this.socketTask.onError((error) => {
          console.error('WebSocket连接错误:', error);
          this.handleConnectError(error);
          reject(error);
        });

        // 连接关闭
        this.socketTask.onClose((res) => {
          console.log('WebSocket连接已关闭:', res);
          this.handleDisconnect(res);
        });

      } catch (error) {
        console.error('创建WebSocket连接失败:', error);
        this.handleConnectError(error);
        reject(error);
      }
    });
  }

  // 认证
  authenticate(token) {
    const userInfo = userManager.getCurrentUser();
    
    this.send('auth', {
      token: token,
      userInfo: userInfo
    });
    
    console.log('WebSocket认证信息已发送');
  }

  // 心跳检测
  startHeartbeat() {
    this.stopHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected && !this.appHidden) {
        this.send('ping', { timestamp: Date.now() });
      }
    }, this.heartbeatInterval);
    
    console.log('WebSocket心跳已启动');
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
      console.log('WebSocket心跳已停止');
    }
  }

  // 发送消息
  send(event, data = {}) {
    if (!this.isConnected || !this.socketTask) {
      console.log('WebSocket未连接，消息已加入队列:', event);
      this.messageQueue.push({ event, data, timestamp: Date.now() });
      return false;
    }

    try {
      const message = JSON.stringify({
        event: event,
        data: data,
        timestamp: Date.now()
      });
      
      this.socketTask.send({
        data: message,
        success: () => {
          console.log('WebSocket消息发送成功:', event);
        },
        fail: (error) => {
          console.error('WebSocket消息发送失败:', error);
          this.messageQueue.push({ event, data, timestamp: Date.now() });
        }
      });
      
      return true;
    } catch (error) {
      console.error('WebSocket发送消息异常:', error);
      return false;
    }
  }

  // 处理接收到的消息
  handleMessage(message) {
    const { event, data } = message;
    
    console.log('收到WebSocket消息:', event, data);
    
    switch (event) {
      case 'authenticated':
        console.log('WebSocket认证成功');
        this.emit('authenticated', data);
        break;
        
      case 'new_message':
        console.log('收到新消息:', data);
        this.emit('new_message', data);
        break;
        
      case 'message_notification':
        console.log('收到消息通知:', data);
        this.emit('message_notification', data);
        break;
        
      case 'messages_read':
        console.log('消息已读通知:', data);
        this.emit('messages_read', data);
        break;
        
      case 'user_typing':
        this.emit('user_typing', data);
        break;
        
      case 'user_online':
        this.emit('user_online', data);
        break;
        
      case 'user_offline':
        this.emit('user_offline', data);
        break;
        
      case 'user_joined_chat':
        this.emit('user_joined_chat', data);
        break;
        
      case 'user_left_chat':
        this.emit('user_left_chat', data);
        break;
        
      case 'pong':
        // 心跳回复
        break;
        
      default:
        console.log('未知WebSocket事件:', event, data);
        this.emit(event, data);
    }
  }

  // 聊天房间管理
  joinChat(chatId) {
    console.log('加入聊天房间:', chatId);
    
    this.currentChatId = chatId;
    this.isInChat = true;
    
    this.send('join_chat', { chatId });
  }

  leaveChat() {
    if (this.currentChatId) {
      console.log('离开聊天房间:', this.currentChatId);
      
      this.send('leave_chat', { chatId: this.currentChatId });
      
      this.currentChatId = null;
      this.isInChat = false;
    }
  }

  // 🔥 修复：发送聊天消息（智能状态检查）
  sendChatMessage(chatId, receiverId, messageData) {
    console.log('=== sendChatMessage 调试信息 ===');
    console.log('appHidden状态:', this.appHidden);
    console.log('智能检查结果:', this.isAppActuallyHidden());
    console.log('状态检查启用:', this.stateCheckEnabled);
    console.log('时间信息:', {
      lastAppShowTime: this.lastAppShowTime,
      lastAppHideTime: this.lastAppHideTime,
      now: Date.now()
    });
    
    // 🔥 使用智能状态检查，而不是简单的 appHidden
    if (this.stateCheckEnabled && this.isAppActuallyHidden()) {
      console.warn('智能检查认为小程序在后台，但允许发送');
      // 不抛出错误，只是警告
    }
    
    // 发送前检查认证状态
    if (!this.checkAuthStatus()) {
      console.error('WebSocket认证状态异常，无法发送消息');
      throw new Error('WebSocket认证状态异常');
    }
    
    console.log('通过WebSocket发送聊天消息:', chatId);
    
    const success = this.send('send_message', {
      chatId,
      receiverId,
      type: messageData.type || 'text',
      content: messageData.content || '',
      imageUrl: messageData.imageUrl || null,
      itemData: messageData.itemData || null
    });

    if (!success) {
      throw new Error('WebSocket消息发送失败');
    }
  }

  // 标记消息已读
  markMessagesRead(chatId, messageIds = []) {
    this.send('mark_read', {
      chatId,
      messageIds
    });
  }

  // 输入状态
  startTyping(chatId) {
    this.send('typing_start', { chatId });
  }

  stopTyping(chatId) {
    this.send('typing_stop', { chatId });
  }

  // 重连逻辑
  reconnect() {
    if (this.isAppActuallyHidden()) {
      console.log('智能检查认为小程序在后台，标记需要在显示时重连');
      this.shouldReconnectOnShow = true;
      return;
    }

    if (this.isConnecting || this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log(`重连已达到最大次数(${this.maxReconnectAttempts})或正在连接中`);
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), this.maxReconnectDelay);
    
    console.log(`WebSocket重连尝试 ${this.reconnectAttempts}/${this.maxReconnectAttempts}，${delay}ms后开始`);
    
    this.reconnectTimer = setTimeout(() => {
      if (!this.isAppActuallyHidden()) {
        this.connect();
      } else {
        console.log('重连期间检测到小程序在后台，取消重连');
      }
    }, delay);
  }

  // 断开连接
  disconnect() {
    console.log('主动断开WebSocket连接');
    
    this.stopHeartbeat();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.socketTask) {
      this.socketTask.close({
        code: 1000,
        reason: '主动断开',
        success: () => {
          console.log('WebSocket关闭成功');
        },
        fail: (error) => {
          console.error('WebSocket关闭失败:', error);
        }
      });
    }
    
    this.isConnected = false;
    this.isConnecting = false;
    this.currentChatId = null;
    this.isInChat = false;
    this.reconnectAttempts = 0;
    this.socketTask = null;
    this.shouldReconnectOnShow = false;
    
    this.authenticatedUserId = null;
    console.log('WebSocket认证状态已清除');
    
    this.emit('disconnected');
  }

  // 处理连接错误
  handleConnectError(error) {
    this.isConnecting = false;
    this.isConnected = false;
    
    console.error('WebSocket连接失败:', error);
    
    this.emit('connect_error', error);
    
    if (this.isAppActuallyHidden()) {
      this.shouldReconnectOnShow = true;
      return;
    }
    
    if (error.errMsg) {
      if (error.errMsg.includes('未完成的操作') || 
          error.errMsg.includes('网络') || 
          error.errMsg.includes('timeout') ||
          error.errMsg.includes('fail')) {
        console.log('网络问题，尝试重连');
        if (userManager.isLoggedIn()) {
          this.reconnect();
        }
        return;
      }
    }
    
    if (userManager.isLoggedIn()) {
      this.reconnect();
    }
  }

  // 处理断开连接
  handleDisconnect(reason) {
    this.isConnected = false;
    this.isConnecting = false;
    
    this.stopHeartbeat();
    
    console.log('WebSocket连接已断开:', reason);
    
    this.emit('disconnected', reason);
    
    if (this.isAppActuallyHidden()) {
      this.shouldReconnectOnShow = true;
      return;
    }
    
    if (userManager.isLoggedIn() && reason.code !== 1000) {
      this.reconnect();
    }
  }

  // 处理离线消息队列
  processMessageQueue() {
    if (this.messageQueue.length === 0) return;
    
    console.log(`处理 ${this.messageQueue.length} 条离线消息`);
    
    const messages = [...this.messageQueue];
    this.messageQueue = [];
    
    messages.forEach(({ event, data }) => {
      this.send(event, data);
    });
  }

  // 事件系统
  on(event, handler) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(handler);
  }

  off(event, handler) {
    const handlers = this.eventListeners.get(event) || [];
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  }

  emit(event, data) {
    const handlers = this.eventListeners.get(event) || [];
    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error('WebSocket事件处理器执行失败:', error);
      }
    });
  }

  // 🔥 获取详细状态信息
  getStatus() {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      currentChatId: this.currentChatId,
      isInChat: this.isInChat,
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length,
      serverUrl: this.serverUrl,
      authenticatedUserId: this.authenticatedUserId,
      currentUserId: userManager.getCurrentUser()?.id,
      // 状态管理信息
      appHidden: this.appHidden,
      actuallyHidden: this.isAppActuallyHidden(),
      shouldReconnectOnShow: this.shouldReconnectOnShow,
      lastAppShowTime: this.lastAppShowTime,
      lastAppHideTime: this.lastAppHideTime,
      stateCheckEnabled: this.stateCheckEnabled
    };
  }
}

// 创建单例
const webSocketManager = new WebSocketManager();

module.exports = webSocketManager;