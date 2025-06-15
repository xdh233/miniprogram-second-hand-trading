// publish.js - 发布选择页面
const userManager = require('../../utils/userManager');

Page({
  data: {
    userInfo: null
  },

  onLoad() {
    console.log('发布页面加载');
    this.checkLoginStatus();
  },

  onShow() {
    console.log('发布页面显示');
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

  // 发布动态
  publishPost() {
    console.log('发布动态');
    wx.showToast({
      title: '发布动态功能开发中',
      icon: 'none'
    });
    // wx.navigateTo({
    //   url: '/pages/publish-post/publish-post'
    // });
  },

  // 发布商品
  publishItem() {
    console.log('发布商品');
    wx.showToast({
      title: '发布商品功能开发中',
      icon: 'none'
    });
    // wx.navigateTo({
    //   url: '/pages/publish-item/publish-item'
    // });
  },

  // 关闭选择器
  closePicker() {
    console.log('关闭发布选择器');
    // 返回上一个tab页面
    wx.switchTab({
      url: '/pages/index/index'
    });
  }
});