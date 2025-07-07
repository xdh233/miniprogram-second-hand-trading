// app.js - 完整修复版本
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
      
      const categories = await categoryConfig.getAllCategories();
      this.globalData.categories = categories;
      console.log('基础分类数据已加载，共', categories.length, '个分类');
      
    } catch (error) {
      console.error('分类数据初始化失败:', error);
      this.globalData.categories = categoryConfig.getDefaultCategories();
    }
  },

  // 🌐 小程序显示时 - 修复版本
  onShow() {
    console.log('小程序前台显示');
    this.handleAppShow();
  },

  // 🌑 小程序隐藏时 - 修复版本
  onHide() {
    console.log('小程序后台隐藏');
    this.handleAppHide();
  },

  // 🔥 处理小程序显示的核心逻辑
  handleAppShow() {
    // 延迟处理，确保小程序完全激活
    setTimeout(() => {
      try {
        console.log('处理小程序显示事件');
        
        // 检查登录状态
        if (userManager.isLoggedIn()) {
          // 通知WebSocket管理器小程序已显示
          if (webSocketManager && typeof webSocketManager.handleAppShow === 'function') {
            console.log('通知WebSocket管理器：小程序显示');
            webSocketManager.handleAppShow();
          }
          
          // 检查WebSocket连接状态
          const wsStatus = webSocketManager.getStatus();
          console.log('当前WebSocket状态:', wsStatus);
          
          // 如果WebSocket断开，尝试重连
          if (!wsStatus.isConnected) {
            console.log('WebSocket已断开，尝试重连');
            webSocketManager.connect().catch(error => {
              console.error('重连WebSocket失败:', error);
            });
          }
          
          // 更新全局连接状态
          this.globalData.webSocketConnected = wsStatus.isConnected;
          
        } else {
          console.log('用户未登录，跳过WebSocket处理');
        }
        
      } catch (error) {
        console.error('处理小程序显示失败:', error);
      }
    }, 500); // 延迟500ms确保小程序完全激活
  },

  // 🔥 处理小程序隐藏的核心逻辑
  handleAppHide() {
    try {
      console.log('处理小程序隐藏事件');
      
      // 通知WebSocket管理器小程序已隐藏
      if (webSocketManager && typeof webSocketManager.handleAppHide === 'function') {
        console.log('通知WebSocket管理器：小程序隐藏');
        webSocketManager.handleAppHide();
      }
      
    } catch (error) {
      console.error('处理小程序隐藏失败:', error);
    }
  },

  // 💥 小程序错误处理
  onError(error) {
    console.error('小程序全局错误:', error);
    
    // 如果是WebSocket相关错误，尝试重连
    if (error && error.message && error.message.includes('WebSocket')) {
      console.log('检测到WebSocket错误，尝试重连');
      setTimeout(() => {
        if (userManager.isLoggedIn()) {
          webSocketManager.connect().catch(err => {
            console.error('错误恢复时重连失败:', err);
          });
        }
      }, 2000);
    }
  },

  // 获取分类数据的便捷方法
  getCategories() {
    return this.globalData.categories || categoryConfig.getAllCategories();
  },
  
  // 🔌 获取WebSocket状态
  getWebSocketStatus() {
    return {
      connected: this.globalData.webSocketConnected,
      status: webSocketManager.getStatus()
    };
  },

  // 🔄 手动重连WebSocket - 增强版本
  reconnectWebSocket() {
    console.log('手动重连WebSocket');
    
    return new Promise((resolve, reject) => {
      // 先断开现有连接
      webSocketManager.disconnect();
      
      // 等待1秒后重连
      setTimeout(async () => {
        try {
          await webSocketManager.connect();
          this.globalData.webSocketConnected = true;
          console.log('手动重连WebSocket成功');
          resolve();
        } catch (error) {
          console.error('手动重连WebSocket失败:', error);
          this.globalData.webSocketConnected = false;
          reject(error);
        }
      }, 1000);
    });
  },

  // 🚪 用户登出时的清理
  onUserLogout() {
    console.log('用户登出，清理WebSocket连接');
    
    // 断开WebSocket连接
    webSocketManager.disconnect();
    
    // 清理全局状态
    this.globalData.webSocketConnected = false;
    this.globalData.messageUnreadCount = 0;
    
    // 清理消息角标
    wx.removeTabBarBadge({
      index: 3
    }).catch(() => {
      // 忽略清理角标的错误
    });
  },

  // 🔑 用户登录时的初始化
  onUserLogin() {
    console.log('用户登录，初始化WebSocket连接');
    
    // 重新连接WebSocket
    this.initWebSocket();
  },

  // 🔥 获取应用实例的工具方法
  getCurrentWebSocketStatus() {
    try {
      const status = webSocketManager.getStatus();
      return {
        ...status,
        globalConnected: this.globalData.webSocketConnected
      };
    } catch (error) {
      console.error('获取WebSocket状态失败:', error);
      return {
        isConnected: false,
        globalConnected: false,
        error: error.message
      };
    }
  },

  // 🔥 检查网络状态
  checkNetworkStatus() {
    return new Promise((resolve) => {
      wx.getNetworkType({
        success: (res) => {
          console.log('当前网络类型:', res.networkType);
          resolve({
            networkType: res.networkType,
            isConnected: res.networkType !== 'none'
          });
        },
        fail: (error) => {
          console.error('获取网络状态失败:', error);
          resolve({
            networkType: 'unknown',
            isConnected: false,
            error: error.message
          });
        }
      });
    });
  },

  globalData: {
    userInfo: null,
    categories: [],
    webSocketConnected: false, // WebSocket连接状态
    messageUnreadCount: 0, // 消息未读数
    appShowTime: null, // 小程序显示时间
    appHideTime: null  // 小程序隐藏时间
  }
})