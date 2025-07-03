// pages/my-bought-items/my-bought-items.js
const userManager = require('../../utils/userManager');
const itemManager = require('../../utils/itemManager');
const transactionManager = require('../../utils/transactionManager'); // 新增

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
      { key: 'withdrawn', label: '已下架', count: 0 } // 修改：inactive -> withdrawn
    ],
    
    // 筛选后的商品列表
    filteredItems: [],
    
    // 价格修改相关字段
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

  // ===== 修改：混合数据获取逻辑 =====
  async loadBoughtItems() {
    try {
      this.setData({ loading: true, error: null });
      
      const currentUserId = this.data.currentUser.id;
      let allBoughtItems = [];
      
      // 1. 获取求购发布的（从 items 表）
      const myDemandItems = itemManager.getUserItems(currentUserId)
        .filter(item => item.tradeType === 'buy') // 只要求购类型的
        .map(item => ({
          ...item,
          sourceType: 'demand', // 标记为求购发布的
          isDirect: false
        }));
      
      // 2. 获取直接购买的（从 transactions 表）
      let directPurchases = [];
      if (typeof transactionManager !== 'undefined' && transactionManager.getTransactionsByBuyer) {
        try {
          const transactions = transactionManager.getTransactionsByBuyer(currentUserId);
          
          // 关联商品信息
          directPurchases = await Promise.all(
            transactions.map(async (transaction) => {
              const item = itemManager.getItemById(transaction.item_id);
              if (item) {
                return {
                  ...item,
                  sourceType: 'purchase', // 标记为直接购买的
                  isDirect: true,
                  purchasePrice: transaction.amount,
                  purchaseDate: transaction.created_at,
                  transactionId: transaction.id,
                  sellerInfo: {
                    id: transaction.seller_id,
                    name: item.sellerName || item.sellerNickname
                  }
                };
              }
              return null;
            })
          );
          
          // 过滤掉空值
          directPurchases = directPurchases.filter(item => item !== null);
        } catch (error) {
          console.error('获取交易记录失败:', error);
          directPurchases = [];
        }
      }
      
      // 3. 合并两种类型的数据
      allBoughtItems = [
        ...myDemandItems,
        ...directPurchases
      ];
      
      // 4. 转换和标准化数据
      allBoughtItems = allBoughtItems.map(item => {
        let status = '求购中'; // 默认状态
        let statusType = 'demand'; // 状态类型：demand（求购）或 purchase（购买）
        
        if (item.isDirect) {
          // 直接购买的都是已买到
          status = '已买到';
          statusType = 'purchase';
        } else {
          // 求购发布的根据状态判断
          statusType = 'demand';
          if (item.status === 'seeking') {
            status = '求购中';
          } else if (item.status === 'bought') {
            status = '已买到';
          } else if (item.status === 'withdrawn') {
            status = '已下架';
          }
        }
        
        return {
          ...item,
          status: status,
          statusType: statusType, // 新增：区分状态类型
          displayPrice: item.isDirect ? item.purchasePrice : item.price,
          displayDate: item.isDirect ? item.purchaseDate : item.createTime,
          createTime: item.createTime,
          updateTime: item.updateTime || item.createTime
        };
      });
      
      // 5. 按时间排序（最新的在前面）
      allBoughtItems.sort((a, b) => {
        const timeA = a.isDirect ? a.purchaseDate : a.updateTime || a.createTime;
        const timeB = b.isDirect ? b.purchaseDate : b.updateTime || b.createTime;
        return new Date(timeB) - new Date(timeA);
      });
      
      // 统计各状态数量
      this.updateStatusCounts(allBoughtItems);
      
      this.setData({
        boughtItems: allBoughtItems,
        loading: false
      });
      
      // 应用当前筛选
      this.filterItems();
      
    } catch (error) {
      console.error('加载求购记录失败:', error);
      this.setData({
        error: '加载失败，请重试',
        loading: false,
        boughtItems: this.generateMockData() // 加载失败时使用模拟数据
      });
      this.updateStatusCounts(this.data.boughtItems);
      this.filterItems();
    }
  },

  // 生成模拟数据（用于测试和降级）
  generateMockData() {
    return [
      {
        id: 'seeking_1',
        title: '求购 MacBook Pro 13寸',
        description: '预算8000-10000，要求9成新以上，性能良好',
        price: 9000,
        displayPrice: 9000,
        images: ['/images/macbook.jpg'],
        status: '求购中',
        createTime: '2025-06-25',
        tradeType: 'buy',
        sourceType: 'demand',
        isDirect: false
      },
      {
        id: 'transaction_1', 
        title: '购买的 iPhone 13',
        description: 'iPhone 13 Pro 128GB 深空灰色，九成新',
        price: 4500,
        displayPrice: 4500,
        purchasePrice: 4500,
        images: ['/images/phone1.jpg'],
        status: '已买到',
        createTime: '2025-06-20',
        purchaseDate: '2025-06-28',
        sellerInfo: { name: '张三' },
        sourceType: 'purchase',
        isDirect: true,
        transactionId: 1001
      }
    ];
  },

  // 更新状态统计
  updateStatusCounts(items) {
    const counts = {
      all: items.length,
      seeking: items.filter(item => item.status === '求购中').length,
      bought: items.filter(item => item.status === '已买到').length,
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
    const { boughtItems, activeStatus } = this.data;
    let filteredItems = boughtItems;
    
    if (activeStatus !== 'all') {
      const statusMap = {
        'seeking': '求购中',
        'bought': '已买到',
        'withdrawn': '已下架'
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
    const item = this.data.filteredItems.find(item => item.id === itemId);
    
    if (item && item.isDirect) {
      // 直接购买的商品，跳转到商品详情页
      wx.navigateTo({
        url: `/pages/item-detail/item-detail?id=${itemId}`
      });
    } else {
      // 求购发布的，跳转到求购详情页（如果有的话）
      wx.navigateTo({
        url: `/pages/item-detail/item-detail?id=${itemId}`
      });
    }
  },

  // ===== 修改：删除商品逻辑 =====
  deleteItem(e) {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    const itemId = e.currentTarget.dataset.itemId;
    const item = this.data.boughtItems.find(item => item.id === itemId);
    
    if (item.isDirect) {
      wx.showToast({
        title: '购买记录无法删除',
        icon: 'none'
      });
      return;
    }
    
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
      await itemManager.deleteItem(itemId);
      
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

  // ===== 修改：标记为已买到（只对求购有效）=====
  markAsBought(e) {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    const itemId = e.currentTarget.dataset.itemId;
    const item = this.data.boughtItems.find(item => item.id === itemId);
    
    if (item.isDirect) {
      wx.showToast({
        title: '该商品已经是购买状态',
        icon: 'none'
      });
      return;
    }
    
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
      await itemManager.updateItemStatus(itemId, 'bought');
      
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

  // ===== 修改：下架逻辑（只对求购有效）=====
  markAsWithdrawn(e) {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    const itemId = e.currentTarget.dataset.itemId;
    const item = this.data.boughtItems.find(item => item.id === itemId);
    
    if (item.isDirect) {
      wx.showToast({
        title: '购买记录无法下架',
        icon: 'none'
      });
      return;
    }
    
    wx.showModal({
      title: '确认下架',
      content: '确定要下架此求购吗？下架后可以重新上架。',
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
      await itemManager.updateItemStatus(itemId, 'withdrawn');
      
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
    const item = this.data.boughtItems.find(item => item.id === itemId);
    
    if (item.isDirect) {
      wx.showToast({
        title: '购买记录无法重新上架',
        icon: 'none'
      });
      return;
    }
    
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
      await itemManager.updateItemStatus(itemId, 'seeking');
      
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

  // ===== 修改：价格编辑（只对求购有效）=====
  showEditPrice(e) {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    const itemId = e.currentTarget.dataset.itemId;
    const item = this.data.boughtItems.find(item => item.id === itemId);
    
    if (item.isDirect) {
      wx.showToast({
        title: '购买记录的价格无法修改',
        icon: 'none'
      });
      return;
    }
    
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
      await itemManager.updateItemPrice(editingItemId, parseFloat(editingPrice));
      
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
      title: '看看我在校园二手市场的求购和购买记录',
      path: '/pages/index/index'
    };
  }
});