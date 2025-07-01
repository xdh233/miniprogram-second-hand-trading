// profile.js - 个人中心页面
const userManager = require('../../utils/userManager');
const postManager = require('../../utils/postManager');
const itemManager = require('../../utils/itemManager');

Page({
  data: {
    userInfo: null,
    showFeedbackModal: false,
    feedbackContent: '',
    maxLength: 200
  },

  onLoad() {
    console.log('个人中心页面加载');
    this.checkLoginStatus();
  },

  onShow() {
    console.log('个人中心页面显示');
    this.checkLoginStatus();
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

  // 设置
  navigateToSettings() {
    console.log('打开设置');
    wx.navigateTo({
      url: '/pages/settings/settings'
    });
  },

  // 个人空间
  navigateToMyPublished() {
    console.log('查看个人空间');
    const currentUser=userManager.getCurrentUser();

    if (!currentUser) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    const userId=currentUser.id;
    wx.navigateTo({
      url: `/pages/user-profile/user-profile?userId=${userId}`
    });
  },

  // 我卖出的
  navigateToMySold() {
    console.log('查看我卖出的');
    wx.navigateTo({
      url: '/pages/sold-items/sold-items'
    });
  },

  // 我买到的
  navigateToMyBought() {
    console.log('查看我买到的');

    wx.navigateTo({
      url: '/pages/bought-items/bought-items'
    });
  },

  // 我的收藏
  navigateToFavorites() {
    console.log('查看我的收藏');

    wx.navigateTo({
      url: '/pages/my-favorites/my-favorites'
    });
  },

  // 意见反馈方法
  navigateToFeedback() {
    console.log('意见反馈');
    this.setData({
      showFeedbackModal: true,
      feedbackContent: '' // 清空之前的内容
    });
  },

  // 隐藏反馈弹窗
  hideFeedbackModal() {
    this.setData({
      showFeedbackModal: false,
      feedbackContent: ''
    });
  },

  // 输入框内容变化
  onFeedbackInput(e) {
    this.setData({
      feedbackContent: e.detail.value
    });
  },

  // 提交反馈
  submitFeedback() {
    if (!this.data.feedbackContent.trim()) {
      wx.showToast({
        title: '请输入反馈内容',
        icon: 'none'
      });
      return;
    }
    
    // 这里可以添加提交到服务器的逻辑 后端
    console.log('反馈内容：', this.data.feedbackContent);
    
    wx.showToast({
      title: '提交成功，感谢您的反馈！',
      icon: 'success'
    });
    
    this.hideFeedbackModal();
  },

  navigateToAbout() {
    console.log('关于开发者');
         
    wx.showModal({
      title: '关于开发者',
      content: '开发者：牛大果\n 感谢您的使用！',
      showCancel: false,
      confirmText: '知道了'
    });
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          userManager.logout();
          wx.reLaunch({
            url: '/pages/login/login'
          });
        }
      }
    });
  }
});