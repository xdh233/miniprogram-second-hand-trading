// pages/my-bought-items/my-bought-items.js
const userManager = require('../../utils/userManager');
const itemManager = require('../../utils/itemManager');

Page({
  data: {
    currentUser: null,
    boughtItems: [],
    loading: true,
    error: null,
    
    // 状态筛选
    activeStatus: 'all', // 'all', 'pending', 'completed'
    statusOptions: [
      { key: 'all', label: '全部', count: 0 },
      { key: 'pending', label: '待确认', count: 0 },
      { key: 'completed', label: '已完成', count: 0 }
    ],
    
    // 筛选后的商品列表
    filteredItems: []
  },

  onLoad() {
    console.log('我买到的页面加载');
    this.initPage();
  },

  onShow() {
    // 每次显示页面时刷新数据
    this.loadBoughtItems();
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
    this.loadBoughtItems();
  },

  // 加载我购买的商品
  async loadBoughtItems() {
    try {
      this.setData({ loading: true, error: null });
      
      let boughtItems = [];
      
      // 从商品管理器获取我购买的商品数据
      if (typeof itemManager !== 'undefined' && itemManager.getUserBoughtItems) {
        boughtItems = itemManager.getUserBoughtItems(this.data.currentUser.id);
      } else if (typeof itemManager !== 'undefined' && itemManager.getAllItems) {
        // 如果没有专门的方法，从所有商品中筛选我购买的
        const allItems = itemManager.getAllItems();
        boughtItems = allItems.filter(item => item.buyerId === this.data.currentUser.id);
      } else {
        console.log("没有购买数据");
        // 模拟一些测试数据
        boughtItems = this.generateMockData();
      }
      
      // 转换和标准化数据
      boughtItems = boughtItems.map(item => {
        let status = '待确认'; // 默认状态
        if (item.purchaseStatus === 'pending') {
          status = '待确认';
        } else if (item.purchaseStatus === 'completed') {
          status = '已完成';
        } else if (item.status === 'sold' && item.buyerId === this.data.currentUser.id) {
          status = '已完成';
        }
        
        return {
          ...item,
          purchaseStatus: status,
          // 确保有必要的字段
          buyerId: item.buyerId || this.data.currentUser.id,
          sellerName: item.sellerName || item.sellerNickname || '卖家',
          sellerAvatar: item.sellerAvatar || '/images/default-avatar.png',
          purchaseTime: item.purchaseTime || item.soldTime || item.updateTime,
          contactInfo: item.contactInfo || item.sellerContact
        };
      });
      
      // 统计各状态数量
      this.updateStatusCounts(boughtItems);
      
      this.setData({
        boughtItems: boughtItems,
        loading: false
      });
      
      // 应用当前筛选
      this.filterItems();
      
    } catch (error) {
      console.error('加载购买记录失败:', error);
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
        id: 'bought_1',
        title: 'MacBook Pro 13寸 2021款',
        description: '9成新，性能优秀，适合学习和办公',
        price: 8800,
        images: ['/images/macbook.jpg'],
        sellerName: '小明',
        sellerAvatar: '/images/avatar1.jpg',
        purchaseStatus: 'completed',
        purchaseTime: '2025-06-28',
        contactInfo: 'wx: xiaoming123'
      },
      {
        id: 'bought_2', 
        title: '全新耐克运动鞋',
        description: 'Air Max 270，41码，全新未穿',
        price: 450,
        images: ['/images/shoes.jpg'],
        sellerName: '小红',
        sellerAvatar: '/images/avatar2.jpg',
        purchaseStatus: 'pending',
        purchaseTime: '2025-06-29',
        contactInfo: 'qq: 1234567'
      }
    ];
  },

  // 更新状态统计
  updateStatusCounts(items) {
    const counts = {
      all: items.length,
      pending: items.filter(item => item.purchaseStatus === '待确认').length,
      completed: items.filter(item => item.purchaseStatus === '已完成').length
    };
    
    const statusOptions = this.data.statusOptions.map(option => ({
      ...option,
      count: counts[option.key]
    }));
    
    this.setData({ statusOptions });
  },

  // 筛选商品
  filterItems() {
    const { boughtItems, activeStatus } = this.data;
    let filteredItems = boughtItems;
    
    if (activeStatus !== 'all') {
      const statusMap = {
        'pending': '待确认',
        'completed': '已完成'
      };
      filteredItems = boughtItems.filter(item => item.purchaseStatus === statusMap[activeStatus]);
    }
    
    this.setData({ filteredItems });
  },

  // 切换状态筛选
  switchStatus(e) {
    const status = e.currentTarget.dataset.status;
    this.setData({ activeStatus: status });
    this.filterItems();
  },

  // 点击商品
  onItemTap(e) {
    const itemId = e.currentTarget.dataset.itemId;
    wx.navigateTo({
      url: `/pages/item-detail/item-detail?id=${itemId}`
    });
  },

  // 联系卖家
  contactSeller(e) {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    const itemId = e.currentTarget.dataset.itemId;
    const item = this.data.boughtItems.find(item => item.id === itemId);
    
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
      wx.showToast({
        title: '暂无联系方式',
        icon: 'none'
      });
    }
  },

  // 确认收货
  confirmReceived(e) {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    const itemId = e.currentTarget.dataset.itemId;
    const item = this.data.boughtItems.find(item => item.id === itemId);
    
    wx.showModal({
      title: '确认收货',
      content: `确定已收到商品"${item.title}"吗？确认后交易将完成。`,
      success: (res) => {
        if (res.confirm) {
          this.performConfirmReceived(itemId);
        }
      }
    });
  },

  // 执行确认收货
  async performConfirmReceived(itemId) {
    try {
      // 这里调用商品管理器的方法
      if (typeof itemManager !== 'undefined' && itemManager.confirmPurchase) {
        await itemManager.confirmPurchase(itemId, this.data.currentUser.id);
      } else {
        // 模拟确认收货
        const boughtItems = this.data.boughtItems.map(item => {
          if (item.id === itemId) {
            return { ...item, purchaseStatus: '已完成' };
          }
          return item;
        });
        this.setData({ boughtItems });
      }
      
      wx.showToast({
        title: '确认收货成功！',
        icon: 'success'
      });
      
      // 重新加载数据
      this.loadBoughtItems();
      
    } catch (error) {
      wx.showToast({
        title: error.message || '操作失败',
        icon: 'none'
      });
    }
  },

  // 评价商品
  rateItem(e) {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    const itemId = e.currentTarget.dataset.itemId;
    
    wx.showToast({
      title: '评价功能开发中',
      icon: 'none'
    });
    
    // TODO: 跳转到评价页面
    // wx.navigateTo({
    //   url: `/pages/rate-item/rate-item?id=${itemId}`
    // });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadBoughtItems().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '校园二手市场，买到心仪好物',
      path: '/pages/index/index'
    };
  }
});