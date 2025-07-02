// pages/my-sold-items/my-sold-items.js
const userManager = require('../../utils/userManager');
const itemManager = require('../../utils/itemManager');

Page({
  data: {
    currentUser: null,
    soldItems: [],
    loading: true,
    error: null,
    
    // 状态筛选 - 修改为四个分类
    activeStatus: 'all', // 'all', 'selling', 'sold', 'withdrawn'
    statusOptions: [
      { key: 'all', label: '全部', count: 0 },
      { key: 'selling', label: '在售', count: 0 },
      { key: 'sold', label: '已售出', count: 0 },
      { key: 'withdrawn', label: '已下架', count: 0 }
    ],
    
    // 筛选后的商品列表
    filteredItems: [],
    // 修改价格
    showPriceModal: false,
    editingItemId: null,
    editingPrice: '',
    originalPrice: ''
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
        
        // 转换状态字段，保持原有的状态映射逻辑
        soldItems = soldItems.map(item => {
          let status = '在售'; // 默认状态
          if (item.status === 'active') {
            status = '在售';
          } else if (item.status === 'sold') {
            status = '已售出';
          } else if (item.status === 'withdrawn') {
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
      sold: items.filter(item => item.status === '已售出').length,
      withdrawn: items.filter(item => item.status === '已下架').length
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
        'sold': '已售出',
        'withdrawn': '已下架'
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
        await itemManager.updateItemStatus(itemId, 'sold'); // 传递原始状态值
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

  // 标记为已下架
  markAsWithdrawn(e) {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    const itemId = e.currentTarget.dataset.itemId;
    
    wx.showModal({
      title: '确认下架',
      content: '确定要下架此商品吗？下架后可以重新上架。',
      success: (res) => {
        if (res.confirm) {
          this.performMarkAsWithdrawn(itemId);
        }
      }
    });
  },

  // 执行标记已下架
  async performMarkAsWithdrawn(itemId) {
    try {
      if (typeof itemManager !== 'undefined' && itemManager.updateItemStatus) {
        await itemManager.updateItemStatus(itemId, 'withdrawn'); // 传递原始状态值
      }
      
      wx.showToast({
        title: '商品已下架',
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

  // 重新上架（从已下架状态恢复到在售）
  markAsActive(e) {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    const itemId = e.currentTarget.dataset.itemId;
    
    wx.showModal({
      title: '确认上架',
      content: '确定要重新上架此商品吗？',
      success: (res) => {
        if (res.confirm) {
          this.performMarkAsActive(itemId);
        }
      }
    });
  },

  // 执行重新上架
  async performMarkAsActive(itemId) {
    try {
      if (typeof itemManager !== 'undefined' && itemManager.updateItemStatus) {
        await itemManager.updateItemStatus(itemId, 'active'); // 传递原始状态值
      }
      
      wx.showToast({
        title: '商品已重新上架',
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
  },
  // 添加这些方法：
  showEditPrice(e) {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    const itemId = e.currentTarget.dataset.itemId;
    const item = this.data.soldItems.find(item => item.id === itemId);
    
    this.setData({
      showPriceModal: true,
      editingItemId: itemId,
      editingPrice: item.price.toString(),
      originalPrice: item.price.toString()
    });
  },

  hidePriceModal() {
    this.setData({
      showPriceModal: false,
      editingItemId: null,
      editingPrice: '',
      originalPrice: ''
    });
  },

  // 改进的价格输入验证
  onPriceInput(e) {
    let value = e.detail.value;
    
    // 只允许数字和小数点
    value = value.replace(/[^\d.]/g, '');
    
    // 确保只有一个小数点
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // 限制小数点后两位
    if (parts[1] && parts[1].length > 2) {
      value = parts[0] + '.' + parts[1].substring(0, 2);
    }
    
    // 防止以小数点开头
    if (value.startsWith('.')) {
      value = '0' + value;
    }
    
    this.setData({
      editingPrice: value
    });
  },

  async confirmPriceEdit() {
    const { editingPrice, editingItemId, originalPrice } = this.data;
    
    // 验证价格
    if (!editingPrice || editingPrice <= 0) {
      wx.showToast({
        title: '请输入有效价格',
        icon: 'none'
      });
      return;
    }
    
    // 如果价格没有变化，直接关闭弹窗
    if (parseFloat(editingPrice) === parseFloat(originalPrice)) {
      this.hidePriceModal();
      return;
    }
    
    try {
      // 调用商品管理器的更新价格方法
      if (typeof itemManager !== 'undefined' && itemManager.updateItemPrice) {
        await itemManager.updateItemPrice(editingItemId, parseFloat(editingPrice));
      } else {
        // 如果没有专门的更新价格方法，可能需要调用通用的更新方法
        // 这里需要根据你的 itemManager 实际方法来调整
        throw new Error('价格更新方法不存在');
      }
      
      wx.showToast({
        title: '价格修改成功',
        icon: 'success'
      });
      
      // 关闭弹窗
      this.hidePriceModal();
      
      // 重新加载数据
      this.loadSoldItems();
      
    } catch (error) {
      console.error('修改价格失败:', error);
      wx.showToast({
        title: error.message || '修改失败，请重试',
        icon: 'none'
      });
    }
  },

  cancelPriceEdit() {
    this.hidePriceModal();
  },

  stopPropagation() {
    // 什么都不做，只是阻止事件冒泡
  },
});