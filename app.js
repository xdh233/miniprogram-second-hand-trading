// app.js
App({
  onLaunch() {
    console.log('小程序启动');
    
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 注释掉微信登录，使用我们自己的登录系统
    // wx.login({
    //   success: res => {
    //     // 发送 res.code 到后台换取 openId, sessionKey, unionId
    //   }
    // })
  },

  globalData: {
    userInfo: null
  }
})