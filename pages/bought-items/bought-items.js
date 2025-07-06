// pages/my-bought-items/my-bought-items.js
const userManager = require('../../utils/userManager');
const itemManager = require('../../utils/itemManager');
const transactionManager = require('../../utils/transactionManager');
const sharedTools = require('../../utils/sharedTools');
const { priceProcess, PriceMixin } = require('../../utils/priceProcess'); // 引入价格处理工具

Page({
  // 混入价格处理方法
  ...PriceMixin,

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
      { key: 'withdrawn', label: '已下架', count: 0 }
    ],
    
    // 筛选后的商品列表
    filteredItems: [],
    
    // 价格修改相关字段
    showPriceModal: false,
    editingItemId: null,
    editingPrice: '',
    originalPrice: '',
    
    // 价格配置
    priceConfig: {
      max: 99999,
      min: 0.01
    }
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

  // 混合数据获取逻辑
  async loadBoughtItems() {
    try {
      this.setData({ loading: true, error: null });
      
      const currentUserId = this.data.currentUser.id;
      let allBoughtItems = [];
      
      // 1. 获取求购发布的（从 items 表）
      try {
        console.log('获取用户求购商品...');
        const allUserItems = await itemManager.getUserItems(currentUserId);
        
        const myDemandItems = allUserItems
          .filter(item => (item.tradeType === 'buy' || item.trade_type === 'buy'))
          .map(item => ({
            ...item,
            sourceType: 'demand',
            isDirect: false,
            tradeType: item.tradeType || item.trade_type,
            createTime: item.createTime || item.created_at,
            updateTime: item.updateTime || item.updated_at,
            sellerId: item.sellerId || item.seller_id
          }));
        
        console.log('求购商品数量:', myDemandItems.length);
        allBoughtItems = [...myDemandItems];
        
      } catch (error) {
        console.error('获取求购商品失败:', error);
        allBoughtItems = [];
      }
      
      // 2. 获取直接购买的（从 transactions 表）
      let directPurchases = [];
      if (typeof transactionManager !== 'undefined' && transactionManager.getTransactionsByBuyer) {
        try {
          console.log('获取交易记录...');
          const transactions = await transactionManager.getTransactionsByBuyer(currentUserId);
          
          directPurchases = await Promise.all(
            transactions.map(async (transaction) => {
              try {
                const item = await itemManager.getItemDetail(transaction.item_id);
                if (item) {
                  return {
                    ...item,
                    sourceType: 'purchase',
                    isDirect: true,
                    purchasePrice: transaction.amount,
                    purchaseDate: transaction.created_at,
                    transactionId: transaction.id,
                    sellerInfo: {
                      id: transaction.seller_id,
                      name: item.sellerName || item.sellerNickname || '卖家'
                    }
                  };
                }
                return null;
              } catch (error) {
                console.error('获取商品详情失败:', error);
                return null;
              }
            })
          );
          
          directPurchases = directPurchases.filter(item => item !== null);
          console.log('直接购买记录数量:', directPurchases.length);
          
        } catch (error) {
          console.error('获取交易记录失败:', error);
          directPurchases = [];
        }
      } else {
        console.log('transactionManager 不可用，跳过交易记录获取');
      }
      
      // 3. 合并两种类型的数据
      allBoughtItems = [
        ...allBoughtItems,
        ...directPurchases
      ];
      
      // 4. 转换和标准化数据
      allBoughtItems = allBoughtItems.map(item => {
        let status = '求购中';
        let statusType = 'demand';
        
        if (item.isDirect) {
          status = '已买到';
          statusType = 'purchase';
        } else {
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
          statusType: statusType,
          displayPrice: item.isDirect ? item.purchasePrice : item.price,
          displayDate: item.isDirect ? item.purchaseDate : item.createTime,
          createTime: sharedTools.formatTime(item.createTime) || sharedTools.formatTime(item.created_at),
          updateTime: sharedTools.formatTime(item.updateTime) || sharedTools.formatTime(item.updated_at) || item.createTime || item.created_at
        };
      });
      
      // 5. 按时间排序
      allBoughtItems.sort((a, b) => {
        const timeA = a.isDirect ? a.purchaseDate : a.updateTime || a.createTime;
        const timeB = b.isDirect ? b.purchaseDate : b.updateTime || b.createTime;
        return new Date(timeB) - new Date(timeA);
      });
      
      console.log('最终求购/购买记录数量:', allBoughtItems.length);
      
      this.updateStatusCounts(allBoughtItems);
      
      this.setData({
        boughtItems: allBoughtItems,
        loading: false
      });
      
      this.filterItems();
      
    } catch (error) {
      console.error('加载求购记录失败:', error);
      this.setData({
        error: '加载失败，请重试',
        loading: false,
        boughtItems: []
      });
      this.updateStatusCounts(this.data.boughtItems);
      this.filterItems();
    }
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
      wx.navigateTo({
        url: `/pages/item-detail/item-detail?id=${itemId}`
      });
    } else {
      wx.navigateTo({
        url: `/pages/item-detail/item-detail?id=${itemId}`
      });
    }
  },

  // 删除商品逻辑
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
      const result = await itemManager.deleteItem(itemId);
      console.log('删除求购成功:', result);
      
      wx.showToast({
        title: '删除成功',
        icon: 'success'
      });
      
      await this.loadBoughtItems();
      
    } catch (error) {
      console.error('删除失败:', error);
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
      const result = await itemManager.updateItemStatus(itemId, 'bought');
      console.log('标记已买到成功:', result);
      
      wx.showToast({
        title: '标记成功，求购完成！',
        icon: 'success'
      });
      
      await this.loadBoughtItems();
      
    } catch (error) {
      console.error('标记已买到失败:', error);
      wx.showToast({
        title: error.message || '操作失败',
        icon: 'none'
      });
    }
  },

  // 下架逻辑
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
      const result = await itemManager.updateItemStatus(itemId, 'withdrawn');
      console.log('下架求购成功:', result);
      
      wx.showToast({
        title: '求购已下架',
        icon: 'success'
      });
      
      await this.loadBoughtItems();
      
    } catch (error) {
      console.error('下架失败:', error);
      wx.showToast({
        title: error.message || '操作失败',
        icon: 'none'
      });
    }
  },

  // 重新上架
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
      const result = await itemManager.updateItemStatus(itemId, 'seeking');
      console.log('重新上架求购成功:', result);
      
      wx.showToast({
        title: '求购已重新上架',
        icon: 'success'
      });
      
      await this.loadBoughtItems();
      
    } catch (error) {
      console.error('重新上架失败:', error);
      wx.showToast({
        title: error.message || '操作失败',
        icon: 'none'
      });
    }
  },

  // 显示价格编辑弹窗
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
      editingPrice: priceProcess.formatPriceDisplay(item.price), // 使用统一的格式化方法
      originalPrice: priceProcess.formatPriceDisplay(item.price)
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

  // 价格输入处理 - 使用统一的价格处理方法
  onPriceInput(e) {
    const result = priceProcess.formatPriceInput(e.detail.value, this.data.priceConfig.max);
    
    if (!result.isValid && result.error) {
      wx.showToast({
        title: result.error,
        icon: 'none',
        duration: 1000
      });
      return; // 保持原值不变
    }
    
    this.setData({
      editingPrice: result.value
    });
  },

  // 确认价格修改
  async confirmPriceEdit() {
    const { editingPrice, originalPrice, editingItemId } = this.data;
    
    // 验证价格
    const validation = priceProcess.validatePrice(editingPrice, this.data.priceConfig.max);
    if (!validation.isValid) {
      wx.showToast({
        title: validation.error,
        icon: 'none'
      });
      return;
    }

    // 如果价格没有变化，直接关闭弹窗
    if (priceProcess.comparePrices(editingPrice, originalPrice)) {
      this.hidePriceModal();
      return;
    }

    try {
      // 执行更新
      const result = await itemManager.updateItemPrice(editingItemId, parseFloat(editingPrice));
      console.log('价格更新成功:', result);
      
      wx.showToast({
        title: '价格修改成功',
        icon: 'success'
      });
      
      // 关闭弹窗
      this.hidePriceModal();
      
      // 重新加载数据
      await this.loadBoughtItems();
      
    } catch (error) {
      console.error('修改价格失败:', error);
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