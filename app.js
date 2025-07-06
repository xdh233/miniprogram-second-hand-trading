// app.js
const apiConfig = require('./utils/apiConfig');
const categoryConfig = require('./utils/categoryConfig'); // 添加分类管理器

App({
  onLaunch() {
    console.log('小程序启动');
    
    // 小程序启动时恢复token
    const token = wx.getStorageSync('userToken');
    if (token) {
      apiConfig.setToken(token);
      console.log('已恢复用户登录状态');
    }
    
    // 初始化分类数据（在登录检查之前，因为分类数据不需要登录）
    this.initializeCategories();
    
    if (!require('./utils/userManager').isLoggedIn()) {
      wx.reLaunch({ url: '/pages/login/login' });
    }
    
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)
  },

  // 初始化分类数据
  async initializeCategories() {
    try {
      console.log('开始初始化分类数据...');
      
      // 先确保有基础的分类数据可用
      const categories = categoryConfig.getCategories();
      this.globalData.categories = categories;
      console.log('基础分类数据已加载，共', categories.length, '个分类');
      
      // 异步检查是否需要同步（不阻塞启动流程）
      this.checkCategoriesSync();
      
    } catch (error) {
      console.error('分类数据初始化失败:', error);
      
      // 确保至少有默认分类可用
      this.globalData.categories = categoryConfig.getCategories();
    }
  },

  // 异步检查分类同步（不阻塞启动）
  async checkCategoriesSync() {
    try {
      // 在后台检查是否需要同步
      const updatedCategories = await categoryConfig.checkAndSync();
      
      // 如果数据有更新，更新全局数据
      if (updatedCategories.length !== this.globalData.categories.length) {
        this.globalData.categories = updatedCategories;
        console.log('分类数据已更新');
        
        // 通知当前活跃页面数据已更新（可选）
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

  // 获取分类数据的便捷方法
  getCategories() {
    return this.globalData.categories || categoryConfig.getCategories();
  },

  // 获取市场页面用的分类数据
  getMarketCategories() {
    return categoryConfig.getMarketCategories();
  },

  globalData: {
    userInfo: null,
    categories: [] // 存储分类数据
  }
})