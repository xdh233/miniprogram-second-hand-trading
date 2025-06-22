// app.js
App({
  onLaunch() {
    console.log('小程序启动');
    
    if (!require('./utils/userManager').isLoggedIn()) {
      wx.reLaunch({ url: '/pages/login/login' });
    }
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)
  },

  globalData: {
    userInfo: null
  }
})