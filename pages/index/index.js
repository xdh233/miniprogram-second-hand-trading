// pages/index/index.js - 优化版
const userManager = require('../../utils/userManager');
const itemManager = require('../../utils/itemManager');
const messageManager = require('../../utils/messageManager');

Page({
  data: {
    userInfo: null,
    timeGreeting: '', // 时间问候语
    
    // 轮播图数据
    banners: [
      {
        id: 1,
        image: '/images/banner1.jpg',
        title: '开学季优惠',
        desc: '全场二手商品大促销',
        link: '/pages/market/market?category=1'
      },
      {
        id: 2,
        image: '/images/banner2.jpg',
        title: '图书专区',
        desc: '教材、小说、工具书应有尽有',
        link: '/pages/market/market?category=3'
      },
      {
        id: 3,
        image: '/images/banner3.jpg',
        title: '数码专区',
        desc: '手机、电脑、数码配件',
        link: '/pages/market/market?category=1'
      }
    ],
    currentBannerIndex: 0,
    
    // 公告数据
    notices: [
      '🎉 欢迎使用校园二手交易平台！',
      '📢 请文明交易，诚信为本',
      '⚠️ 发现问题请及时举报',
      '💡 支持同学们的创业项目'
    ],
    currentNoticeIndex: 0,
    
    // 分类数据
    categories: [
      { id: 1, name: '数码电子', icon: '📱', color: '#ff6b6b' },
      { id: 2, name: '生活用品', icon: '🏠', color: '#4ecdc4' },
      { id: 3, name: '学习用品', icon: '📚', color: '#45b7d1' },
      { id: 4, name: '服装配饰', icon: '👕', color: '#f9ca24' },
      { id: 5, name: '运动器材', icon: '⚽', color: '#6c5ce7' },
      { id: 6, name: '化妆护肤', icon: '💄', color: '#fd79a8' },
      { id: 7, name: '食品零食', icon: '🍿', color: '#fdcb6e' },
      { id: 8, name: '其他商品', icon: '🎁', color: '#a0a0a0' }
    ],
    
    // 商品数据
    latestItems: [],
    hotItems: [],
    recommendItems: [],
    
    // 状态数据
    loading: false,
    refreshing: false,
    stats: {
      totalItems: 0,
      totalUsers: 0,
      todayItems: 0
    },
    
    // 未读消息数
    unreadCount: 0,
    
    // 搜索相关
    searchKeyword: '',
    searchHistory: [],
    showSearchSuggestions: false
  },

  onLoad() {
    console.log('=== 首页加载 ===');
    this.checkLoginStatus();
    this.initPage();
  },

  onShow() {
    console.log('=== 首页显示 ===');
    this.checkLoginStatus();
    this.setTimeGreeting();
    this.refreshData();
    this.startAutoNotice();
  },

  onHide() {
    this.stopAutoNotice();
  },

  onUnload() {
    this.stopAutoNotice();
  },

  // 检查登录状态
  checkLoginStatus() {
    console.log('检查登录状态...');
    
    try {
      const isLoggedIn = userManager.isLoggedIn();
      console.log('登录状态:', isLoggedIn);
      
      if (!isLoggedIn) {
        console.log('未登录，跳转到登录页');
        wx.reLaunch({
          url: '/pages/login/login'
        });
        return;
      }

      const userInfo = userManager.getCurrentUser();
      console.log('当前用户:', userInfo);
      
      if (userInfo) {
        this.setData({ userInfo });
        this.loadUnreadCount();
      } else {
        console.log('用户信息为空，跳转登录页');
        wx.reLaunch({
          url: '/pages/login/login'
        });
      }
    } catch (error) {
      console.error('检查登录状态出错:', error);
    }
  },

  // 设置时间问候语
  setTimeGreeting() {
    const hour = new Date().getHours();
    let greeting = '';
    
    if (hour >= 6 && hour < 12) {
      greeting = '早上好';
    } else if (hour >= 12 && hour < 14) {
      greeting = '中午好';
    } else if (hour >= 14 && hour < 18) {
      greeting = '下午好';
    } else if (hour >= 18 && hour < 22) {
      greeting = '晚上好';
    } else {
      greeting = '夜深了';
    }
    
    this.setData({ timeGreeting: greeting });
  },

  // 初始化页面
  initPage() {
    this.loadSearchHistory();
    this.loadStats();
  },

  // 刷新数据
  async refreshData() {
    this.setData({ refreshing: true });
    
    try {
      await Promise.all([
        this.loadLatestItems(),
        this.loadHotItems(),
        this.loadRecommendItems(),
        this.loadStats()
      ]);
    } catch (error) {
      console.error('刷新数据失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ refreshing: false });
    }
  },

  // 加载最新商品
  async loadLatestItems() {
    try {
      const items = itemManager.getLatestItems(6);
      this.setData({ latestItems: items });
    } catch (error) {
      console.error('加载最新商品失败:', error);
    }
  },

  // 加载热门商品
  async loadHotItems() {
    try {
      const items = itemManager.getHotItems(4);
      this.setData({ hotItems: items });
    } catch (error) {
      console.error('加载热门商品失败:', error);
    }
  },

  // 加载推荐商品
  async loadRecommendItems() {
    try {
      // 这里可以根据用户喜好推荐商品
      const items = itemManager.searchItems('', {}).slice(0, 8);
      this.setData({ recommendItems: items });
    } catch (error) {
      console.error('加载推荐商品失败:', error);
    }
  },

  // 加载统计数据
  loadStats() {
    try {
      const allItems = itemManager.getAllItems();
      const allUsers = userManager.getAllUsers();
      const today = new Date().toDateString();
      const todayItems = allItems.filter(item => 
        new Date(item.publishTime).toDateString() === today
      );

      this.setData({
        stats: {
          totalItems: allItems.length,
          totalUsers: allUsers.length,
          todayItems: todayItems.length
        }
      });
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  },

  // 加载未读消息数
  loadUnreadCount() {
    try {
      const count = messageManager.getTotalUnreadCount(this.data.userInfo.id);
      this.setData({ unreadCount: count });
    } catch (error) {
      console.error('加载未读消息数失败:', error);
    }
  },

  // 加载搜索历史
  loadSearchHistory() {
    try {
      const history = wx.getStorageSync('search_history') || [];
      this.setData({ searchHistory: history.slice(0, 8) });
    } catch (error) {
      console.error('加载搜索历史失败:', error);
    }
  },

  // 轮播图切换
  onBannerChange(e) {
    this.setData({
      currentBannerIndex: e.detail.current
    });
  },

  // 点击轮播图
  onBannerTap(e) {
    const index = e.currentTarget.dataset.index;
    const banner = this.data.banners[index];
    
    if (banner.link) {
      wx.navigateTo({
        url: banner.link,
        fail: () => {
          wx.switchTab({
            url: banner.link
          });
        }
      });
    }
  },

  // 开始自动滚动公告
  startAutoNotice() {
    this.stopAutoNotice(); // 先停止之前的定时器
    
    this.noticeTimer = setInterval(() => {
      const { notices, currentNoticeIndex } = this.data;
      const nextIndex = (currentNoticeIndex + 1) % notices.length;
      this.setData({ currentNoticeIndex: nextIndex });
    }, 3000);
  },

  // 停止自动滚动公告
  stopAutoNotice() {
    if (this.noticeTimer) {
      clearInterval(this.noticeTimer);
      this.noticeTimer = null;
    }
  },

  // 搜索功能
  onSearchFocus() {
    this.setData({ showSearchSuggestions: true });
  },

  onSearchBlur() {
    // 延迟隐藏，让点击事件能够触发
    setTimeout(() => {
      this.setData({ showSearchSuggestions: false });
    }, 200);
  },

  onSearchInput(e) {
    const keyword = e.detail.value;
    this.setData({ searchKeyword: keyword });
    
    // 这里可以添加实时搜索建议的逻辑
  },

  onSearchConfirm() {
    const keyword = this.data.searchKeyword.trim();
    if (!keyword) return;
    
    this.saveSearchHistory(keyword);
    this.doSearch(keyword);
  },

  // 快速搜索
  onQuickSearch(e) {
    const keyword = e.currentTarget.dataset.keyword;
    this.setData({ searchKeyword: keyword });
    this.saveSearchHistory(keyword);
    this.doSearch(keyword);
  },

  // 执行搜索
  doSearch(keyword) {
    wx.navigateTo({
      url: `/pages/market/market?search=${encodeURIComponent(keyword)}`
    });
  },

  // 保存搜索历史
  saveSearchHistory(keyword) {
    try {
      let history = wx.getStorageSync('search_history') || [];
      
      // 去重
      history = history.filter(item => item !== keyword);
      
      // 添加到开头
      history.unshift(keyword);
      
      // 限制数量
      history = history.slice(0, 10);
      
      wx.setStorageSync('search_history', history);
      this.setData({ searchHistory: history.slice(0, 8) });
    } catch (error) {
      console.error('保存搜索历史失败:', error);
    }
  },

  // 清除搜索历史
  clearSearchHistory() {
    wx.showModal({
      title: '确认清除',
      content: '确定要清除所有搜索历史吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('search_history');
          this.setData({ searchHistory: [] });
          wx.showToast({
            title: '已清除',
            icon: 'success'
          });
        }
      }
    });
  },

  // 快捷功能导航
  navigateToPublish() {
    wx.switchTab({
      url: '/pages/publish/publish'
    });
  },

  navigateToMyItems() {
    wx.navigateTo({
      url: '/pages/profile/profile'
    });
  },

  navigateToFavorites() {
    wx.navigateTo({
      url: '/pages/market/market?tab=liked'
    });
  },

  navigateToProfile() {
    wx.switchTab({
      url: '/pages/profile/profile'
    });
  },

  navigateToMessages() {
    wx.switchTab({
      url: '/pages/message/message'
    });
  },

  // 分类导航
  navigateToCategory(e) {
    const category = e.currentTarget.dataset.category;
    wx.navigateTo({
      url: `/pages/market/market?categoryId=${category.id}&categoryName=${category.name}`
    });
  },

  // 商品详情
  navigateToDetail(e) {
    const itemId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/item-detail/item-detail?id=${itemId}`
    });
  },

  // 更多商品
  navigateToAllItems(e) {
    const type = e.currentTarget.dataset.type || 'all';
    let url = '/pages/market/market';
    
    if (type === 'latest') {
      url += '?sort=latest';
    } else if (type === 'hot') {
      url += '?sort=hot';
    }
    
    wx.switchTab({
      url: '/pages/market/market'
    });
  },

  // 下拉刷新
  async onPullDownRefresh() {
    console.log('下拉刷新');
    await this.refreshData();
    wx.stopPullDownRefresh();
  },

  // 触底加载更多（如果需要）
  onReachBottom() {
    console.log('触底加载更多');
    // 可以在这里加载更多推荐商品
  },

  // 页面分享
  onShareAppMessage() {
    return {
      title: '校园二手交易平台',
      desc: '让闲置物品重新发光，发现更多好货！',
      path: '/pages/index/index'
    };
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: '校园二手交易平台 - 让闲置物品重新发光'
    };
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
  },

  // 调试功能 - 生产环境应删除
  debugClearData() {
    wx.showModal({
      title: '清除数据',
      content: '确定要清除所有数据吗？这将删除所有商品、消息和用户数据！',
      success: (res) => {
        if (res.confirm) {
          userManager.debugClearAll();
          itemManager.debugClearAll();
          messageManager.debugClearAll();
          wx.reLaunch({
            url: '/pages/login/login'
          });
        }
      }
    });
  }
});