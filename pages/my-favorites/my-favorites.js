// pages/my-favorites/my-favorites.js
const userManager = require('../../utils/userManager');
const itemManager = require('../../utils/itemManager');

Page({
  data: {
    currentUser: null,
    favoriteItems: [],
    loading: true,
    error: null,
    
    // 类型筛选
    activeType: 'all', // 'all', 'sell', 'buy'
    typeOptions: [
      { key: 'all', label: '全部', count: 0 },
      { key: 'sell', label: '在卖', count: 0 },
      { key: 'buy', label: '想收', count: 0 }
    ],
    
    // 筛选后的商品列表
    filteredItems: []
  },

  onLoad() {
    console.log('我的收藏页面加载');
    this.initPage();
  },

  onShow() {
    // 每次显示页面时刷新数据
    this.loadFavoriteItems();
  },

  // 初始化页面
  initPage() {
    const currentUser = userManager.getCurrentUser();
    
    if (!currentUser) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }

    this.setData({ currentUser });
    this.loadFavoriteItems();
  },

  // 加载我收藏的商品
  async loadFavoriteItems() {
    try {
      this.setData({ loading: true, error: null });
      
      let favoriteItems = [];
      
      // 从商品管理器获取我收藏的商品数据
      if (typeof itemManager !== 'undefined' && itemManager.getUserFavorites) {
        favoriteItems = itemManager.getUserFavorites(this.data.currentUser.id);
      } else if (typeof itemManager !== 'undefined' && itemManager.getAllItems) {
        // 如果没有专门的方法，从所有商品中筛选我收藏的
        const allItems = itemManager.getAllItems();
        favoriteItems = allItems.filter(item => {
          return item.favoriteUsers && item.favoriteUsers.includes(this.data.currentUser.id);
        });
      } else {
        console.log("没有收藏数据");
        // 模拟一些测试数据
        favoriteItems = this.generateMockData();
      }
      
      // 处理和标准化数据
      favoriteItems = favoriteItems.map(item => {
        return {
          ...item,
          // 确保有必要的字段
          tradeType: item.tradeType || 'sell', // 默认为卖
          authorName: item.authorName || item.sellerName || item.sellerNickname || '用户',
          authorAvatar: item.authorAvatar || item.sellerAvatar || '/images/default-avatar.png',
          favoriteTime: item.favoriteTime || new Date().toISOString().split('T')[0],
          viewCount: item.viewCount || 0,
          likeCount: item.likeCount || 0,
          // 根据交易类型设置显示文本
          tradeTypeText: item.tradeType === 'sell' ? '在卖' : '想收',
          actionText: item.tradeType === 'sell' ? '联系卖家' : '联系收家'
        };
      });
      
      // 统计各类型数量
      this.updateTypeCounts(favoriteItems);
      
      this.setData({
        favoriteItems: favoriteItems,
        loading: false
      });
      
      // 应用当前筛选
      this.filterItems();
      
    } catch (error) {
      console.error('加载收藏失败:', error);
      this.setData({
        error: '加载失败，请重试',
        loading: false
      });
    }
  },

  // 生成模拟数据（用于测试）
  generateMockData() {
    return [
      {
        id: 'fav_1',
        title: 'MacBook Pro 13寸 2021款',
        description: '9成新，性能优秀，适合学习和办公使用',
        price: 8800,
        images: ['/images/macbook.jpg'],
        tradeType: 'sell',
        authorName: '小明',
        authorAvatar: '/images/avatar1.jpg',
        favoriteTime: '2025-06-28',
        viewCount: 128,
        likeCount: 15,
        contactInfo: 'wx: xiaoming123'
      },
      {
        id: 'fav_2',
        title: '求购：iPad Pro 11寸',
        description: '想买一台iPad Pro用来画画，要求9成新以上，配件齐全',
        price: 4500,
        images: ['/images/ipad.jpg'],
        tradeType: 'buy',
        authorName: '小红',
        authorAvatar: '/images/avatar2.jpg',
        favoriteTime: '2025-06-29',
        viewCount: 89,
        likeCount: 8,
        contactInfo: 'qq: 1234567'
      },
      {
        id: 'fav_3',
        title: '全新耐克运动鞋',
        description: 'Air Max 270，41码，全新未穿，因为买错尺码转让',
        price: 450,
        images: ['/images/shoes.jpg'],
        tradeType: 'sell',
        authorName: '小李',
        authorAvatar: '/images/avatar3.jpg',
        favoriteTime: '2025-06-27',
        viewCount: 56,
        likeCount: 12,
        contactInfo: 'tel: 138xxxx1234'
      }
    ];
  },

  // 更新类型统计
  updateTypeCounts(items) {
    const counts = {
      all: items.length,
      sell: items.filter(item => item.tradeType === 'sell').length,
      buy: items.filter(item => item.tradeType === 'buy').length
    };
    
    const typeOptions = this.data.typeOptions.map(option => ({
      ...option,
      count: counts[option.key]
    }));
    
    this.setData({ typeOptions });
  },

  // 筛选商品
  filterItems() {
    const { favoriteItems, activeType } = this.data;
    let filteredItems = favoriteItems;
    
    if (activeType !== 'all') {
      filteredItems = favoriteItems.filter(item => item.tradeType === activeType);
    }
    
    this.setData({ filteredItems });
  },

  // 切换类型筛选
  switchType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ activeType: type });
    this.filterItems();
  },

  // 点击商品
  onItemTap(e) {
    const itemId = e.currentTarget.dataset.itemId;
    wx.navigateTo({
      url: `/pages/item-detail/item-detail?id=${itemId}`
    });
  },

  // 联系发布者
  contactAuthor(e) {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    const itemId = e.currentTarget.dataset.itemId;
    const item = this.data.favoriteItems.find(item => item.id === itemId);
    
    if (item.contactInfo) {
      wx.setClipboardData({
        data: item.contactInfo,
        success: () => {
          wx.showToast({
            title: '联系方式已复制',
            icon: 'success'
          });
        }
      });
    } else {
      // 跳转到私聊页面
      const authorId = item.authorId || item.sellerId;
      if (authorId) {
        wx.navigateTo({
          url: `/pages/chat/chat?userId=${authorId}&userName=${item.authorName}`
        });
      } else {
        wx.showToast({
          title: '暂无联系方式',
          icon: 'none'
        });
      }
    }
  },

  // 取消收藏
  unfavoriteItem(e) {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    const itemId = e.currentTarget.dataset.itemId;
    const item = this.data.favoriteItems.find(item => item.id === itemId);
    
    wx.showModal({
      title: '取消收藏',
      content: `确定要取消收藏"${item.title}"吗？`,
      success: (res) => {
        if (res.confirm) {
          this.performUnfavorite(itemId);
        }
      }
    });
  },

  // 执行取消收藏
  async performUnfavorite(itemId) {
    try {
      // 这里调用商品管理器的取消收藏方法
      if (typeof itemManager !== 'undefined' && itemManager.unfavoriteItem) {
        await itemManager.unfavoriteItem(itemId, this.data.currentUser.id);
      } else {
        // 模拟取消收藏
        const favoriteItems = this.data.favoriteItems.filter(item => item.id !== itemId);
        this.setData({ favoriteItems });
        this.updateTypeCounts(favoriteItems);
        this.filterItems();
      }
      
      wx.showToast({
        title: '已取消收藏',
        icon: 'success'
      });
      
      // 重新加载数据
      this.loadFavoriteItems();
      
    } catch (error) {
      wx.showToast({
        title: error.message || '操作失败',
        icon: 'none'
      });
    }
  },

  // 分享商品
  shareItem(e) {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    const itemId = e.currentTarget.dataset.itemId;
    const item = this.data.favoriteItems.find(item => item.id === itemId);
    
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });
    
    // 设置当前分享的商品
    this.currentShareItem = item;
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadFavoriteItems().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 分享
  onShareAppMessage() {
    if (this.currentShareItem) {
      const item = this.currentShareItem;
      return {
        title: `${item.tradeType === 'sell' ? '推荐好物' : '求购信息'}：${item.title}`,
        path: `/pages/item-detail/item-detail?id=${item.id}`,
        imageUrl: item.images && item.images[0]
      };
    }
    
    return {
      title: '我的收藏 - 校园二手市场',
      path: '/pages/index/index'
    };
  }
});