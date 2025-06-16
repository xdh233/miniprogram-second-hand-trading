// market.js - 闲置市场页面
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
    
    // 加载商品数据
    this.loadItemsWithFallback();
  },

  // 加载商品数据，带回退机制
  loadItemsWithFallback() {
    // 暂时直接使用测试数据，方便测试上拉加载功能
    this.addTestData();
    
    /* 
    // 真实环境下使用这段代码
    try {
      // 首先尝试从itemManager获取数据
      const items = itemManager.getAllItems();
      
      // 如果只有很少的商品（少于5个），使用我们的测试数据
      if (items.length < 5) {
        console.log('商品数量较少，使用扩展测试数据');
        this.addTestData();
        return;
      }
      
      // 如果有足够的真实数据，使用真实数据
      const processedItems = items.map(item => ({
        ...item,
        tradeType: item.tradeType || 'sell',
        sellerName: item.sellerName || '用户' + item.sellerId,
        sellerAvatar: item.sellerAvatar || '/images/default-avatar.png'
      }));
      
      const { leftItems, rightItems } = this.distributeItems(processedItems);
      
      this.setData({
        items: processedItems,
        leftItems: leftItems,
        rightItems: rightItems
      });
      
    } catch (error) {
      console.error('加载商品数据失败:', error);
      // 出错时使用测试数据
      this.addTestData();
    }
    */
  },

  // 分配商品到左右两列的辅助函数
  distributeItems(items) {
    const leftItems = [];
    const rightItems = [];
    
    items.forEach((item, index) => {
      if (index % 2 === 0) {
        leftItems.push(item);
      } else {
        rightItems.push(item);
      }
    });
    
    return { leftItems, rightItems };
  },

  // 添加测试数据
  addTestData() {
    const testItems = [
      {
        id: 1,
        title: '护眼台灯 全新未拆封',
        price: 80,
        images: ['/images/placeholder.png'],
        sellerName: '李四',
        sellerAvatar: '/images/default-avatar.png',
        tradeType: 'sell',
        status: 'available'
      },
      {
        id: 2,
        title: 'iPhone 13 Pro 128GB 深空灰色',
        price: 4500,
        images: ['/images/placeholder.png'],
        sellerName: '张三',
        sellerAvatar: '/images/default-avatar.png',
        tradeType: 'sell',
        status: 'available'
      },
      {
        id: 3,
        title: '小米笔记本电脑 Air 13.3',
        price: 3200,
        images: ['/images/placeholder.png'],
        sellerName: '王五',
        sellerAvatar: '/images/default-avatar.png',
        tradeType: 'sell',
        status: 'available'
      },
      {
        id: 4,
        title: '索尼耳机 WH-1000XM4',
        price: 1800,
        images: ['/images/placeholder.png'],
        sellerName: '赵六',
        sellerAvatar: '/images/default-avatar.png',
        tradeType: 'sell',
        status: 'available'
      },
      {
        id: 5,
        title: 'iPad Air 第四代 64GB',
        price: 3800,
        images: ['/images/placeholder.png'],
        sellerName: '钱七',
        sellerAvatar: '/images/default-avatar.png',
        tradeType: 'sell',
        status: 'available'
      },
      {
        id: 6,
        title: '戴森吹风机 HD08',
        price: 2200,
        images: ['/images/placeholder.png'],
        sellerName: '孙八',
        sellerAvatar: '/images/default-avatar.png',
        tradeType: 'sell',
        status: 'available'
      },
      {
        id: 7,
        title: '机械键盘 Cherry MX',
        price: 680,
        images: ['/images/placeholder.png'],
        sellerName: '周九',
        sellerAvatar: '/images/default-avatar.png',
        tradeType: 'sell',
        status: 'available'
      },
      {
        id: 8,
        title: 'AirPods Pro 二代',
        price: 1600,
        images: ['/images/placeholder.png'],
        sellerName: '吴十',
        sellerAvatar: '/images/default-avatar.png',
        tradeType: 'sell',
        status: 'available'
      }
    ];
    
    const { leftItems, rightItems } = this.distributeItems(testItems);
    
    console.log('测试数据分配结果：');
    console.log('左列商品：', leftItems.map(item => item.title));
    console.log('右列商品：', rightItems.map(item => item.title));
    
    this.setData({
      items: testItems,
      leftItems: leftItems,
      rightItems: rightItems
    });
  },

  // 检查登录状态
  checkLoginStatus() {
    // 暂时跳过登录检查，专注于调试双列布局
    const mockUserInfo = {
      id: 'test_user',
      username: '测试用户'
    };
    this.setData({ userInfo: mockUserInfo });
    
    /* 原来的登录检查代码
    if (!userManager.isLoggedIn()) {
      wx.redirectTo({
        url: '/pages/login/login'
      });
      return;
    }

    const userInfo = userManager.getCurrentUser();
    this.setData({ userInfo });
    */
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
      
      // 使用辅助函数分配到左右两列
      const { leftItems, rightItems } = this.distributeItems(items);
      
      console.log('左列商品数:', leftItems.length, '右列商品数:', rightItems.length);
      
      this.setData({
        items: items,
        leftItems: leftItems,
        rightItems: rightItems,
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
      leftItems: [],
      rightItems: [],
      currentPage: 1,
      hasMore: true
    });
    
    // 根据分类加载数据
    if (categoryId === 'all') {
      // 显示所有测试数据
      this.addTestData();
    } else {
      // 显示分类数据，这里先用测试数据模拟
      this.loadCategoryData(categoryId);
    }
  },

  // 加载分类数据
  loadCategoryData(categoryId) {
    // 根据分类ID筛选测试数据
    const allTestItems = [
      {
        id: 1,
        title: '护眼台灯 全新未拆封',
        price: 80,
        images: ['/images/placeholder.png'],
        sellerName: '李四',
        sellerAvatar: '/images/default-avatar.png',
        tradeType: 'sell',
        status: 'available',
        categoryId: 2
      },
      {
        id: 2,
        title: 'iPhone 13 Pro 128GB 深空灰色',
        price: 4500,
        images: ['/images/placeholder.png'],
        sellerName: '张三',
        sellerAvatar: '/images/default-avatar.png',
        tradeType: 'sell',
        status: 'available',
        categoryId: 1
      },
      {
        id: 3,
        title: '小米笔记本电脑 Air 13.3',
        price: 3200,
        images: ['/images/placeholder.png'],
        sellerName: '王五',
        sellerAvatar: '/images/default-avatar.png',
        tradeType: 'sell',
        status: 'available',
        categoryId: 1
      },
      {
        id: 4,
        title: '索尼耳机 WH-1000XM4',
        price: 1800,
        images: ['/images/placeholder.png'],
        sellerName: '赵六',
        sellerAvatar: '/images/default-avatar.png',
        tradeType: 'sell',
        status: 'available',
        categoryId: 1
      },
      {
        id: 5,
        title: 'iPad Air 第四代 64GB',
        price: 3800,
        images: ['/images/placeholder.png'],
        sellerName: '钱七',
        sellerAvatar: '/images/default-avatar.png',
        tradeType: 'sell',
        status: 'available',
        categoryId: 1
      },
      {
        id: 6,
        title: '戴森吹风机 HD08',
        price: 2200,
        images: ['/images/placeholder.png'],
        sellerName: '孙八',
        sellerAvatar: '/images/default-avatar.png',
        tradeType: 'sell',
        status: 'available',
        categoryId: 2
      },
      {
        id: 7,
        title: '机械键盘 Cherry MX',
        price: 680,
        images: ['/images/placeholder.png'],
        sellerName: '周九',
        sellerAvatar: '/images/default-avatar.png',
        tradeType: 'sell',
        status: 'available',
        categoryId: 1
      },
      {
        id: 8,
        title: 'AirPods Pro 二代',
        price: 1600,
        images: ['/images/placeholder.png'],
        sellerName: '吴十',
        sellerAvatar: '/images/default-avatar.png',
        tradeType: 'sell',
        status: 'available',
        categoryId: 1
      },
      {
        id: 9,
        title: '任天堂Switch OLED版',
        price: 2800,
        images: ['/images/placeholder.png'],
        sellerName: '郑十一',
        sellerAvatar: '/images/default-avatar.png',
        tradeType: 'sell',
        status: 'available',
        categoryId: 1
      },
      {
        id: 10,
        title: 'MacBook Air M2 8GB',
        price: 8500,
        images: ['/images/placeholder.png'],
        sellerName: '王十二',
        sellerAvatar: '/images/default-avatar.png',
        tradeType: 'sell',
        status: 'available',
        categoryId: 1
      }
    ];

    // 根据分类筛选商品
    const filteredItems = allTestItems.filter(item => item.categoryId === categoryId);
    const { leftItems, rightItems } = this.distributeItems(filteredItems);
    
    this.setData({
      items: filteredItems,
      leftItems: leftItems,
      rightItems: rightItems,
      hasMore: false
    });
  },

  // 下拉刷新
  onRefresh() {
    console.log('下拉刷新');
    this.setData({ refreshing: true });
    
    // 重新加载测试数据，而不是调用loadItems
    setTimeout(() => {
      this.addTestData();
      this.setData({ refreshing: false });
    }, 1000);
  },

  // 暂时禁用上拉加载更多
  loadMore() {
    // 功能暂时关闭
    return;
    
    /* 原来的上拉加载代码
    if (!this.data.hasMore || this.data.refreshing) {
      return;
    }

    console.log('加载更多商品');
    
    // 显示加载状态
    wx.showNavigationBarLoading();
    
    // 模拟加载延迟
    setTimeout(() => {
      try {
        // 如果有测试数据，从测试数据中加载更多
        if (this.data.allTestItems) {
          const currentLength = this.data.items.length;
          const nextItems = this.data.allTestItems.slice(currentLength, currentLength + 4);
          
          if (nextItems.length > 0) {
            const newItems = [...this.data.items, ...nextItems];
            const { leftItems, rightItems } = this.distributeItems(newItems);
            
            this.setData({
              items: newItems,
              leftItems: leftItems,
              rightItems: rightItems,
              hasMore: newItems.length < this.data.allTestItems.length
            });
            
            wx.showToast({
              title: `加载了${nextItems.length}个商品`,
              icon: 'success',
              duration: 1500
            });
          } else {
            this.setData({ hasMore: false });
            wx.showToast({
              title: '没有更多商品了',
              icon: 'none'
            });
          }
        } else {
          // 真实环境中，这里应该调用API加载更多数据
          this.loadItems(false);
        }
      } catch (error) {
        console.error('加载更多失败:', error);
        wx.showToast({
          title: '加载失败，请重试',
          icon: 'error'
        });
      } finally {
        wx.hideNavigationBarLoading();
      }
    }, 800); // 模拟网络延迟
    */
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
        leftItems: [],
        rightItems: [],
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
      
      // 使用辅助函数分配到左右两列
      const { leftItems, rightItems } = this.distributeItems(results);
      
      this.setData({
        items: results,
        leftItems: leftItems,
        rightItems: rightItems,
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
      
      // 使用辅助函数重新分配到左右两列
      const { leftItems, rightItems } = this.distributeItems(items);
      
      this.setData({ 
        items: items,
        leftItems: leftItems,
        rightItems: rightItems
      });
      
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