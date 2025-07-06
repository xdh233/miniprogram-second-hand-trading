// utils/webSocketManager.js - 微信小程序原生WebSocket版本
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
    
    // 事件监听器
    this.eventListeners = new Map();
    
    // 当前聊天状态
    this.currentChatId = null;
    this.isInChat = false;
    
    // 🔧 使用原生WebSocket协议
    this.serverUrl = 'ws://49.234.193.54:3000';
    
    // 消息队列
    this.messageQueue = [];
    
    console.log('微信小程序WebSocket管理器初始化完成');
  }
  checkAuthStatus() {
    const currentUser = userManager.getCurrentUser();
    const currentToken = wx.getStorageSync('userToken');
    
    if (!currentUser || !currentToken) {
      console.log('用户未登录，WebSocket应断开');
      return false;
    }
    
    // 检查WebSocket连接的用户ID是否与当前用户匹配
    if (this.isConnected && this.authenticatedUserId && this.authenticatedUserId !== currentUser.id) {
      console.log(`WebSocket认证用户(${this.authenticatedUserId})与当前用户(${currentUser.id})不匹配，需要重连`);
      return false;
    }
    
    return true;
  }
  // 🔌 连接WebSocket
  connect() {
    if (this.isConnected || this.isConnecting) {
      // 🔧 修复：检查认证状态是否匹配
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
          
          // 🔧 重要：记录认证的用户ID
          this.authenticatedUserId = currentUser.id;
          console.log(`WebSocket已认证用户ID: ${this.authenticatedUserId}`);
          
          this.startHeartbeat();
          this.processMessageQueue();
          this.emit('connected');
          resolve();
        });

        // 其他事件处理保持不变...
        this.socketTask.onMessage((res) => {
          try {
            const data = JSON.parse(res.data);
            this.handleMessage(data);
          } catch (error) {
            console.error('解析WebSocket消息失败:', error, res.data);
          }
        });

        this.socketTask.onError((error) => {
          console.error('WebSocket连接错误:', error);
          this.handleConnectError(error);
          reject(error);
        });

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

  // 🔐 认证
  authenticate(token) {
    const userInfo = userManager.getCurrentUser();
    
    this.send('auth', {
      token: token,
      userInfo: userInfo
    });
    
    console.log('WebSocket认证信息已发送');
  }

  // 💓 心跳检测
  startHeartbeat() {
    this.stopHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        this.send('ping', { timestamp: Date.now() });
      }
    }, this.heartbeatInterval);
    
    console.log('WebSocket心跳已启动');
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // 📤 发送消息
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

  // 📥 处理接收到的消息
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

  // 🏠 聊天房间管理
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

  // 💬 发送聊天消息
  sendChatMessage(chatId, receiverId, messageData) {
    // 🔧 发送前检查认证状态
    if (!this.checkAuthStatus()) {
      console.error('WebSocket认证状态异常，无法发送消息');
      // 尝试重连
      this.disconnect();
      setTimeout(() => {
        this.connect();
      }, 1000);
      return;
    }
    
    console.log('通过WebSocket发送聊天消息:', chatId);
    
    this.send('send_message', {
      chatId,
      receiverId,
      type: messageData.type || 'text',
      content: messageData.content || '',
      imageUrl: messageData.imageUrl || null,
      itemData: messageData.itemData || null
    });
  }

  // 👀 标记消息已读
  markMessagesRead(chatId, messageIds = []) {
    this.send('mark_read', {
      chatId,
      messageIds
    });
  }

  // 💭 输入状态
  startTyping(chatId) {
    this.send('typing_start', { chatId });
  }

  stopTyping(chatId) {
    this.send('typing_stop', { chatId });
  }

  // 🔄 重连逻辑
  reconnect() {
    if (this.isConnecting || this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log(`重连已达到最大次数(${this.maxReconnectAttempts})或正在连接中`);
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), this.maxReconnectDelay);
    
    console.log(`WebSocket重连尝试 ${this.reconnectAttempts}/${this.maxReconnectAttempts}，${delay}ms后开始`);
    
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  // 🚫 断开连接
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
    
    // 🔧 重要：清除认证状态
    this.authenticatedUserId = null;
    console.log('WebSocket认证状态已清除');
    
    this.emit('disconnected');
  }

  // 🔧 处理连接错误
  handleConnectError(error) {
    this.isConnecting = false;
    this.isConnected = false;
    
    console.error('WebSocket连接失败:', error);
    
    this.emit('connect_error', error);
    
    // 检查错误类型
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
    
    // 其他错误，尝试重连
    if (userManager.isLoggedIn()) {
      this.reconnect();
    }
  }

  // 🔧 处理断开连接
  handleDisconnect(reason) {
    this.isConnected = false;
    this.isConnecting = false;
    
    this.stopHeartbeat();
    
    console.log('WebSocket连接已断开:', reason);
    
    this.emit('disconnected', reason);
    
    // 自动重连（除非是主动断开）
    if (userManager.isLoggedIn() && reason.code !== 1000) {
      this.reconnect();
    }
  }

  // 📦 处理离线消息队列
  processMessageQueue() {
    if (this.messageQueue.length === 0) return;
    
    console.log(`处理 ${this.messageQueue.length} 条离线消息`);
    
    const messages = [...this.messageQueue];
    this.messageQueue = [];
    
    messages.forEach(({ event, data }) => {
      this.send(event, data);
    });
  }

  // 📢 事件系统
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

  // 🔍 状态检查
  getStatus() {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      currentChatId: this.currentChatId,
      isInChat: this.isInChat,
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length,
      serverUrl: this.serverUrl,
      authenticatedUserId: this.authenticatedUserId, // 🔧 新增
      currentUserId: userManager.getCurrentUser()?.id // 🔧 新增
    };
  }
}

// 创建单例
const webSocketManager = new WebSocketManager();

module.exports = webSocketManager;