// market.js - 闲置市场页面
const userManager = require('../../utils/userManager');
const itemManager = require('../../utils/itemManager');

Page({
  data: {
    userInfo: null,
    items: [],
    categories: [
      { id: 'all', name: '全部' },
      { id: '数码电子', name: '数码电子' },
      { id: '学习用品', name: '学习用品' },
      { id: '生活用品', name: '生活用品' },
      { id: '服装配饰', name: '服装配饰' },
      { id: '运动器材', name: '运动器材' },
      { id: '化妆护肤', name: '化妆护肤' },
      { id: '其他', name: '其他' }
    ],
    currentCategory: 'all',
    refreshing: false,
    hasMore: true,
    currentPage: 1,
    searchKeyword: ''
  },

  onLoad() {
    console.log('闲置市场页面加载');
    this.checkLoginStatus();
  },

  onShow() {
    console.log('闲置市场页面显示');
    this.checkLoginStatus();
    if (this.data.userInfo) {
      this.loadItems(true); // 刷新商品
    }
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

  // 加载商品列表
  async loadItems(refresh = false) {
    try {
      const page = refresh ? 1 : this.data.currentPage;
      console.log('加载商品，页码:', page, '分类:', this.data.currentCategory);
      
      const result = await itemManager.getItems({
        page: page,
        limit: 10,
        category: this.data.currentCategory,
        status: 'available'
      });
      
      let items = refresh ? result.items : [...this.data.items, ...result.items];
      
      this.setData({
        items: items,
        hasMore: result.hasMore,
        currentPage: refresh ? 2 : page + 1,
        refreshing: false
      });
      
    } catch (error) {
      console.error('加载商品失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
      this.setData({ refreshing: false });
    }
  },

  // 切换分类
  switchCategory(e) {
    const categoryId = e.currentTarget.dataset.id;
    console.log('切换分类:', categoryId);
    
    this.setData({
      currentCategory: categoryId,
      items: [],
      currentPage: 1,
      hasMore: true
    });
    
    this.loadItems(true);
  },

  // 下拉刷新
  onRefresh() {
    console.log('下拉刷新');
    this.setData({ refreshing: true });
    this.loadItems(true);
  },

  // 上拉加载更多
  loadMore() {
    console.log('上拉加载更多');
    if (this.data.hasMore) {
      this.loadItems(false);
    }
  },

  // 搜索输入
  onSearchInput(e) {
    const keyword = e.detail.value;
    this.setData({ searchKeyword: keyword });
  },

  // 执行搜索
  async onSearch(e) {
    const keyword = e.detail.value || this.data.searchKeyword;
    if (!keyword.trim()) {
      return;
    }
    
    console.log('搜索商品:', keyword);
    
    try {
      const results = await itemManager.searchItems(keyword);
      this.setData({
        items: results,
        hasMore: false,
        currentCategory: 'all'
      });
      
      if (results.length === 0) {
        wx.showToast({
          title: '没有找到相关商品',
          icon: 'none'
        });
      }
      
    } catch (error) {
      wx.showToast({
        title: '搜索失败',
        icon: 'error'
      });
    }
  },

  // 跳转到商品详情
  navigateToItemDetail(e) {
    const itemId = e.currentTarget.dataset.id;
    console.log('查看商品详情:', itemId);
    wx.showToast({
      title: '商品详情开发中',
      icon: 'none'
    });
    // wx.navigateTo({
    //   url: `/pages/item-detail/item-detail?id=${itemId}`
    // });
  },

  // 收藏商品
  async toggleLike(e) {
    const itemId = e.currentTarget.dataset.id;
    console.log('收藏商品:', itemId);
    
    try {
      const result = await itemManager.toggleLike(itemId);
      
      // 更新页面数据
      const items = this.data.items.map(item => {
        if (item.id === itemId) {
          return {
            ...item,
            isLiked: result.isLiked,
            likes: result.likes
          };
        }
        return item;
      });
      
      this.setData({ items });
      
      wx.showToast({
        title: result.isLiked ? '已收藏' : '已取消收藏',
        icon: 'success'
      });
      
    } catch (error) {
      wx.showToast({
        title: error.message || '操作失败',
        icon: 'error'
      });
    }
  }
});