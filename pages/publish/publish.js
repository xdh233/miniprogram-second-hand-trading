// publish.js - 发布选择页面（增加求购选项）
const userManager = require('../../utils/userManager');

Page({
  data: {
    userInfo: null,
    isVisible: false
  },

  onLoad() {
    console.log('发布页面加载');
    this.checkLoginStatus();
  },

  onShow() {
    console.log('发布页面显示');
    this.checkLoginStatus();
    
    // 重置动画状态
    this.setData({ isVisible: false });
    
    // 延迟显示动画效果，确保每次都有动画
    setTimeout(() => {
      this.setData({ isVisible: true });
    }, 100);
  },

  onHide() {
    this.setData({ isVisible: false });
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
    wx.navigateTo({
      url: '/pages/publish-post/publish-post'
    });
  },

  // 发布商品（出售）
  publishItem() {
    console.log('发布闲置商品');
    wx.navigateTo({
      url: '/pages/publish-item/publish-item?type=sell'
    });
  },

  // 发布求购
  publishBuyRequest() {
    console.log('发布求购');
    wx.navigateTo({
      url: '/pages/publish-item/publish-item?type=buy'
    });
  },

  // 关闭选择器
  closePicker() {
    console.log('关闭发布选择器');
    
    // 先隐藏动画
    this.setData({ isVisible: false });
    
    // 延迟跳转，等待动画结束
    setTimeout(() => {
      wx.switchTab({
        url: '/pages/index/index'
      });
    }, 250);
  },

  // 阻止事件冒泡
  preventBubble() {
    // 空函数，仅用于阻止事件冒泡
  }
});