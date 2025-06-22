// pages/chat/chat.js - 聊天页面
const userManager = require('../../utils/userManager');
const messageManager = require('../../utils/messageManager');

Page({
  data: {
    userInfo: null,
    otherUser: null,
    messages: [],
    inputText: '',
    scrollTop: 999999,
    page: 1,
    hasMore: true,
    loading: false,
    sending: false,
    chatId: '',
    relatedItem: null,
    showItemCard: false,
    // 输入框相关
    inputBottom: 0,
    keyboardHeight: 0,
    // 状态栏高度
    statusBarHeight: 0,
    navBarHeight: 0
  },

  onLoad(options) {
    console.log('聊天页面加载，参数:', options);
    
    // 获取状态栏高度
    const systemInfo = wx.getWindowInfo(); // 获取窗口信息，包含statusBarHeight
    const itemCardHeight = 91; // 恢复合适的商品卡片高度
    
    this.setData({
      statusBarHeight: systemInfo.statusBarHeight,
      navBarHeight: systemInfo.statusBarHeight + 44, // 44是导航栏内容高度
      itemCardHeight: itemCardHeight
    });
    
    // 检查登录状态
    if (!userManager.isLoggedIn()) {
      wx.redirectTo({
        url: '/pages/login/login'
      });
      return;
    }

    const userInfo = userManager.getCurrentUser();
    this.setData({ userInfo });

    // 获取聊天参数
    const { userId, itemId } = options;
    
    if (!userId) {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      });
      wx.navigateBack();
      return;
    }

    this.initChat(parseInt(userId), itemId);
  },

  onShow() {
    // 标记消息为已读
    if (this.data.chatId) {
      messageManager.markMessagesAsRead(this.data.chatId, this.data.userInfo.id);
    }
  },

  onUnload() {
    // 页面卸载时也标记为已读
    if (this.data.chatId) {
      messageManager.markMessagesAsRead(this.data.chatId, this.data.userInfo.id);
    }
  },

  // 初始化聊天
  async initChat(otherUserId, itemId) {
    try {
      // 获取对方用户信息
      const result = await userManager.getUserInfo(otherUserId);
      const otherUser = result.data.userInfo;
      
      // 获取或创建聊天
      let relatedItem = null;
      if (itemId) {
        // 如果有商品ID，获取商品信息（这里需要你的商品管理模块）
        relatedItem = await this.getItemInfo(itemId);
      }
      
      const chat = messageManager.getOrCreateChat(
        this.data.userInfo.id,
        otherUserId,
        otherUser,
        relatedItem
      );

      // 设置页面标题
      wx.setNavigationBarTitle({
        title: otherUser.nickname
      });

      this.setData({
        otherUser,
        chatId: chat.chatId,
        relatedItem,
        showItemCard: !!relatedItem
      });

      // 加载消息
      this.loadMessages();

    } catch (error) {
      console.error('初始化聊天失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  // 获取商品信息（需要根据你的商品管理模块实现）
  async getItemInfo(itemId) {
    // 这里应该调用你的商品管理模块
    // 暂时返回模拟数据
    return {
      id: itemId,
      title: '护眼台灯 全新未拆封',
      price: '80',
      image: '/images/lamp1.jpg',
      status: 'available'
    };
  },

  // 加载消息
  loadMessages() {
    if (this.data.loading || !this.data.hasMore) return;

    this.setData({ loading: true });

    const result = messageManager.getChatMessages(
      this.data.chatId,
      this.data.page,
      20
    );

    let newMessages = result.messages.map(msg => ({
      ...msg,
      isSelf: msg.senderId === this.data.userInfo.id
    }));

    // 添加时间显示逻辑
    newMessages = this.addTimeDisplays(newMessages);

    this.setData({
      messages: this.data.page === 1 ? newMessages : [...newMessages, ...this.data.messages],
      hasMore: result.hasMore,
      loading: false,
      page: this.data.page + 1
    });

    // 滚动到底部（首次加载）
    if (this.data.page === 2) {
      this.scrollToBottom();
    }
  },

  // 添加时间显示逻辑（类似微信）
  addTimeDisplays(messages) {
    if (!messages || messages.length === 0) return [];
    
    const processedMessages = [];
    let lastShowTime = 0;
    const TIME_INTERVAL = 5 * 60 * 1000; // 5分钟间隔显示时间

    // 按时间顺序处理消息
    const sortedMessages = [...messages].sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );

    sortedMessages.forEach((msg, index) => {
      const currentTime = new Date(msg.timestamp).getTime();
      
      // 如果是第一条消息，或者距离上次显示时间超过5分钟，则显示时间
      if (index === 0 || (currentTime - lastShowTime) > TIME_INTERVAL) {
        msg.showTime = true;
        msg.timeDisplay = this.formatDetailTime(msg.timestamp);
        lastShowTime = currentTime;
      } else {
        msg.showTime = false;
      }
      
      processedMessages.push(msg);
    });

    return processedMessages;
  },

  // 格式化详细时间（用于时间标签）
  formatDetailTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

    if (messageDate.getTime() === today.getTime()) {
      return timeStr; // 今天只显示时间
    } else if (messageDate.getTime() === yesterday.getTime()) {
      return `昨天 ${timeStr}`;
    } else if (date.getFullYear() === now.getFullYear()) {
      return `${date.getMonth() + 1}月${date.getDate()}日 ${timeStr}`;
    } else {
      return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${timeStr}`;
    }
  },

  // 判断是否应该显示时间
  shouldShowTime(timestamp) {
    const messages = this.data.messages;
    if (messages.length === 0) return true;
    
    const lastMessage = messages[messages.length - 1];
    const timeDiff = new Date(timestamp).getTime() - new Date(lastMessage.timestamp).getTime();
    
    return timeDiff > 5 * 60 * 1000; // 超过5分钟显示时间
  },

  // 发送文本消息
  async sendTextMessage() {
    const content = this.data.inputText.trim();
    if (!content || this.data.sending) return;

    this.setData({ 
      sending: true,
      inputText: ''
    });

    try {
      const result = await messageManager.sendMessage(
        this.data.userInfo.id,
        this.data.otherUser.id,
        {
          type: 'text',
          content: content
        }
      );

      const newMessage = {
        ...result.data,
        isSelf: true,
        showTime: this.shouldShowTime(result.data.timestamp),
        timeDisplay: this.formatDetailTime(result.data.timestamp)
      };

      this.setData({
        messages: [...this.data.messages, newMessage]
      });

      // 强制滚动到底部
      this.scrollToBottom();

    } catch (error) {
      console.error('发送消息失败:', error);
      wx.showToast({
        title: '发送失败',
        icon: 'none'
      });
    } finally {
      this.setData({ sending: false });
    }
  },

  // 发送图片消息
  sendImageMessage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const tempFilePath = res.tempFilePaths[0];
        
        wx.showLoading({ title: '发送中...' });

        try {
          // 这里应该上传图片到服务器，暂时使用本地路径
          const imageUrl = tempFilePath;

          const result = await messageManager.sendMessage(
            this.data.userInfo.id,
            this.data.otherUser.id,
            {
              type: 'image',
              content: '[图片]',
              imageUrl: imageUrl
            }
          );

          const newMessage = {
            ...result.data,
            isSelf: true,
            showTime: this.shouldShowTime(result.data.timestamp),
            timeDisplay: this.formatDetailTime(result.data.timestamp)
          };

          this.setData({
            messages: [...this.data.messages, newMessage]
          });

          // 强制滚动到底部
          this.scrollToBottom();

        } catch (error) {
          console.error('发送图片失败:', error);
          wx.showToast({
            title: '发送失败',
            icon: 'none'
          });
        } finally {
          wx.hideLoading();
        }
      }
    });
  },

  // 发送商品消息
  async sendItemMessage() {
    if (!this.data.relatedItem) return;

    this.setData({ sending: true });

    try {
      const result = await messageManager.sendMessage(
        this.data.userInfo.id,
        this.data.otherUser.id,
        {
          type: 'item',
          content: `[商品] ${this.data.relatedItem.title}`,
          itemData: this.data.relatedItem
        }
      );

      const newMessage = {
        ...result.data,
        isSelf: true,
        showTime: this.shouldShowTime(result.data.timestamp),
        timeDisplay: this.formatDetailTime(result.data.timestamp)
      };

      this.setData({
        messages: [...this.data.messages, newMessage]
      });

      // 强制滚动到底部
      this.scrollToBottom();

    } catch (error) {
      console.error('发送商品消息失败:', error);
      wx.showToast({
        title: '发送失败',
        icon: 'none'
      });
    } finally {
      this.setData({ sending: false });
    }
  },

  // 输入框内容变化
  onInputChange(e) {
    this.setData({
      inputText: e.detail.value
    });
  },

  // 键盘高度变化
  onKeyboardHeightChange(e) {
    this.setData({
      keyboardHeight: e.detail.height,
      inputBottom: e.detail.height
    });
    
    // 键盘弹起时滚动到底部
    if (e.detail.height > 0) {
      setTimeout(() => {
        this.scrollToBottom();
      }, 100);
    }
  },

  // 滚动到底部
  scrollToBottom() {
    // 延迟执行，确保DOM更新完成
    setTimeout(() => {
      this.setData({
        scrollTop: 999999
      });
    }, 100);
  },

  // 下拉加载更多
  onScrollToUpper() {
    this.loadMessages();
  },

  // 预览图片
  previewImage(e) {
    const url = e.currentTarget.dataset.url;
    const urls = this.data.messages
      .filter(msg => msg.type === 'image')
      .map(msg => msg.imageUrl);
    
    wx.previewImage({
      current: url,
      urls: urls
    });
  },

  // 点击商品卡片
  onItemCardTap(e) {
    const itemData = e.currentTarget.dataset.item;
    // 跳转到商品详情页
    wx.navigateTo({
      url: `/pages/item-detail/item-detail?id=${itemData.id}`
    });
  },

  // 长按消息
  onLongPressMessage(e) {
    const messageId = e.currentTarget.dataset.id;
    const message = this.data.messages.find(msg => msg.id === messageId);
    
    if (!message || !message.isSelf) return;

    wx.showActionSheet({
      itemList: ['删除消息'],
      success: async (res) => {
        if (res.tapIndex === 0) {
          try {
            await messageManager.deleteMessage(messageId, this.data.userInfo.id);
            
            const messages = this.data.messages.filter(msg => msg.id !== messageId);
            this.setData({ messages });
            
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });
          } catch (error) {
            wx.showToast({
              title: error.message || '删除失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  // 返回上一页
  onBackTap() {
    wx.navigateBack();
  }
});