// pages/my-sold-items/my-sold-items.js
const userManager = require('../../utils/userManager');
const itemManager = require('../../utils/itemManager');

Page({
  data: {
    currentUser: null,
    soldItems: [],
    loading: true,
    error: null,
    
    // 状态筛选
    activeStatus: 'all', // 'all', 'selling', 'sold'
    statusOptions: [
      { key: 'all', label: '全部', count: 0 },
      { key: 'selling', label: '在售', count: 0 },
      { key: 'sold', label: '已售出', count: 0 }
    ],
    
    // 筛选后的商品列表
    filteredItems: []
  },

  onLoad() {
    console.log('我卖出的页面加载');
    this.initPage();
  },

  onShow() {
    // 每次显示页面时刷新数据
    this.loadSoldItems();
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
    this.loadSoldItems();
  },

  // 加载我发布的商品
  async loadSoldItems() {
    try {
      this.setData({ loading: true, error: null });
      
      let soldItems = [];
      
      // 从商品管理器获取数据
      if (typeof itemManager !== 'undefined' && itemManager.getUserItems) {
        soldItems = itemManager.getUserItems(this.data.currentUser.id);
        
        // 转换状态字段：active -> 在售，sold -> 已售出
        soldItems = soldItems.map(item => {
          let status = '在售'; // 默认状态
          if (item.status === 'active') {
            status = '在售';
          } else if (item.status === 'sold') {
            status = '已售出';
          } else if (item.status === 'inactive') {
            status = '已下架';
          }
          
          return {
            ...item,
            status: status,
            // 确保有必要的字段
            viewCount: item.viewCount || 0,
            likeCount: item.likeCount || 0,
            sellerId: item.sellerId,
            createTime: item.createTime,
            updateTime: item.updateTime || item.createTime
          };
        });
        
      } else {
        console.log("没有商品数据");
      }
      
      // 统计各状态数量
      this.updateStatusCounts(soldItems);
      
      this.setData({
        soldItems: soldItems,
        loading: false
      });
      
      // 应用当前筛选
      this.filterItems();
      
    } catch (error) {
      console.error('加载商品失败:', error);
      this.setData({
        error: '加载失败，请重试',
        loading: false
      });
    }
  },

  // 更新状态统计
  updateStatusCounts(items) {
    const counts = {
      all: items.length,
      selling: items.filter(item => item.status === '在售').length,
      sold: items.filter(item => item.status === '已售出').length
    };
    
    const statusOptions = this.data.statusOptions.map(option => ({
      ...option,
      count: counts[option.key]
    }));
    
    this.setData({ statusOptions });
  },

  // 筛选商品
  filterItems() {
    const { soldItems, activeStatus } = this.data;
    let filteredItems = soldItems;
    
    if (activeStatus !== 'all') {
      const statusMap = {
        'selling': '在售',
        'sold': '已售出'
      };
      filteredItems = soldItems.filter(item => item.status === statusMap[activeStatus]);
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

  // 编辑商品
  editItem(e) {
    if (e && e.stopPropagation) {
      e.stopPropagation(); // 阻止事件冒泡
    }
    const itemId = e.currentTarget.dataset.itemId;
    wx.navigateTo({
      url: `/pages/edit-item/edit-item?id=${itemId}`
    });
  },

  // 删除商品
  deleteItem(e) {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    const itemId = e.currentTarget.dataset.itemId;
    const item = this.data.soldItems.find(item => item.id === itemId);
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除商品"${item.title}"吗？`,
      success: (res) => {
        if (res.confirm) {
          this.performDeleteItem(itemId);
        }
      }
    });
  },

  // 执行删除
  async performDeleteItem(itemId) {
    try {
      // 这里调用商品管理器的删除方法
      if (typeof itemManager !== 'undefined' && itemManager.deleteItem) {
        await itemManager.deleteItem(itemId);
      }
      
      wx.showToast({
        title: '删除成功',
        icon: 'success'
      });
      
      // 重新加载数据
      this.loadSoldItems();
      
    } catch (error) {
      wx.showToast({
        title: error.message || '删除失败',
        icon: 'none'
      });
    }
  },

  // 标记为已售出
  markAsSold(e) {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    const itemId = e.currentTarget.dataset.itemId;
    
    wx.showModal({
      title: '确认售出',
      content: '确定已经完成交易了吗？标记为已售出后不可撤销。',
      success: (res) => {
        if (res.confirm) {
          this.performMarkAsSold(itemId);
        }
      }
    });
  },

  // 执行标记已售出
  async performMarkAsSold(itemId) {
    try {
      if (typeof itemManager !== 'undefined' && itemManager.updateItemStatus) {
        await itemManager.updateItemStatus(itemId, '已售出');
      }
      
      wx.showToast({
        title: '标记成功，交易完成！',
        icon: 'success'
      });
      
      this.loadSoldItems();
      
    } catch (error) {
      wx.showToast({
        title: error.message || '操作失败',
        icon: 'none'
      });
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadSoldItems().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '看看我在校园二手市场卖的好物',
      path: '/pages/index/index'
    };
  }
});