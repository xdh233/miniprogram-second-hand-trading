// market.js - 合并加载方法的版本
const userManager = require('../../utils/userManager');
const itemManager = require('../../utils/itemManager');

Page({
  data: {
    userInfo: null,
    items: [],
    leftItems: [],
    rightItems: [],
    categories: [
      { id: 'all', name: '全部' },
      { id: 1, name: '数码电子' },
      { id: 2, name: '生活用品' },
      { id: 3, name: '学习用品' },
      { id: 4, name: '服装配饰' },
      { id: 5, name: '运动器材' },
      { id: 6, name: '化妆护肤' },
      { id: 7, name: '书籍文具' },
      { id: 8, name: '家具家电' },
      { id: 9, name: '美食零食' },
      { id: 10, name: '手工艺品' },
      { id: 11, name: '其他' }
    ],
    currentCategory: 'all',
    loading: false,
    refreshing: false,
    hasMore: true,
    currentPage: 1,
    searchKeyword: '',
    confirmKeyword: ''
  },

  onLoad() {
    console.log('闲置市场页面加载');
    this.checkLoginStatus();
  },

  onShow() {
    console.log('闲置市场页面显示');
    this.checkLoginStatus();
    if(this.data.userInfo){
      this.loadItems(true);
    }
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
      } else {
        console.log('用户信息为空，跳转登录页');
        wx.reLaunch({
          url: '/pages/login/login'
        });
      }
    } catch (error) {
      console.error('检查登录状态出错:', error);
      wx.reLaunch({
        url: '/pages/login/login'
      });
    }
  },

  // 统一的加载方法 - 支持分页、搜索、分类筛选
  async loadItems(refresh = false) {
    if (this.data.loading) return;  //已经处于加载中 返回 防止重复
    
    this.setData({ loading: true });
    
    try {
      const page = refresh ? 1 : this.data.currentPage; // 刷新 / 追加
      const keyword = this.data.confirmKeyword.trim();  // 搜索的加载
      const categoryId = this.data.currentCategory;     // 分类的加载
      
      console.log('加载参数:', { page, keyword, categoryId, refresh });
      
      let result;
      
      if (keyword || categoryId !== 'all') {
        // 有搜索词或选择了特定分类，使用搜索方法
        const filters = {};
        if (categoryId !== 'all') {
          filters.categoryId = categoryId;
        }
        
        // 获取所有筛选结果，然后手动分页
        const allResults = await itemManager.searchItems(keyword, filters);
        
        // 手动实现分页
        const pageSize = 10;
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        
        const currentItems = refresh ? [] : (this.data.items || []);
        const newItems = allResults.slice(startIndex, endIndex);
        const items = refresh ? newItems : [...currentItems, ...newItems];
        
        result = {
          items: items,
          hasMore: endIndex < allResults.length,
          total: allResults.length
        };
        
      } else {
        // 无搜索词且在"全部"分类，使用正常分页加载
        result = await itemManager.getItems(page, 10);
        const currentItems = refresh ? [] : (this.data.items || []);
        const items = [...currentItems, ...(result.items || [])];
        result.items = items;
      }
      
      // 更新显示
      const { leftItems, rightItems } = this.distributeItems(result.items || []);

      this.setData({
        items: result.items || [],
        leftItems: leftItems,
        rightItems: rightItems,
        hasMore: result.hasMore || false,
        currentPage: refresh ? 2 : page + 1,
        loading: false,
        ...(refresh && { refreshing: false })
      });
      
      console.log('加载完成:', {
        itemsCount: result.items?.length || 0,
        hasMore: result.hasMore,
        currentPage: this.data.currentPage
      });
      
    } catch (error) {
      console.error('加载商品失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
      this.setData({ 
        loading: false, 
        refreshing: false 
      });
    }
  },
 
  // 分配商品到左右两列的辅助函数
  distributeItems(items) {
    const leftItems = [];
    const rightItems = [];
    
    if (!Array.isArray(items)) {
      return { leftItems, rightItems };
    }
    
    items.forEach((item, index) => {
      if (index % 2 === 0) {
        leftItems.push(item);
      } else {
        rightItems.push(item);
      }
    });
    
    return { leftItems, rightItems };
  },

  // 切换分类 
  switchCategory(e) {
    const categoryId = e.currentTarget.dataset.id;
    console.log('切换分类:', categoryId);
    
    this.setData({
      currentCategory: categoryId,
      items: [],
      leftItems: [],
      rightItems: [],
      currentPage: 1,
      hasMore: true,
      searchKeyword: '', // 切换分类时清空搜索
      confirmKeyword:''
    });
    
    this.loadItems(true);
  },

  // 下拉刷新 
  async onPullDownRefresh() {
    console.log('下拉刷新');
    this.setData({ refreshing: true });
    
    try {
      // 重置状态并刷新
      this.setData({
        currentPage: 1,
        hasMore: true
      });
      
      await this.loadItems(true);
    } catch (error) {
      console.error('刷新失败:', error);
      wx.showToast({
        title: '刷新失败',
        icon: 'error'
      });
    } finally {
      this.setData({ refreshing: false });
    }
  },
  
  // 触底加载更多 - 简化版本
  onReachBottom() {
    console.log('=== 触底加载更多 ===');
    console.log('hasMore:', this.data.hasMore);
    console.log('loading:', this.data.loading);
    
    if (this.data.hasMore && !this.data.loading) {
      console.log('开始加载更多数据');
      this.loadItems(false);
    } else {
      console.log('不满足加载更多的条件');
    }
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value });
  },

  // 搜索  确认
  async onSearch(e) {
    const keyword = e.detail.value || this.data.searchKeyword;
    
    console.log('搜索商品:', keyword);
    try {
      const results = await itemManager.searchItems(keyword);
      
      this.setData({
        items: results,
        hasMore: false,
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
    // 重置分页状态
    this.setData({
      searchKeyword: keyword.trim(),
      confirmKeyword: keyword.trim(),
      currentPage: 1,
      hasMore: true,
      items: [],
      leftItems: [],
      rightItems: [],
    });
    
    await this.loadItems(true);
  },

  // 跳转到商品详情
  navigateToItemDetail(e) {
    const itemId = e.currentTarget.dataset.id;
    console.log('查看商品详情:', itemId);
    wx.navigateTo({
      url: `/pages/item-detail/item-detail?id=${itemId}`
    });
  }
});