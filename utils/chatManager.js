// utils/chatManager.js - 轮询版聊天管理器
const apiConfig = require('./apiConfig');

class ChatManager {
  constructor() {
    this.pollingInterval = null;
    this.currentChatId = null;
    this.lastMessageTime = null;
    this.isPolling = false;
    this.messageHandlers = new Map();
    this.POLLING_INTERVAL = 3000; // 3秒轮询一次
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
        return response.data.chats || [];
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
        return {
          messages: response.data.messages || [],
          hasMore: response.data.hasMore || false,
          total: response.data.total || 0
        };
      }
      
      return { messages: [], hasMore: false, total: 0 };
    } catch (error) {
      console.error('获取聊天历史失败:', error);
      return { messages: [], hasMore: false, total: 0 };
    }
  }

  // ===================
  // 消息相关方法
  // ===================

  // 发送文本消息
  async sendMessage(chatId, receiverId, messageData) {
    try {
      console.log('发送消息:', { chatId, receiverId, messageData });
      
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
      console.error('发送消息失败:', error);
      throw error;
    }
  }

  // 发送图片消息 - 集成图片上传
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
      await apiConfig.put(`/chats/${chatId}/read`);
    } catch (error) {
      console.error('标记已读失败:', error);
    }
  }

  // 删除聊天
  async deleteChat(chatId) {
    try {
      const response = await apiConfig.delete(`/chats/${chatId}`);
      
      if (response.success) {
        return true;
      } else {
        throw new Error(response.message || '删除失败');
      }
    } catch (error) {
      console.error('删除聊天失败:', error);
      throw error;
    }
  }

  // ===================
  // 轮询相关方法
  // ===================

  // 开始轮询新消息
  startPolling(chatId, callback) {
    console.log('开始轮询新消息:', chatId);
    
    this.currentChatId = chatId;
    this.isPolling = true;
    this.lastMessageTime = null;
    
    // 立即检查一次
    this.checkNewMessages(callback);
    
    // 定时轮询
    this.pollingInterval = setInterval(() => {
      this.checkNewMessages(callback);
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
    this.currentChatId = null;
    this.lastMessageTime = null;
  }

  // 检查新消息
  async checkNewMessages() {
    // 🔧 如果轮询已停止，直接返回
    if (!this.isPolling) {
      console.log('轮询已停止，跳过检查新消息');
      return;
    }

    // 🔧 检查是否有有效token
    const token = wx.getStorageSync('userToken');
    if (!token) {
      console.log('没有有效token，停止轮询');
      this.stopPolling();
      return;
    }

    // 🔧 检查是否有当前聊天ID
    if (!this.currentChatId) {
      console.log('没有当前聊天ID，跳过检查');
      return;
    }

    try {
      const apiConfig = require('./apiConfig');
      
      // 构建查询参数
      const params = {
        limit: 10
      };
      
      if (this.lastCheckTime) {
        params.since = this.lastCheckTime;
      }

      console.log('检查新消息:', { chatId: this.currentChatId, params });

      // 请求新消息
      const response = await apiConfig.get(`/chats/${this.currentChatId}/messages`, params);

      if (response.success && response.data.messages.length > 0) {
        console.log('发现新消息:', response.data.messages.length);
        
        // 更新最后检查时间
        this.lastCheckTime = new Date().toISOString();
        
        // 通知页面有新消息
        if (typeof this.onNewMessage === 'function') {
          this.onNewMessage(response.data.messages);
        }
      }

    } catch (error) {
      console.error('检查新消息失败:', error);

      // 🔧 关键修复：处理特定错误类型
      if (error.message) {
        // 权限相关错误 - 停止轮询
        if (error.message.includes('无权访问') || 
            error.message.includes('登录已过期') ||
            error.message.includes('Forbidden') ||
            error.message.includes('Unauthorized')) {
          console.log('检测到权限错误，停止轮询:', error.message);
          this.stopPolling();
          
          // 清理本地存储
          wx.removeStorageSync('userToken');
          wx.removeStorageSync('currentUser');
          
          return;
        }
        
        // 网络错误 - 继续轮询，但记录错误
        if (error.message.includes('网络') || 
            error.message.includes('timeout') ||
            error.message.includes('请求失败')) {
          console.log('网络错误，继续轮询:', error.message);
          return;
        }
      }

      // 🔧 其他未知错误 - 停止轮询避免无限循环
      console.log('未知错误，停止轮询:', error);
      this.stopPolling();
    }
  }
  // 注册事件监听器
  on(event, handler) {
    if (!this.messageHandlers.has(event)) {
      this.messageHandlers.set(event, []);
    }
    this.messageHandlers.get(event).push(handler);
  }

  // 移除事件监听器
  off(event, handler) {
    const handlers = this.messageHandlers.get(event) || [];
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  }

  // 触发事件
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
}

// 创建单例
const chatManager = new ChatManager();

module.exports = chatManager;