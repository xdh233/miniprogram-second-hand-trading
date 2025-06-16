class ChatManager {
  constructor() {
    this.MESSAGES_KEY = 'chat_messages'
    this.CHATS_KEY = 'user_chats'
  }

  // 获取聊天消息
  async getMessages(targetUserId, page = 1, pageSize = 20) {
    return new Promise((resolve) => {
      // 从本地存储获取消息
      const allMessages = wx.getStorageSync(this.MESSAGES_KEY) || {}
      const chatKey = this.getChatKey(targetUserId)
      const messages = allMessages[chatKey] || []
      
      // 按时间倒序排序
      messages.sort((a, b) => new Date(b.createTime) - new Date(a.createTime))
      
      // 分页处理
      const start = (page - 1) * pageSize
      const end = start + pageSize
      const pagedMessages = messages.slice(start, end)

      // 模拟网络延迟
      setTimeout(() => {
        resolve(pagedMessages)
      }, 300)
    })
  }

  // 发送消息
  async sendMessage(targetUserId, message) {
    return new Promise((resolve, reject) => {
      try {
        // 获取现有消息
        const allMessages = wx.getStorageSync(this.MESSAGES_KEY) || {}
        const chatKey = this.getChatKey(targetUserId)
        const messages = allMessages[chatKey] || []

        // 添加新消息
        messages.push(message)
        allMessages[chatKey] = messages

        // 更新存储
        wx.setStorageSync(this.MESSAGES_KEY, allMessages)
        
        // 更新会话列表
        this.updateChatList(targetUserId, message)
        
        resolve(message)
      } catch (error) {
        reject(error)
      }
    })
  }

  // 上传图片
  async uploadImage(tempFilePath) {
    return new Promise((resolve) => {
      // 模拟上传过程
      setTimeout(() => {
        // 实际项目中这里应该调用上传API
        resolve(tempFilePath)
      }, 1000)
    })
  }

  // 更新会话列表
  async updateChatList(targetUserId, lastMessage) {
    const userManager = require('./userManager')
    const targetUser = await userManager.getUserInfo(targetUserId)
    const currentUser = userManager.getCurrentUser()

    const chats = wx.getStorageSync(this.CHATS_KEY) || {}
    const chatKey = this.getChatKey(targetUserId)

    chats[chatKey] = {
      userId: targetUserId,
      userName: targetUser.name,
      userAvatar: targetUser.avatar,
      lastMessage: {
        content: this.getMessagePreview(lastMessage),
        time: lastMessage.createTime
      },
      unread: 0, // 可以在这里处理未读消息
      updateTime: new Date().toISOString()
    }

    wx.setStorageSync(this.CHATS_KEY, chats)
  }

  // 获取消息预览
  getMessagePreview(message) {
    switch (message.type) {
      case 'text':
        return message.content
      case 'image':
        return '[图片]'
      case 'item':
        return '[商品]'
      default:
        return '[暂不支持的消息类型]'
    }
  }

  // 获取会话列表
  async getChatList() {
    const chats = wx.getStorageSync(this.CHATS_KEY) || {}
    return Object.values(chats).sort((a, b) => 
      new Date(b.updateTime) - new Date(a.updateTime)
    )
  }

  // 生成聊天Key
  getChatKey(targetUserId) {
    const currentUser = require('./userManager').getCurrentUser()
    const userIds = [currentUser.id, targetUserId].sort()
    return userIds.join('_')
  }
}

module.exports = new ChatManager()