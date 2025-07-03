// market.js - 修复版本：过滤已售出商品
const userManager = require('../../utils/userManager');
const itemManager = require('../../utils/itemManager');
const categoryConfig = require('../../utils/categoryConfig'); // 引入统一分类配置

Page({
  data: {
    userInfo: null,
    items: [],
    leftItems: [],
    rightItems: [],
    categories: [ ],
    currentCategory: 'all',
    // 交易类型筛选，默认显示卖的商品
    currentTradeType: 'sell', // 'sell' | 'buy'
    loading: false,
    refreshing: false,
    hasMore: true,
    currentPage: 1,
    searchKeyword: '',
    confirmKeyword: ''
  },

  onLoad() {
    console.log('闲置市场页面加载');
    this.setData({
      categories: categoryConfig.getMarketCategories()
    });
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

  // ===== 修复：添加状态筛选逻辑 =====
  // 过滤可展示的商品
  filterDisplayableItems(items) {
    if (!Array.isArray(items)) {
      return [];
    }
    
    return items.filter(item => {
      // 1. 按交易类型筛选
      if (item.tradeType !== this.data.currentTradeType) {
        return false;
      }
      
      // 2. 按状态筛选 - 只显示活跃状态的商品
      if (this.data.currentTradeType === 'sell') {
        // 卖品：只显示在售的，排除已售出、已下架的
        return item.status === 'selling';
      } else {
        // 求购：只显示求购中的，排除已买到、已下架的
        return item.status === 'seeking';
      }
    });
  },

  // 统一的加载方法 - 添加状态筛选
  async loadItems(refresh = false) {
    if (this.data.loading) return;
    
    this.setData({ loading: true });
    
    try {
      const page = refresh ? 1 : this.data.currentPage;
      const keyword = this.data.confirmKeyword.trim();
      const categoryId = this.data.currentCategory;
      
      console.log('加载参数:', { 
        page, 
        keyword, 
        categoryId, 
        tradeType: this.data.currentTradeType,
        refresh 
      });
      
      let result;
      
      if (keyword || categoryId !== 'all') {
        // 有搜索词或选择了特定分类，使用搜索方法
        const filters = {};
        if (categoryId !== 'all') {
          filters.categoryId = categoryId;
        }
        
        // 获取所有搜索结果
        let allResults = await itemManager.searchItems(keyword, filters);
        console.log('搜索原始结果数量:', allResults.length);
        
        // 应用筛选逻辑：交易类型 + 状态
        allResults = this.filterDisplayableItems(allResults);
        console.log('筛选后结果数量:', allResults.length);
        
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
        // 无搜索词且在"全部"分类，获取所有商品
        result = await itemManager.getItems(page, 10);
        console.log('获取原始商品数量:', result.items?.length || 0);
        
        // ✅ 应用筛选逻辑：交易类型 + 状态
        let filteredItems = this.filterDisplayableItems(result.items || []);
        console.log('筛选后商品数量:', filteredItems.length);
        
        const currentItems = refresh ? [] : (this.data.items || []);
        const items = refresh ? filteredItems : [...currentItems, ...filteredItems];
        
        result = {
          items: items,
          hasMore: result.hasMore && filteredItems.length > 0,
          total: filteredItems.length
        };
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
        显示商品数: result.items?.length || 0,
        交易类型: this.data.currentTradeType,
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
      confirmKeyword: ''
    });
    
    this.loadItems(true);
  },

  // 切换交易类型（卖/买）
  toggleTradeType() {
    const newTradeType = this.data.currentTradeType === 'sell' ? 'buy' : 'sell';
    console.log('切换交易类型:', this.data.currentTradeType, '->', newTradeType);
    
    this.setData({
      currentTradeType: newTradeType,
      items: [],
      leftItems: [],
      rightItems: [],
      currentPage: 1,
      hasMore: true
    });
    
    // 显示切换提示
    const statusText = newTradeType === 'sell' ? '在售商品' : '求购商品';
    wx.showToast({
      title: `切换到：${statusText}`,
      icon: 'none',
      duration: 1000
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
      wx.stopPullDownRefresh();
    }
  },
  
  // 触底加载更多
  onReachBottom() {
    console.log('=== 触底加载更多 ===');
    console.log('hasMore:', this.data.hasMore);
    console.log('loading:', this.data.loading);
    
    if (this.data.hasMore && !this.data.loading) {
      console.log('开始加载更多数据');
      this.loadItems(false);
    } else {
      console.log('不满足加载更多的条件');
      if (!this.data.hasMore) {
        wx.showToast({
          title: '没有更多商品了',
          icon: 'none',
          duration: 1000
        });
      }
    }
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value });
  },

  // 搜索确认
  async onSearch(e) {
    const keyword = e.detail.value || this.data.searchKeyword;
    
    console.log('搜索商品:', keyword, '交易类型:', this.data.currentTradeType);
    
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