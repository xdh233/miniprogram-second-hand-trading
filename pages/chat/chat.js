// pages/chat/chat.js - 聊天页面
const userManager = require('../../utils/userManager');
const messageManager = require('../../utils/messageManager');
const itemManager = require('../../utils/itemManager');

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
  },

  onLoad(options) {
    console.log('聊天页面加载，参数:', options);

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
    const { userId, itemId, postId } = options;
    
    if (!userId) {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      });
      wx.navigateBack();
      return;
    }

    this.initChat(parseInt(userId), itemId, postId);
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
  async initChat(otherUserId, itemId, postId) {
    try {
      console.log('初始化聊天，参数:', { otherUserId, itemId, postId });
      
      const otherUser = await userManager.getUserInfo(otherUserId);
      console.log('获取对方用户信息:', otherUser);
      
      // 检查用户信息是否有效
      if (!otherUser || !otherUser.data || !otherUser.data.userInfo) {
        throw new Error('无法获取用户信息');
      }
      
      // 检查是否已存在聊天
      const existingChat = messageManager.findExistingChat(
        this.data.userInfo.id,
        otherUserId
      );
      
      let chatData;
      if (existingChat) {
        // 如果已存在聊天，使用原有的聊天信息
        chatData = existingChat;
        console.log('使用已存在的聊天:', chatData);

        // 如果传入了新的itemId，更新商品卡片
        if (itemId && itemId != existingChat.relatedItem?.id) {
          console.log('需要更新商品，原商品ID:', existingChat.relatedItem?.id, '新商品ID:', itemId);
          try {
            const newItem = await this.getItemInfo(itemId);
            if (newItem) {
              chatData.relatedItem = newItem;
              
              // 更新聊天记录中的商品信息
              const updateResult = messageManager.updateChatItem(chatData.chatId, newItem);
              console.log('更新结果:', updateResult);
            }
          } catch (itemError) {
            console.error('获取商品信息失败:', itemError);
            // 商品获取失败不影响聊天初始化
          }
        }

      } else {
        // 如果不存在，创建新聊天
        let relatedItem = null;
        if (itemId) {
          try {
            relatedItem = await this.getItemInfo(itemId);
          } catch (itemError) {
            console.error('获取商品信息失败:', itemError);
            // 商品获取失败不影响聊天创建
          }
        }
        
        chatData = messageManager.getOrCreateChat(
          this.data.userInfo.id,
          otherUserId,
          otherUser.data.userInfo,
          relatedItem
        );
      }
      
      this.setData({
        otherUser: otherUser.data.userInfo,
        chatId: chatData.chatId,
        relatedItem: chatData.relatedItem, // 使用原有的商品信息
        showItemCard: !!chatData.relatedItem
      });
      
      // 设置对方名称 - 添加安全检查
      const title = otherUser.data.userInfo.nickname || 
                    otherUser.data.userInfo.name || 
                    '聊天';
      wx.setNavigationBarTitle({
        title: title
      });
      
      this.loadMessages();

    } catch (error) {
      console.error('初始化聊天失败:', error);
      wx.showToast({
        title: '初始化聊天失败',
        icon: 'none'
      });
      
      // 延迟返回上一页
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  // 修复 getItemInfo 方法
  async getItemInfo(itemId) {
    console.log('获取商品信息, itemId:', itemId);
    
    try {
      if (!itemId) {
        throw new Error('商品ID为空');
      }
      
      const item = itemManager.getItemById(parseInt(itemId));
      
      if (!item) {
        throw new Error('商品不存在');
      }
      
      console.log('返回商品信息:', item);
      return item;
      
    } catch (error) {
      console.error('获取商品信息失败:', error);
      throw error;
    }
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

  // 修复发送图片消息的方法
  sendImageMessage() {
    wx.chooseMedia({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      mediaType: ['image'], // 明确指定只选择图片
      success: async (res) => {
        console.log('选择图片成功，返回数据:', res);
        
        let tempFilePath = '';
        
        // 兼容不同的返回格式
        if (res.tempFilePaths && res.tempFilePaths.length > 0) {
          // 旧版本格式
          tempFilePath = res.tempFilePaths[0];
        } else if (res.tempFiles && res.tempFiles.length > 0) {
          // 新版本格式
          tempFilePath = res.tempFiles[0].tempFilePath;
        } else {
          console.error('未找到有效的图片路径:', res);
          wx.showToast({
            title: '选择图片失败',
            icon: 'none'
          });
          return;
        }
        
        console.log('图片路径:', tempFilePath);
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
      },
      fail: (error) => {
        console.error('选择图片失败:', error);
        if (error.errMsg && !error.errMsg.includes('cancel')) {
          wx.showToast({
            title: '选择图片失败',
            icon: 'none'
          });
        }
      }
    });
  },

  // 抽取图片处理逻辑
  async processSelectedImage(tempFilePath) {
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