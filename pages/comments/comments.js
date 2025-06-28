// pages/comments/comments.js - 评论通知页面
const userManager = require('../../utils/userManager');
const notifyManager = require('../../utils/notifyManager');

Page({
  data: {
    userInfo: null,
    commentList: [],
    refreshing: false,
    loading: false
  },

  onLoad() {
    console.log('评论通知页面加载');
    this.checkLoginStatus();
  },

  onShow() {
    console.log('评论通知页面显示');
    this.loadComments();
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

  // 加载评论通知
  async loadComments() {
    if (!this.data.userInfo || this.data.loading) return;

    this.setData({ loading: true });

    try {
      // 获取评论通知
      const notifications = notifyManager.getCommentNotifications(this.data.userInfo.id);
      
      // 格式化数据用于显示
      const formattedComments = notifications.map(notification => 
        notifyManager.formatNotificationForDisplay(notification)
      );

      this.setData({
        commentList: formattedComments,
        loading: false,
        refreshing: false
      });

    } catch (error) {
      console.error('加载评论通知失败:', error);
      this.setData({ 
        loading: false,
        refreshing: false 
      });
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.setData({ refreshing: true });
    this.loadComments();
  },

  // 点击评论项，跳转到相关内容
  navigateToContent(e) {
    const item = e.currentTarget.dataset.item;
    if (!item) return;

    console.log('跳转到内容:', item);
    
    // 标记为已读
    notifyManager.markAsRead(item.id);
    
    if (item.postId) {
      // 跳转到帖子详情
      wx.navigateTo({
        url: `/pages/post-detail/post-detail?id=${item.postId}`
      });
    } else if (item.itemId) {
      // 跳转到商品详情
      wx.navigateTo({
        url: `/pages/item-detail/item-detail?id=${item.itemId}`
      });
    }
  },

  // 长按评论项
  onLongPressComment(e) {
    const item = e.currentTarget.dataset.item;
    if (!item) return;

    wx.showActionSheet({
      itemList: ['标记为已读', '删除通知'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0: // 标记为已读
            this.markAsRead(item.id);
            break;
          case 1: // 删除通知
            this.deleteNotification(item.id);
            break;
        }
      }
    });
  },

  // 标记为已读
  markAsRead(notificationId) {
    if (notifyManager.markAsRead(notificationId)) {
      this.loadComments(); // 重新加载列表
      wx.showToast({
        title: '已标记为已读',
        icon: 'success'
      });
    }
  },

  // 删除通知
  deleteNotification(notificationId) {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条通知吗？',
      success: (res) => {
        if (res.confirm) {
          if (notifyManager.deleteNotification(notificationId)) {
            this.loadComments(); // 重新加载列表
            wx.showToast({
              title: '已删除',
              icon: 'success'
            });
          }
        }
      }
    });
  },

  // 全部标记为已读
  markAllAsRead() {
    wx.showModal({
      title: '确认操作',
      content: '将所有评论通知标记为已读？',
      success: (res) => {
        if (res.confirm) {
          if (notifyManager.markAllAsRead(this.data.userInfo.id, 'comment')) {
            this.loadComments(); // 重新加载列表
            wx.showToast({
              title: '已全部标记为已读',
              icon: 'success'
            });
          }
        }
      }
    });
  }
});