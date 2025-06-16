// market.js - 闲置市场页面
const userManager = require('../../utils/userManager');
const itemManager = require('../../utils/itemManager');

Page({
  data: {
    userInfo: null,
    items: [],
    categories: [
      { id: 'all', name: '全部' },
      { id: 1, name: '数码电子' },
      { id: 2, name: '生活用品' },
      { id: 3, name: '学习用品' },
      { id: 4, name: '服装配饰' },
      { id: 5, name: '运动器材' },
      { id: 6, name: '化妆护肤' },
      { id: 7, name: '其他' }
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
  loadItems(refresh = false) {
    try {
      const page = refresh ? 1 : this.data.currentPage;
      console.log('加载商品，页码:', page, '分类:', this.data.currentCategory);
      
      // 构建筛选条件
      const filters = {};
      if (this.data.currentCategory !== 'all') {
        filters.categoryId = this.data.currentCategory;
      }
      
      // 使用 searchItems 方法获取所有符合条件的商品
      let allItems = itemManager.searchItems('', filters);
      
      // 为每个商品添加交易类型标识（卖/收）
      allItems = allItems.map(item => ({
        ...item,
        tradeType: item.tradeType || 'sell', // 默认为出售
        sellerName: item.sellerName || '用户' + item.sellerId,
        sellerAvatar: item.sellerAvatar || '/images/default-avatar.png'
      }));
      
      console.log('获取到商品总数:', allItems.length);
      
      // 手动实现分页
      const pageSize = 10;
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedItems = allItems.slice(startIndex, endIndex);
      
      // 处理数据
      let items = refresh ? paginatedItems : [...this.data.items, ...paginatedItems];
      
      this.setData({
        items: items,
        hasMore: endIndex < allItems.length,
        currentPage: refresh ? 2 : page + 1,
        refreshing: false
      });
      
      console.log('当前显示商品数:', items.length);
      
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
    if (this.data.hasMore && !this.data.refreshing) {
      this.loadItems(false);
    }
  },

  // 搜索输入
  onSearchInput(e) {
    const keyword = e.detail.value;
    this.setData({ searchKeyword: keyword });
  },

  // 执行搜索
  onSearch(e) {
    const keyword = e.detail.value || this.data.searchKeyword;
    if (!keyword.trim()) {
      // 如果搜索为空，重新加载所有商品
      this.setData({
        items: [],
        currentPage: 1,
        hasMore: true,
        currentCategory: 'all'
      });
      this.loadItems(true);
      return;
    }
    
    console.log('搜索商品:', keyword);
    
    try {
      let results = itemManager.searchItems(keyword);
      
      // 为搜索结果添加交易类型标识
      results = results.map(item => ({
        ...item,
        tradeType: item.tradeType || 'sell',
        sellerName: item.sellerName || '用户' + item.sellerId,
        sellerAvatar: item.sellerAvatar || '/images/default-avatar.png'
      }));
      
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
    wx.navigateTo({
      url: `/pages/item-detail/item-detail?id=${itemId}`
    });
  },

  // 收藏商品
  toggleLike(e) {
    e.stopPropagation(); // 阻止事件冒泡
    const itemId = e.currentTarget.dataset.id;
    const userId = this.data.userInfo.id;
    console.log('收藏商品:', itemId);
    
    try {
      const isLiked = itemManager.toggleLike(itemId, userId);
      
      // 更新页面数据
      const items = this.data.items.map(item => {
        if (item.id === itemId) {
          return {
            ...item,
            likeCount: (item.likeCount || 0) + (isLiked ? 1 : -1),
            isLiked: isLiked
          };
        }
        return item;
      });
      
      this.setData({ items });
      
      wx.showToast({
        title: isLiked ? '已收藏' : '已取消收藏',
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