// app.js - 添加WebSocket初始化
const apiConfig = require('./utils/apiConfig');
const categoryConfig = require('./utils/categoryConfig');
const webSocketManager = require('./utils/webSocketManager');
const userManager = require('./utils/userManager');

App({
  onLaunch() {
    console.log('小程序启动');
    
    // 小程序启动时恢复token
    const token = wx.getStorageSync('userToken');
    if (token) {
      apiConfig.setToken(token);
      console.log('已恢复用户登录状态');
      
      // 🔌 自动连接WebSocket
      this.initWebSocket();
    }
    
    // 初始化分类数据
    this.initializeCategories();
    
    // 检查登录状态
    if (!userManager.isLoggedIn()) {
      wx.reLaunch({ url: '/pages/login/login' });
    }
    
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)
  },

  // 🔌 初始化WebSocket连接
  initWebSocket() {
    console.log('初始化WebSocket连接...');
    
    // 延迟连接，确保用户界面已加载
    setTimeout(() => {
      if (userManager.isLoggedIn()) {
        webSocketManager.connect();
        
        // 监听WebSocket连接状态
        webSocketManager.on('connected', () => {
          console.log('App: WebSocket连接成功');
          this.globalData.webSocketConnected = true;
        });
        
        webSocketManager.on('disconnected', () => {
          console.log('App: WebSocket连接断开');
          this.globalData.webSocketConnected = false;
        });
        
        webSocketManager.on('message_notification', (notification) => {
          this.handleGlobalMessageNotification(notification);
        });
        
      } else {
        console.log('用户未登录，跳过WebSocket连接');
      }
    }, 1000);
  },

  // 📱 处理全局消息通知
  handleGlobalMessageNotification(notification) {
    console.log('收到全局消息通知:', notification);
    
    // 获取当前页面
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    const currentRoute = currentPage.route;
    
    // 如果不在聊天页面，显示通知
    if (!currentRoute.includes('chat')) {
      this.showMessageNotification(notification);
    }
    
    // 更新TabBar角标
    this.updateMessageBadge();
  },

  // 显示消息通知
  showMessageNotification(notification) {
    wx.showToast({
      title: `${notification.senderName}: ${notification.content}`,
      icon: 'none',
      duration: 2000
    });
    
    // 震动提示
    wx.vibrateShort();
  },

  // 更新消息角标
  updateMessageBadge() {
    // 这里可以调用chatManager获取未读总数
    // 或者维护一个全局的未读数计数器
    try {
      const chatManager = require('./utils/chatManager');
      const unreadCount = chatManager.getTotalUnreadCount();
      
      if (unreadCount > 0) {
        wx.setTabBarBadge({
          index: 3, // 消息页面的index
          text: unreadCount > 99 ? '99+' : unreadCount.toString()
        });
      } else {
        wx.removeTabBarBadge({
          index: 3
        });
      }
    } catch (error) {
      console.log('更新消息角标失败:', error);
    }
  },

  // 原有的分类初始化方法
  async initializeCategories() {
    try {
      console.log('开始初始化分类数据...');
      
      const categories = categoryConfig.getCategories();
      this.globalData.categories = categories;
      console.log('基础分类数据已加载，共', categories.length, '个分类');
      
      this.checkCategoriesSync();
      
    } catch (error) {
      console.error('分类数据初始化失败:', error);
      this.globalData.categories = categoryConfig.getCategories();
    }
  },

  async checkCategoriesSync() {
    try {
      const updatedCategories = await categoryConfig.checkAndSync();
      
      if (updatedCategories.length !== this.globalData.categories.length) {
        this.globalData.categories = updatedCategories;
        console.log('分类数据已更新');
        
        const pages = getCurrentPages();
        if (pages.length > 0) {
          const currentPage = pages[pages.length - 1];
          if (currentPage.onCategoriesUpdated) {
            currentPage.onCategoriesUpdated(updatedCategories);
          }
        }
      }
      
    } catch (error) {
      console.log('分类同步检查失败，继续使用本地数据:', error.message);
    }
  },

  // 🌐 小程序显示时
  onShow() {
    console.log('小程序前台显示');
    
    // 检查登录状态
    if (userManager.isLoggedIn()) {
      // 如果WebSocket断开，尝试重连
      if (!this.globalData.webSocketConnected) {
        console.log('尝试重连WebSocket');
        webSocketManager.connect();
      }
    }
  },

  // 🌑 小程序隐藏时
  onHide() {
    console.log('小程序后台隐藏');
    
    // 可以选择保持WebSocket连接以接收后台通知
    // 或者断开连接以节省资源
    // 这里选择保持连接
  },

  // 💥 小程序错误处理
  onError(error) {
    console.error('小程序全局错误:', error);
    
    // 可以添加错误上报逻辑
    // 或者重置某些状态
  },

  // 获取分类数据的便捷方法
  getCategories() {
    return this.globalData.categories || categoryConfig.getCategories();
  },

  getMarketCategories() {
    return categoryConfig.getMarketCategories();
  },

  // 🔌 获取WebSocket状态
  getWebSocketStatus() {
    return {
      connected: this.globalData.webSocketConnected,
      status: webSocketManager.getStatus()
    };
  },

  // 🔄 手动重连WebSocket
  reconnectWebSocket() {
    console.log('手动重连WebSocket');
    webSocketManager.disconnect();
    setTimeout(() => {
      webSocketManager.connect();
    }, 1000);
  },

  // 🚪 用户登出时的清理
  onUserLogout() {
    console.log('用户登出，清理WebSocket连接');
    
    // 断开WebSocket连接
    webSocketManager.disconnect();
    
    // 清理全局状态
    this.globalData.webSocketConnected = false;
    
    // 清理消息角标
    wx.removeTabBarBadge({
      index: 3
    });
  },

  // 🔑 用户登录时的初始化
  onUserLogin() {
    console.log('用户登录，初始化WebSocket连接');
    
    // 重新连接WebSocket
    this.initWebSocket();
  },

  globalData: {
    userInfo: null,
    categories: [],
    webSocketConnected: false, // WebSocket连接状态
    messageUnreadCount: 0 // 消息未读数
  }
})