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
    activeStatus: 'all',
    statusOptions: [
      { key: 'all', label: '全部', count: 0 },
      { key: 'seeking', label: '求购中', count: 0 },
      { key: 'bought', label: '已买到', count: 0 },
      { key: 'inactive', label: '已下架', count: 0 }
    ],
    
    // 筛选后的商品列表
    filteredItems: [],
    
    // 新增：价格修改相关字段
    showPriceModal: false,
    editingItemId: null,
    editingPrice: '',
    originalPrice: ''
  },

  onLoad() {
    console.log('我的求购页面加载');
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

  // 加载我的求购商品
  async loadBoughtItems() {
    try {
      this.setData({ loading: true, error: null });
      
      let boughtItems = [];
      
      // 从商品管理器获取我的求购数据
      if (typeof itemManager !== 'undefined' && itemManager.getUserSeekingItems) {
        boughtItems = itemManager.getUserSeekingItems(this.data.currentUser.id);
      } else if (typeof itemManager !== 'undefined' && itemManager.getAllSeekingItems) {
        // 如果有专门的求购商品管理
        const allSeekingItems = itemManager.getAllSeekingItems();
        boughtItems = allSeekingItems.filter(item => item.seekerId === this.data.currentUser.id);
      } else {
        console.log("没有求购数据");
        // 模拟一些测试数据
        boughtItems = this.generateMockData();
      }
      
      // 转换和标准化数据
      boughtItems = boughtItems.map(item => {
        let status = '求购中'; // 默认状态
        if (item.status === 'seeking' || item.status === 'active') {
          status = '求购中';
        } else if (item.status === 'bought' || item.status === 'completed') {
          status = '已买到';
        } else if (item.status === 'inactive') {
          status = '已下架';
        }
        
        return {
          ...item,
          status: status,
          // 确保有必要的字段
          seekerId: item.seekerId || this.data.currentUser.id,
          sellerName: item.sellerName || item.sellerNickname || '',
          sellerAvatar: item.sellerAvatar || '/images/default-avatar.png',
          createTime: item.createTime,
          updateTime: item.updateTime || item.createTime,
          boughtTime: item.boughtTime || item.soldTime
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
      console.error('加载求购记录失败:', error);
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
        id: 'seeking_1',
        title: '求购 MacBook Pro 13寸',
        description: '预算8000-10000，要求9成新以上，性能良好',
        price: 9000,
        images: ['/images/macbook.jpg'],
        status: 'seeking',
        createTime: '2025-06-25',
        seekerId: this.data.currentUser.id
      },
      {
        id: 'seeking_2', 
        title: '求购耐克运动鞋',
        description: 'Air Max系列，40-41码，8成新以上即可',
        price: 400,
        images: ['/images/shoes.jpg'],
        status: 'bought',
        createTime: '2025-06-20',
        boughtTime: '2025-06-28',
        sellerName: '小红',
        sellerAvatar: '/images/avatar2.jpg',
        seekerId: this.data.currentUser.id
      },
      {
        id: 'seeking_3',
        title: '求购二手自行车',
        description: '山地车或城市车都可以，要求刹车正常',
        price: 300,
        images: ['/images/bike.jpg'],
        status: 'inactive',
        createTime: '2025-06-15',
        seekerId: this.data.currentUser.id
      }
    ];
  },

  // 更新状态统计
  updateStatusCounts(items) {
    const counts = {
      all: items.length,
      seeking: items.filter(item => item.status === '求购中').length,
      bought: items.filter(item => item.status === '已买到').length,
      inactive: items.filter(item => item.status === '已下架').length
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
        'seeking': '求购中',
        'bought': '已买到',
        'inactive': '已下架'
      };
      filteredItems = boughtItems.filter(item => item.status === statusMap[activeStatus]);
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
      url: `/pages/seeking-detail/seeking-detail?id=${itemId}`
    });
  },

  // 删除求购
  deleteItem(e) {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    const itemId = e.currentTarget.dataset.itemId;
    const item = this.data.boughtItems.find(item => item.id === itemId);
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除求购"${item.title}"吗？`,
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
      // 调用商品管理器的删除方法
      if (typeof itemManager !== 'undefined' && itemManager.deleteSeekingItem) {
        await itemManager.deleteSeekingItem(itemId);
      } else if (typeof itemManager !== 'undefined' && itemManager.deleteItem) {
        await itemManager.deleteItem(itemId);
      }
      
      wx.showToast({
        title: '删除成功',
        icon: 'success'
      });
      
      // 重新加载数据
      this.loadBoughtItems();
      
    } catch (error) {
      wx.showToast({
        title: error.message || '删除失败',
        icon: 'none'
      });
    }
  },

  // 标记为已买到
  markAsBought(e) {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    const itemId = e.currentTarget.dataset.itemId;
    
    wx.showModal({
      title: '确认买到',
      content: '确定已经买到这个商品了吗？标记后不可撤销。',
      success: (res) => {
        if (res.confirm) {
          this.performMarkAsBought(itemId);
        }
      }
    });
  },

  // 执行标记已买到
  async performMarkAsBought(itemId) {
    try {
      if (typeof itemManager !== 'undefined' && itemManager.updateSeekingStatus) {
        await itemManager.updateSeekingStatus(itemId, 'bought');
      } else if (typeof itemManager !== 'undefined' && itemManager.updateItemStatus) {
        await itemManager.updateItemStatus(itemId, 'bought');
      }
      
      wx.showToast({
        title: '标记成功，求购完成！',
        icon: 'success'
      });
      
      this.loadBoughtItems();
      
    } catch (error) {
      wx.showToast({
        title: error.message || '操作失败',
        icon: 'none'
      });
    }
  },

  // 标记为已下架
  markAsInactive(e) {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    const itemId = e.currentTarget.dataset.itemId;
    
    wx.showModal({
      title: '确认下架',
      content: '确定要下架此求购吗？下架后可以重新上架。',
      success: (res) => {
        if (res.confirm) {
          this.performMarkAsInactive(itemId);
        }
      }
    });
  },

  // 执行标记已下架
  async performMarkAsInactive(itemId) {
    try {
      if (typeof itemManager !== 'undefined' && itemManager.updateSeekingStatus) {
        await itemManager.updateSeekingStatus(itemId, 'inactive');
      } else if (typeof itemManager !== 'undefined' && itemManager.updateItemStatus) {
        await itemManager.updateItemStatus(itemId, 'inactive');
      }
      
      wx.showToast({
        title: '求购已下架',
        icon: 'success'
      });
      
      this.loadBoughtItems();
      
    } catch (error) {
      wx.showToast({
        title: error.message || '操作失败',
        icon: 'none'
      });
    }
  },

  // 重新上架（从已下架状态恢复到求购中）
  markAsActive(e) {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    const itemId = e.currentTarget.dataset.itemId;
    
    wx.showModal({
      title: '确认上架',
      content: '确定要重新上架此求购吗？',
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
      if (typeof itemManager !== 'undefined' && itemManager.updateSeekingStatus) {
        await itemManager.updateSeekingStatus(itemId, 'seeking');
      } else if (typeof itemManager !== 'undefined' && itemManager.updateItemStatus) {
        await itemManager.updateItemStatus(itemId, 'active');
      }
      
      wx.showToast({
        title: '求购已重新上架',
        icon: 'success'
      });
      
      this.loadBoughtItems();
      
    } catch (error) {
      wx.showToast({
        title: error.message || '操作失败',
        icon: 'none'
      });
    }
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
      title: '看看我在校园二手市场的求购信息',
      path: '/pages/index/index'
    };
  },
  // 显示价格修改弹窗
showEditPrice(e) {
  if (e && e.stopPropagation) {
    e.stopPropagation();
  }
  const itemId = e.currentTarget.dataset.itemId;
  const item = this.data.boughtItems.find(item => item.id === itemId);
  
  this.setData({
    showPriceModal: true,
    editingItemId: itemId,
    editingPrice: item.price.toString(),
    originalPrice: item.price.toString()
  });
},

  // 隐藏价格修改弹窗
  hidePriceModal() {
    this.setData({
      showPriceModal: false,
      editingItemId: null,
      editingPrice: '',
      originalPrice: ''
    });
  },

  // 价格输入处理
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

  // 确认价格修改
  async confirmPriceEdit() {
    const { editingPrice, editingItemId, originalPrice } = this.data;
    
    // 验证价格
    if (!editingPrice || editingPrice <= 0) {
      wx.showToast({
        title: '请输入有效预算',
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
      if (typeof itemManager !== 'undefined' && itemManager.updateSeekingPrice) {
        await itemManager.updateSeekingPrice(editingItemId, parseFloat(editingPrice));
      } else if (typeof itemManager !== 'undefined' && itemManager.updateItemPrice) {
        await itemManager.updateItemPrice(editingItemId, parseFloat(editingPrice));
      } else {
        // 如果没有专门的方法，使用通用更新方法
        const itemIndex = this.data.boughtItems.findIndex(item => item.id === editingItemId);
        if (itemIndex !== -1) {
          const updatedItems = [...this.data.boughtItems];
          updatedItems[itemIndex].price = parseFloat(editingPrice);
          this.setData({ boughtItems: updatedItems });
          this.filterItems(); // 重新筛选以更新显示
        }
      }
      
      wx.showToast({
        title: '预算修改成功',
        icon: 'success'
      });
      
      // 关闭弹窗
      this.hidePriceModal();
      
      // 重新加载数据
      this.loadBoughtItems();
      
    } catch (error) {
      console.error('修改预算失败:', error);
      wx.showToast({
        title: error.message || '修改失败，请重试',
        icon: 'none'
      });
    }
  },

  // 取消价格修改
  cancelPriceEdit() {
    this.hidePriceModal();
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 什么都不做，只是阻止事件冒泡
  }
});