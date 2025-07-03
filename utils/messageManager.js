// utils/messageManager.js - 消息管理工具类
const sharedTools = require('./sharedTools');

class MessageManager {
  constructor() {
    this.CHATS_KEY = 'campus_chats'; // 聊天列表
    this.MESSAGES_KEY = 'campus_messages'; // 所有消息
    this.UNREAD_KEY = 'unread_counts'; // 未读消息数
    this.init();
  }

  // 初始化
  init() {
    const chats = this.getAllChats();
    if (chats.length === 0) {
      this.createMockData();
    }
  }

  // 创建模拟数据
  createMockData() {
    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  
    const mockChats = [
      {
        id: this.generateId(),
        chatId: 'chat_1_2',
        userId: 2,
        userName: '四李',
        userAvatar: '/images/default-avatar.jpg',
        lastMessage: '这个台灯还在吗？我想要',
        lastMessageTime: thirtyMinutesAgo.toISOString(), 
        lastMessageType: 'text',
        unreadCount: 2,
        isOnline: true,
        isPinned: false,
        isMuted: false,
        relatedItem: {
          id: 3,
          title: '护眼台灯 全新未拆封',
          price: '80',
          image: '/images/lamp1.jpg'
        },
        status: 'selling',
        createdTime: twoHoursAgo.toISOString() 
      }
    ];
  
    const mockMessages = [
      {
        id: this.generateId(),
        chatId: 'chat_1_2',
        senderId: 2,
        receiverId: 1,
        type: 'text',
        content: '你好，请问这个台灯还在吗？',
        timestamp: oneHourAgo.toISOString(), // 正确 ✅
        status: 'read',
        isDeleted: false
      },
      {
        id: this.generateId(),
        chatId: 'chat_1_2',
        senderId: 2,
        receiverId: 1,
        type: 'text',
        content: '我想要这个台灯，可以当面交易吗？',
        timestamp: thirtyMinutesAgo.toISOString(), // 正确 ✅
        status: 'delivered',
        isDeleted: false
      }
    ];
  
    wx.setStorageSync(this.CHATS_KEY, mockChats);
    wx.setStorageSync(this.MESSAGES_KEY, mockMessages);
    console.log('初始化消息模拟数据');
  }

  // 生成唯一ID
  generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  // 生成聊天ID
  generateChatId(userId1, userId2) {
    const ids = [userId1, userId2].sort();
    return `chat_${ids[0]}_${ids[1]}`;
  }

  // 获取所有聊天
  getAllChats() {
    try {
      return wx.getStorageSync(this.CHATS_KEY) || [];
    } catch (error) {
      console.error('获取聊天列表失败:', error);
      return [];
    }
  }

  // 保存聊天列表
  saveChats(chats) {
    try {
      wx.setStorageSync(this.CHATS_KEY, chats);
      return true;
    } catch (error) {
      console.error('保存聊天列表失败:', error);
      return false;
    }
  }

  // 获取所有消息
  getAllMessages() {
    try {
      return wx.getStorageSync(this.MESSAGES_KEY) || [];
    } catch (error) {
      console.error('获取消息失败:', error);
      return [];
    }
  }

  // 保存消息
  saveMessages(messages) {
    try {
      wx.setStorageSync(this.MESSAGES_KEY, messages);
      return true;
    } catch (error) {
      console.error('保存消息失败:', error);
      return false;
    }
  }

  // 获取用户的聊天列表
  getUserChats(userId) {
    const chats = this.getAllChats();
    return chats
      .filter(chat => chat.chatId.includes(`_${userId}_`) || chat.chatId.includes(`_${userId}`))
      .sort((a, b) => {
        // 置顶的聊天排在前面
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        
        // 按最后消息时间排序
        return new Date(b.lastMessageTime) - new Date(a.lastMessageTime);
      });
  }

  // 获取或创建聊天
  getOrCreateChat(currentUserId, otherUserId, otherUserInfo = {}, relatedItem = null) {
    const chatId = this.generateChatId(currentUserId, otherUserId);
    let chats = this.getAllChats();
    
    let chat = chats.find(c => c.chatId === chatId);
    
    if (!chat) {
      // 创建新聊天
      chat = {
        id: this.generateId(),
        chatId: chatId,
        userId: otherUserId,
        userName: otherUserInfo.nickname || otherUserInfo.name || '未知用户',
        userAvatar: otherUserInfo.avatar || '/images/default-avatar.png',
        lastMessage: '',
        lastMessageTime: new Date().toISOString(),
        lastMessageType: 'text',
        unreadCount: 0,
        isOnline: false,
        isPinned: false,
        isMuted: false,
        relatedItem: relatedItem,
        status: 'active',
        createdTime: new Date().toISOString()
      };
      
      chats.unshift(chat);
      this.saveChats(chats);
    }
    
    return chat;
  }

  // 获取聊天中的消息
  getChatMessages(chatId, page = 1, pageSize = 20) {
    const allMessages = this.getAllMessages();
    const chatMessages = allMessages
      .filter(msg => msg.chatId === chatId && !msg.isDeleted)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // 分页
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    
    return {
      messages: chatMessages.slice(startIndex, endIndex),
      hasMore: endIndex < chatMessages.length,
      total: chatMessages.length
    };
  }

  // 发送消息
  sendMessage(senderId, receiverId, messageData) {
    return new Promise((resolve, reject) => {
      try {
        const chatId = this.generateChatId(senderId, receiverId);
        const messageId = this.generateId();
        
        const message = {
          id: messageId,
          chatId: chatId,
          senderId: senderId,
          receiverId: receiverId,
          type: messageData.type || 'text',
          content: messageData.content || '',
          imageUrl: messageData.imageUrl || '',
          itemData: messageData.itemData || null,
          timestamp: new Date().toISOString(),
          status: 'sent',
          isDeleted: false
        };

        // 保存消息
        const messages = this.getAllMessages();
        messages.push(message);
        this.saveMessages(messages);

        // 更新聊天列表
        this.updateChatLastMessage(chatId, message);
        
        // 增加未读计数
        this.incrementUnreadCount(chatId, receiverId);

        resolve({
          code: 200,
          message: '发送成功',
          data: message
        });

      } catch (error) {
        console.error('发送消息失败:', error);
        reject({ code: 500, message: '发送失败' });
      }
    });
  }

  // 更新聊天的最后一条消息
  updateChatLastMessage(chatId, message) {
    const chats = this.getAllChats();
    const chatIndex = chats.findIndex(chat => chat.chatId === chatId);
    
    if (chatIndex !== -1) {
      chats[chatIndex].lastMessage = this.getMessagePreview(message);
      chats[chatIndex].lastMessageTime = message.timestamp;
      chats[chatIndex].lastMessageType = message.type;
      
      // 将此聊天移到最前面
      const chat = chats.splice(chatIndex, 1)[0];
      chats.unshift(chat);
      
      this.saveChats(chats);
    }
  }

  // 获取消息预览文本
  getMessagePreview(message) {
    switch (message.type) {
      case 'text':
        return message.content;
      case 'image':
        return '[图片]';
      case 'item':
        return '[商品] ' + (message.itemData?.title || '商品信息');
      case 'system':
        return message.content;
      default:
        return '[消息]';
    }
  }

  // 增加未读计数
  incrementUnreadCount(chatId, userId) {
    const chats = this.getAllChats();
    const chatIndex = chats.findIndex(chat => chat.chatId === chatId);
    
    if (chatIndex !== -1) {
      // 只为接收者增加未读计数
      if (chats[chatIndex].userId === userId) {
        chats[chatIndex].unreadCount = (chats[chatIndex].unreadCount || 0) + 1;
        this.saveChats(chats);
      }
    }
  }

  // 标记消息为已读
  markMessagesAsRead(chatId, userId) {
    // 清除聊天的未读计数
    const chats = this.getAllChats();
    const chatIndex = chats.findIndex(chat => chat.chatId === chatId);
    
    if (chatIndex !== -1) {
      chats[chatIndex].unreadCount = 0;
      this.saveChats(chats);
    }

    // 更新消息状态
    const messages = this.getAllMessages();
    let updated = false;
    
    messages.forEach(msg => {
      if (msg.chatId === chatId && msg.receiverId === userId && msg.status !== 'read') {
        msg.status = 'read';
        updated = true;
      }
    });
    
    if (updated) {
      this.saveMessages(messages);
    }
  }

  // 删除聊天
  deleteChat(chatId, userId) {
    return new Promise((resolve, reject) => {
      try {
        // 删除聊天记录
        let chats = this.getAllChats();
        chats = chats.filter(chat => chat.chatId !== chatId);
        this.saveChats(chats);

        // 标记消息为已删除（软删除）
        const messages = this.getAllMessages();
        messages.forEach(msg => {
          if (msg.chatId === chatId) {
            msg.isDeleted = true;
          }
        });
        this.saveMessages(messages);

        resolve({ code: 200, message: '删除成功' });

      } catch (error) {
        console.error('删除聊天失败:', error);
        reject({ code: 500, message: '删除失败' });
      }
    });
  }

  // 删除单条消息
  deleteMessage(messageId, userId) {
    return new Promise((resolve, reject) => {
      try {
        const messages = this.getAllMessages();
        const messageIndex = messages.findIndex(msg => msg.id === messageId);
        
        if (messageIndex === -1) {
          reject({ code: 404, message: '消息不存在' });
          return;
        }

        const message = messages[messageIndex];
        
        // 只能删除自己发送的消息
        if (message.senderId !== userId) {
          reject({ code: 403, message: '只能删除自己的消息' });
          return;
        }

        // 软删除
        messages[messageIndex].isDeleted = true;
        this.saveMessages(messages);

        resolve({ code: 200, message: '删除成功' });

      } catch (error) {
        console.error('删除消息失败:', error);
        reject({ code: 500, message: '删除失败' });
      }
    });
  }

  // 搜索聊天和消息
  searchChatsAndMessages(userId, keyword) {
    if (!keyword || !keyword.trim()) {
      return this.getUserChats(userId);
    }

    const lowerKeyword = keyword.toLowerCase();
    const chats = this.getUserChats(userId);
    
    return chats.filter(chat => 
      chat.userName.toLowerCase().includes(lowerKeyword) ||
      chat.lastMessage.toLowerCase().includes(lowerKeyword)
    );
  }

  // 置顶/取消置顶聊天
  togglePinChat(chatId) {
    const chats = this.getAllChats();
    const chatIndex = chats.findIndex(chat => chat.chatId === chatId);
    
    if (chatIndex !== -1) {
      chats[chatIndex].isPinned = !chats[chatIndex].isPinned;
      this.saveChats(chats);
      return chats[chatIndex].isPinned;
    }
    
    return false;
  }

  // 设置/取消免打扰
  toggleMuteChat(chatId) {
    const chats = this.getAllChats();
    const chatIndex = chats.findIndex(chat => chat.chatId === chatId);
    
    if (chatIndex !== -1) {
      chats[chatIndex].isMuted = !chats[chatIndex].isMuted;
      this.saveChats(chats);
      return chats[chatIndex].isMuted;
    }
    
    return false;
  }

  // 获取未读消息总数
  getTotalUnreadCount(userId) {
    const chats = this.getUserChats(userId);
    return chats.reduce((total, chat) => total + (chat.unreadCount || 0), 0);
  }

  // 获取交易消息未读数
  getTradeUnreadCount(userId) {
    const chats = this.getUserChats(userId);
    return chats
      .filter(chat => chat.relatedItem)
      .reduce((total, chat) => total + (chat.unreadCount || 0), 0);
  }

  // 获取系统消息未读数
  getSystemUnreadCount(userId) {
    // 这里可以实现系统消息的逻辑
    return 0;
  }

  // 发送系统消息
  sendSystemMessage(userId, content) {
    const systemMessage = {
      id: this.generateId(),
      chatId: 'system_' + userId,
      senderId: 'system',
      receiverId: userId,
      type: 'system',
      content: content,
      timestamp: new Date().toISOString(),
      status: 'delivered',
      isDeleted: false
    };

    const messages = this.getAllMessages();
    messages.push(systemMessage);
    this.saveMessages(messages);

    return systemMessage;
  }

  // 批量标记为已读
  markAllAsRead(userId) {
    const chats = this.getAllChats();
    let updated = false;

    chats.forEach(chat => {
      if (chat.chatId.includes(`_${userId}`)) {
        chat.unreadCount = 0;
        updated = true;
      }
    });

    if (updated) {
      this.saveChats(chats);
    }

    // 更新消息状态
    const messages = this.getAllMessages();
    messages.forEach(msg => {
      if (msg.receiverId === userId && msg.status !== 'read') {
        msg.status = 'read';
      }
    });
    this.saveMessages(messages);
  }

  //查看两id间是否已存在聊天
  findExistingChat(userId1, userId2) {
    const chats = this.getAllChats(); 
    const chatId = this.generateChatId(userId1, userId2);

    return chats.find(chat => chat.chatId === chatId) || null;
  }

  //更新商品
  updateChatItem(chatId, newItem) {
    const chats = this.getAllChats();
    const chatIndex = chats.findIndex(chat => chat.chatId === chatId);
    
    if (chatIndex !== -1) {
      chats[chatIndex].relatedItem = newItem;
      this.saveChats(chats); // 使用现有的保存方法
      console.log('已更新商品卡片:', newItem); // 添加日志
      return true;
    }
      
    console.log('未找到聊天，无法更新商品卡片'); // 添加日志
    return false;
  }
  
  // 获取聊天统计信息
  getChatStats(userId) {
    const chats = this.getUserChats(userId);
    const messages = this.getAllMessages();
    
    const userMessages = messages.filter(msg => 
      msg.senderId === userId || msg.receiverId === userId
    );

    return {
      totalChats: chats.length,
      totalMessages: userMessages.length,
      unreadCount: this.getTotalUnreadCount(userId),
      tradeChats: chats.filter(chat => chat.relatedItem).length
    };
  }

  // 清除所有数据（调试用）
  debugClearAll() {
    try {
      wx.removeStorageSync(this.CHATS_KEY);
      wx.removeStorageSync(this.MESSAGES_KEY);
      wx.removeStorageSync(this.UNREAD_KEY);
      console.log('已清空所有消息数据');
      return true;
    } catch (error) {
      console.error('清空数据失败:', error);
      return false;
    }
  }

  // 导出聊天记录
  exportChatHistory(chatId) {
    const messages = this.getAllMessages();
    const chatMessages = messages
      .filter(msg => msg.chatId === chatId && !msg.isDeleted)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    return chatMessages.map(msg => ({
      时间: new Date(msg.timestamp).toLocaleString(),
      发送者: msg.senderId,
      类型: msg.type,
      内容: msg.content || '[非文本消息]'
    }));
  }
}

// 创建单例
const messageManager = new MessageManager();

module.exports = messageManager;