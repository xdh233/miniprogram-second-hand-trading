// index.js - 完整版
const userManager = require('../../utils/userManager');

Page({
  data: {
    userInfo: null,
    notices: [
      '欢迎使用校园二手交易平台！',
      '请文明交易，诚信为本',
      '发现问题请及时举报',
      '支持同学们的创业项目'
    ],
    categories: [
      { id: 1, name: '数码电子', icon: '📱' },
      { id: 2, name: '生活用品', icon: '🏠' },
      { id: 3, name: '学习用品', icon: '📚' },
      { id: 4, name: '服装配饰', icon: '👕' },
      { id: 5, name: '运动器材', icon: '⚽' },
      { id: 6, name: '化妆护肤', icon: '💄' },
      { id: 7, name: '食品零食', icon: '🍿' },
      { id: 8, name: '其他商品', icon: '🎁' }
    ],
    latestItems: [
      // 模拟数据
      {
        id: 1,
        title: 'iPhone 13 Pro 95新',
        price: '4500',
        image: '/images/phone.jpg'
      },
      {
        id: 2,
        title: '护眼台灯 全新',
        price: '80',
        image: '/images/lamp.jpg'
      }
    ],
    hotItems: [
      // 模拟数据
      {
        id: 3,
        title: 'MacBook Air M1',
        price: '6800',
        image: '/images/laptop.jpg',
        likes: 15
      },
      {
        id: 4,
        title: '小米手环6',
        price: '180',
        image: '/images/band.jpg',
        likes: 8
      }
    ]
  },

  onLoad() {
    console.log('=== 首页加载 ===');
    this.checkLoginStatus();
  },

  onShow() {
    console.log('=== 首页显示 ===');
    this.checkLoginStatus();
    this.loadData();
  },

  // 检查登录状态
  checkLoginStatus() {
    console.log('检查登录状态...');
    
    try {
      const isLoggedIn = userManager.isLoggedIn();
      console.log('登录状态:', isLoggedIn);
      
      if (!isLoggedIn) {
        console.log('未登录，跳转到登录页');
        wx.redirectTo({
          url: '/pages/login/login'
        });
        return;
      }

      const userInfo = userManager.getCurrentUser();
      console.log('当前用户:', userInfo);
      
      if (userInfo) {
        this.setData({ userInfo });
      } else {
        console.log('用户信息为空，跳转登录页');
        wx.redirectTo({
          url: '/pages/login/login'
        });
      }
    } catch (error) {
      console.error('检查登录状态出错:', error);
    }
  },

  // 加载页面数据
  loadData() {
    // 这里可以调用API加载最新商品、热门商品等
    console.log('加载页面数据');
  },

  // 搜索功能
  onSearchInput(e) {
    const query = e.detail.value;
    console.log('搜索:', query);
    // TODO: 实现搜索功能
  },

  onSearchConfirm(e) {
    const query = e.detail.value;
    if (query.trim()) {
      wx.showToast({
        title: `搜索: ${query}`,
        icon: 'none'
      });
      // TODO: 跳转到搜索结果页
    }
  },

  // 快捷功能导航
  navigateToPublish() {
    wx.showToast({
      title: '发布功能开发中',
      icon: 'none'
    });
    // wx.navigateTo({
    //   url: '/pages/publish/publish'
    // });
  },

  navigateToMyItems() {
    wx.showToast({
      title: '我的发布开发中',
      icon: 'none'
    });
    // wx.navigateTo({
    //   url: '/pages/my-items/my-items'
    // });
  },

  navigateToFavorites() {
    wx.showToast({
      title: '收藏夹开发中',
      icon: 'none'
    });
    // wx.navigateTo({
    //   url: '/pages/favorites/favorites'
    // });
  },

  navigateToProfile() {
    wx.showToast({
      title: '个人中心开发中',
      icon: 'none'
    });
    // wx.navigateTo({
    //   url: '/pages/profile/profile'
    // });
  },

  // 分类导航
  navigateToCategory(e) {
    const categoryId = e.currentTarget.dataset.id;
    const categoryName = e.currentTarget.dataset.name;
    wx.showToast({
      title: `${categoryName}分类开发中`,
      icon: 'none'
    });
    // wx.navigateTo({
    //   url: `/pages/category/category?id=${categoryId}&name=${categoryName}`
    // });
  },

  // 商品详情
  navigateToDetail(e) {
    const itemId = e.currentTarget.dataset.id;
    wx.showToast({
      title: `商品${itemId}详情开发中`,
      icon: 'none'
    });
    // wx.navigateTo({
    //   url: `/pages/detail/detail?id=${itemId}`
    // });
  },

  // 更多商品
  navigateToAllItems() {
    wx.showToast({
      title: '商品列表开发中',
      icon: 'none'
    });
    // wx.navigateTo({
    //   url: '/pages/items/items'
    // });
  },

  navigateToHotItems() {
    wx.showToast({
      title: '热门商品开发中',
      icon: 'none'
    });
    // wx.navigateTo({
    //   url: '/pages/hot/hot'
    // });
  },

  // 下拉刷新
  onPullDownRefresh() {
    console.log('下拉刷新');
    this.loadData();
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          userManager.logout();
          wx.redirectTo({
            url: '/pages/login/login'
          });
        }
      }
    });
  },

  // 调试方法 - 开发完成后删除
  clearDataAndRestart() {
    wx.showModal({
      title: '清除数据',
      content: '确定要清除所有数据并重新开始吗？',
      success: (res) => {
        if (res.confirm) {
          userManager.debugClearAll();
          wx.reLaunch({
            url: '/pages/login/login'
          });
        }
      }
    });
  },

  // 手动检查登录状态
  manualCheckLogin() {
    this.checkLoginStatus();
  }
});