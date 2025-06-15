// message.js - 消息页面
const userManager = require('../../utils/userManager');

Page({
  data: {
    userInfo: null,
    mentionCount: 3,
    commentCount: 5,
    likeCount: 8,
    chatList: [
      {
        id: 1,
        name: '张三',
        avatar: '/images/default-avatar.png',
        lastMessage: '这个商品还在吗？',
        time: '10:30',
        unreadCount: 2
      },
      {
        id: 2,
        name: '李四',
        avatar: '/images/default-avatar.png',
        lastMessage: '好的，谢谢！',
        time: '昨天',
        unreadCount: 0
      },
      {
        id: 3,
        name: '王五',
        avatar: '/images/default-avatar.png',
        lastMessage: '什么时候可以交易？',
        time: '星期二',
        unreadCount: 1
      }
    ]
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
  loadMessages() {
    console.log('加载消息数据');
    // 这里可以从服务器或本地存储加载消息数据
    // 暂时使用模拟数据
  },

  // 查看@我的消息
  navigateToMentions() {
    console.log('查看@我的消息');
    wx.showToast({
      title: '@我的消息功能开发中',
      icon: 'none'
    });
    // wx.navigateTo({
    //   url: '/pages/mentions/mentions'
    // });
  },

  // 查看评论消息
  navigateToComments() {
    console.log('查看评论消息');
    wx.showToast({
      title: '评论消息功能开发中',
      icon: 'none'
    });
    // wx.navigateTo({
    //   url: '/pages/comments/comments'
    // });
  },

  // 查看点赞消息
  navigateToLikes() {
    console.log('查看点赞消息');
    wx.showToast({
      title: '点赞消息功能开发中',
      icon: 'none'
    });
    // wx.navigateTo({
    //   url: '/pages/likes/likes'
    // });
  },

  // 进入聊天页面
  navigateToChat(e) {
    const chatId = e.currentTarget.dataset.id;
    console.log('进入聊天页面:', chatId);
    wx.showToast({
      title: '聊天功能开发中',
      icon: 'none'
    });
    // wx.navigateTo({
    //   url: `/pages/chat/chat?id=${chatId}`
    // });
  },

  // 清除某个聊天的未读数
  clearUnread(e) {
    const chatId = e.currentTarget.dataset.id;
    console.log('清除未读消息:', chatId);
    
    const chatList = this.data.chatList.map(chat => {
      if (chat.id === chatId) {
        return { ...chat, unreadCount: 0 };
      }
      return chat;
    });
    
    this.setData({ chatList });
  }
});