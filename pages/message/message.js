// message.js - 消息页面
const userManager = require('../../utils/userManager');
const messageManager = require('../../utils/messageManager');

Page({
  data: {
    userInfo: null,
    commentCount: 0,
    likeCount: 0,
    chatList: [],
    searchText: '',
    refreshing: false
  },

  onLoad() {
    console.log('消息页面加载');
    this.checkLoginStatus();
  },

  onShow() {
    console.log('消息页面显示');
    this.checkLoginStatus();
    this.loadMessages();
  },

  // 检查登录状态
  checkLoginStatus() {
    if (!userManager.isLoggedIn()) {
      wx.redirectTo({
        url: '/pages/login/login'
      });
      return;
    }

    const userInfo = userManager.getCurrentUser();
    this.setData({ userInfo });
  },

  // 加载消息数据
  async loadMessages() {
    console.log('加载消息数据');
    
    if (!this.data.userInfo) return;

    try {
      // 获取聊天列表
      const chatList = messageManager.getUserChats(this.data.userInfo.id);
      
      // 格式化聊天列表数据
      const formattedChatList = chatList.map(chat => ({
        id: chat.id,
        chatId: chat.chatId,
        userId: chat.userId,
        name: chat.userName,
        avatar: chat.userAvatar,
        lastMessage: chat.lastMessage,
        time: this.formatTime(chat.lastMessageTime),
        unreadCount: chat.unreadCount || 0,
        relatedItem: chat.relatedItem,
        isOnline: chat.isOnline || false,
        isPinned: chat.isPinned || false,
        isMuted: chat.isMuted || false
      }));

      // 从通知管理器获取未读数
      const notifyManager = require('../../utils/notifyManager');
      const commentUnread = notifyManager.getUnreadCount(this.data.userInfo.id, 'comment');
      const likeUnread = notifyManager.getUnreadCount(this.data.userInfo.id, 'like');

      this.setData({
        chatList: formattedChatList,
        commentCount: commentUnread,
        likeCount: likeUnread
      });

    } catch (error) {
      console.error('加载消息失败:', error);
    }
  },

  // 格式化时间显示
  formatTime(timestamp) {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diff < minute) {
      return '刚刚';
    } else if (diff < hour) {
      return `${Math.floor(diff / minute)}分钟前`;
    } else if (diff < day) {
      return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
    } else if (diff < 7 * day) {
      return `${Math.floor(diff / day)}天前`;
    } else {
      return `${date.getMonth() + 1}月${date.getDate()}日`;
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.setData({ refreshing: true });
    this.loadMessages();
    setTimeout(() => {
      this.setData({ refreshing: false });
    }, 1000);
  },

  // 搜索输入
  onSearchInput(e) {
    const searchText = e.detail.value;
    this.setData({ searchText });
    
    if (searchText.trim()) {
      this.searchChats(searchText);
    } else {
      this.loadMessages();
    }
  },

  // 搜索聊天
  async searchChats(keyword) {
    if (!this.data.userInfo) return;

    const results = messageManager.searchChatsAndMessages(this.data.userInfo.id, keyword);
    const formattedResults = results.map(chat => ({
      id: chat.id,
      chatId: chat.chatId,
      userId: chat.userId,
      name: chat.userName,
      avatar: chat.userAvatar,
      lastMessage: chat.lastMessage,
      time: this.formatTime(chat.lastMessageTime),
      unreadCount: chat.unreadCount || 0,
      relatedItem: chat.relatedItem,
      isOnline: chat.isOnline || false,
      isPinned: chat.isPinned || false,
      isMuted: chat.isMuted || false
    }));

    this.setData({ chatList: formattedResults });
  },

  // 查看评论消息
  navigateToComments() {
    console.log('查看评论消息');
    wx.navigateTo({
      url: '/pages/comments/comments'
    });
  },

  // 查看点赞消息
  navigateToLikes() {
    console.log('查看点赞消息');
    wx.navigateTo({
      url: '/pages/likes/likes'
    });
  },

  // 进入聊天页面
  navigateToChat(e) {
    const item = e.currentTarget.dataset.item;
    if (!item) return;

    console.log('进入聊天页面:', item);
    
    // 清除未读数
    messageManager.markMessagesAsRead(item.chatId, this.data.userInfo.id);
    
    // 跳转到聊天页面
    wx.navigateTo({
      url: `/pages/chat/chat?userId=${item.userId}&itemId=${item.relatedItem ? item.relatedItem.id : ''}`
    });
  },

  // 长按聊天项
  onLongPressChat(e) {
    const item = e.currentTarget.dataset.item;
    if (!item) return;

    const actionList = [];
    
    // 置顶/取消置顶
    actionList.push(item.isPinned ? '取消置顶' : '置顶聊天');
    
    // 免打扰/取消免打扰
    actionList.push(item.isMuted ? '取消免打扰' : '消息免打扰');
    
    // 删除聊天
    actionList.push('删除聊天');

    wx.showActionSheet({
      itemList: actionList,
      success: async (res) => {
        try {
          switch (res.tapIndex) {
            case 0: // 置顶/取消置顶
              messageManager.togglePinChat(item.chatId);
              this.loadMessages();
              wx.showToast({
                title: item.isPinned ? '已取消置顶' : '已置顶',
                icon: 'success'
              });
              break;
              
            case 1: // 免打扰/取消免打扰
              messageManager.toggleMuteChat(item.chatId);
              this.loadMessages();
              wx.showToast({
                title: item.isMuted ? '已取消免打扰' : '已设置免打扰',
                icon: 'success'
              });
              break;
              
            case 2: // 删除聊天
              wx.showModal({
                title: '确认删除',
                content: '删除后聊天记录将无法恢复',
                confirmColor: '#ff4d4f',
                success: async (modalRes) => {
                  if (modalRes.confirm) {
                    await messageManager.deleteChat(item.chatId, this.data.userInfo.id);
                    this.loadMessages();
                    wx.showToast({
                      title: '删除成功',
                      icon: 'success'
                    });
                  }
                }
              });
              break;
          }
        } catch (error) {
          console.error('操作失败:', error);
          wx.showToast({
            title: '操作失败',
            icon: 'none'
          });
        }
      }
    });
  },

  // 清除某个聊天的未读数
  clearUnread(e) {
    const item = e.currentTarget.dataset.item;
    if (!item) return;
    
    console.log('清除未读消息:', item.chatId);
    
    // 标记为已读
    messageManager.markMessagesAsRead(item.chatId, this.data.userInfo.id);
    
    // 重新加载消息列表
    this.loadMessages();
  },

  // 全部标记为已读
  markAllAsRead() {
    wx.showModal({
      title: '确认操作',
      content: '将所有聊天标记为已读？',
      success: (res) => {
        if (res.confirm) {
          messageManager.markAllAsRead(this.data.userInfo.id);
          this.loadMessages();
          wx.showToast({
            title: '已全部标记为已读',
            icon: 'success'
          });
        }
      }
    });
  },


});