const app = getApp()
const chatManager = require('../../utils/chatManager')
const userManager = require('../../utils/userManager')

Page({
  data: {
    messages: [],
    inputText: '',
    scrollTop: 0,
    scrollIntoView: '',
    loadingMore: false,
    showQuickActions: false,
    showItemModal: false,
    showImagePreview: false,
    previewImageUrl: '',
    recording: false,
    recordTime: 0,
    loading: true,
    currentUser: null,
    chatUser: null,
    relatedItem: null,
    myItems: [],
    currentPage: 1,
    pageSize: 20,
    hasMore: true
  },

  onLoad(options) {
    // 获取聊天对象ID和相关商品ID
    const { userId, itemId } = options
    
    if (!userId) {
      wx.showToast({
        title: '参数错误',
        icon: 'error'
      })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }

    this.setData({
      currentUser: userManager.getCurrentUser(),
      chatUserId: userId
    })

    // 加载聊天对象信息
    this.loadChatUserInfo(userId)
    
    // 如果有关联商品，加载商品信息
    if (itemId) {
      this.loadRelatedItem(itemId)
    }

    // 加载聊天记录
    this.loadMessages()
    
    // 加载我的商品列表（用于分享商品）
    this.loadMyItems()
  },

  async loadChatUserInfo(userId) {
    try {
      const userInfo = await userManager.getUserInfo(userId)
      this.setData({ chatUser: userInfo })
    } catch (error) {
      console.error('加载用户信息失败:', error)
    }
  },

  async loadRelatedItem(itemId) {
    try {
      const item = await itemManager.getItemDetail(itemId)
      this.setData({ relatedItem: item })
    } catch (error) {
      console.error('加载商品信息失败:', error)
    }
  },

  async loadMessages(refresh = false) {
    if (this.data.loadingMore && !refresh) return

    try {
      const { currentPage, pageSize, chatUserId } = this.data
      this.setData({ loadingMore: true })

      const messages = await chatManager.getMessages(chatUserId, currentPage, pageSize)
      
      // 处理消息时间显示
      const processedMessages = this.processMessages(messages)

      this.setData({
        messages: refresh ? processedMessages : [...processedMessages, ...this.data.messages],
        currentPage: this.data.currentPage + 1,
        hasMore: messages.length === pageSize,
        loadingMore: false,
        loading: false
      })

      if (refresh) {
        this.scrollToBottom()
      }
    } catch (error) {
      console.error('加载消息失败:', error)
      this.setData({ loadingMore: false, loading: false })
    }
  },

  // 处理消息，添加时间显示等
  processMessages(messages) {
    let lastTime = 0
    return messages.map(msg => {
      const currentTime = new Date(msg.createTime).getTime()
      const showTime = currentTime - lastTime > 5 * 60 * 1000 // 5分钟显示一次时间
      lastTime = currentTime
      return {
        ...msg,
        showTime,
        timeText: showTime ? this.formatMessageTime(currentTime) : ''
      }
    })
  },

  formatMessageTime(timestamp) {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date

    if (diff < 24 * 60 * 60 * 1000) {
      return date.toTimeString().slice(0, 5)
    } else if (diff < 48 * 60 * 60 * 1000) {
      return '昨天 ' + date.toTimeString().slice(0, 5)
    } else {
      return `${date.getMonth() + 1}月${date.getDate()}日`
    }
  },

  // 发送文本消息
  async sendTextMessage() {
    const content = this.data.inputText.trim()
    if (!content) return

    const message = {
      id: Date.now(),
      type: 'text',
      content,
      isSelf: true,
      status: 'sending',
      createTime: new Date().toISOString()
    }

    this.addMessage(message)
    this.setData({ inputText: '' })

    try {
      await chatManager.sendMessage(this.data.chatUserId, message)
      this.updateMessageStatus(message.id, 'sent')
    } catch (error) {
      console.error('发送消息失败:', error)
      this.updateMessageStatus(message.id, 'failed')
    }
  },

  // 发送图片消息
  async sendImageMessage() {
    try {
      const res = await wx.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })

      const tempFilePath = res.tempFilePaths[0]
      const message = {
        id: Date.now(),
        type: 'image',
        imageUrl: tempFilePath,
        isSelf: true,
        status: 'sending',
        createTime: new Date().toISOString()
      }

      this.addMessage(message)
      this.setData({ showQuickActions: false })

      // 上传图片
      const uploadedUrl = await chatManager.uploadImage(tempFilePath)
      message.imageUrl = uploadedUrl
      await chatManager.sendMessage(this.data.chatUserId, message)
      this.updateMessageStatus(message.id, 'sent')
    } catch (error) {
      console.error('发送图片失败:', error)
      if (message) {
        this.updateMessageStatus(message.id, 'failed')
      }
    }
  },

  // 添加消息到列表
  addMessage(message) {
    const messages = [...this.data.messages, message]
    this.setData({ messages })
    this.scrollToBottom()
  },

  // 更新消息状态
  updateMessageStatus(messageId, status) {
    const messages = this.data.messages.map(msg => {
      if (msg.id === messageId) {
        return { ...msg, status }
      }
      return msg
    })
    this.setData({ messages })
  },

  // 滚动到底部
  scrollToBottom() {
    this.setData({
      scrollIntoView: 'message_bottom'
    })
  },

  // 切换快捷操作面板
  toggleQuickActions() {
    this.setData({
      showQuickActions: !this.data.showQuickActions
    })
  },

  // 输入框内容变化
  onInputChange(e) {
    this.setData({
      inputText: e.detail.value
    })
  },

  // 加载更多消息
  loadMoreMessages() {
    if (this.data.hasMore && !this.data.loadingMore) {
      this.loadMessages()
    }
  },

  // 预览图片
  previewImage(e) {
    const { src } = e.currentTarget.dataset
    this.setData({
      showImagePreview: true,
      previewImageUrl: src
    })
  },

  // 隐藏图片预览
  hideImagePreview() {
    this.setData({
      showImagePreview: false,
      previewImageUrl: ''
    })
  },

  // 显示商品选择弹窗
  async shareItem() {
    this.setData({
      showItemModal: true,
      showQuickActions: false
    })
  },

  // 隐藏商品选择弹窗
  hideItemModal() {
    this.setData({
      showItemModal: false
    })
  },

  // 加载我的商品列表
  async loadMyItems() {
    try {
      const items = await itemManager.getMyItems()
      this.setData({ myItems: items })
    } catch (error) {
      console.error('加载商品列表失败:', error)
    }
  },

  // 选择并分享商品
  async selectItem(e) {
    const { item } = e.currentTarget.dataset
    const message = {
      id: Date.now(),
      type: 'item',
      itemData: item,
      isSelf: true,
      status: 'sending',
      createTime: new Date().toISOString()
    }

    this.addMessage(message)
    this.hideItemModal()

    try {
      await chatManager.sendMessage(this.data.chatUserId, message)
      this.updateMessageStatus(message.id, 'sent')
    } catch (error) {
      console.error('分享商品失败:', error)
      this.updateMessageStatus(message.id, 'failed')
    }
  },

  // 跳转到商品详情
  goToItemDetail() {
    if (this.data.relatedItem) {
      wx.navigateTo({
        url: `/pages/item-detail/item-detail?id=${this.data.relatedItem.id}`
      })
    }
  },

  onUnload() {
    // 页面卸载时的清理工作
  }
})