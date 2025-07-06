// pages/my-sold-items/my-sold-items.js
const userManager = require('../../utils/userManager');
const itemManager = require('../../utils/itemManager');
const sharedTools = require('../../utils/sharedTools');
const { priceProcess, PriceMixin } = require('../../utils/priceProcess'); // 引入价格处理工具

Page({
  // 混入价格处理方法
  ...PriceMixin,

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
    originalPrice: '',
    
    // 价格配置
    priceConfig: {
      max: 99999,
      min: 0.01
    }
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
      
      // 使用 itemManager 的 getUserItems 方法（注意：这是异步方法）
      try {
        console.log('从 itemManager 获取用户商品...');
        const allUserItems = await itemManager.getUserItems(this.data.currentUser.id);
        
        console.log('获取到的用户商品:', allUserItems);
        
        // 只获取出售类型的商品，过滤掉求购信息
        const sellOnlyItems = allUserItems.filter(item => 
          item.tradeType === 'sell' || item.trade_type === 'sell'
        );
        
        console.log('用户所有商品:', allUserItems.length);
        console.log('出售商品:', sellOnlyItems.length);
        
        // 转换状态字段，保持原有的状态映射逻辑
        soldItems = sellOnlyItems.map(item => {
          let displayStatus = '在售'; // 显示用的状态
          
          // 状态映射：数据库状态 -> 显示状态
          if (item.status === 'selling') {
            displayStatus = '在售';
          } else if (item.status === 'sold') {
            displayStatus = '已售出';
          } else if (item.status === 'withdrawn') {
            displayStatus = '已下架';
          }
          
          console.log(`商品 ${item.id}(${item.title}): 原始状态=${item.status}, 显示状态=${displayStatus}`);
          
          return {
            id: item.id,
            title: item.title,
            description: item.description,
            price: parseFloat(item.price),
            images: item.images || [],
            tradeType: item.tradeType || item.trade_type,
            category: item.category,
            condition: item.condition,
            status: displayStatus, // 用于显示的状态
            originalStatus: item.status, // 保留原始状态
            viewCount: item.viewCount || item.view_count || 0,
            likeCount: item.likeCount || item.like_count || 0,
            sellerId: item.sellerId || item.seller_id,
            createTime: sharedTools.formatTime(item.createTime) || sharedTools.formatTime(item.created_at),
            updateTime: sharedTools.formatTime(item.updateTime) || sharedTools.formatTime(item.updated_at) || item.createTime || item.created_at
          };
        });
        
      } catch (error) {
        console.error('从 itemManager 获取商品失败:', error);
        // 如果获取失败，设置空数组
        soldItems = [];
      }
      
      console.log('处理后的商品列表:', soldItems.map(item => ({ 
        id: item.id, 
        title: item.title, 
        status: item.status, 
        originalStatus: item.originalStatus 
      })));
      
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
    console.log('=== 开始统计状态 ===');
    console.log('待统计商品:', items.map(item => ({ 
      id: item.id, 
      title: item.title, 
      status: item.status 
    })));
    
    const counts = {
      all: items.length,
      selling: items.filter(item => item.status === '在售').length,
      sold: items.filter(item => item.status === '已售出').length,
      withdrawn: items.filter(item => item.status === '已下架').length
    };
    
    console.log('状态统计结果:', counts);
    console.log('=== 统计完成 ===');
    
    const statusOptions = this.data.statusOptions.map(option => ({
      ...option,
      count: counts[option.key]
    }));
    
    this.setData({ statusOptions });
  },
  
  // 筛选商品
  async filterItems() {
    const { soldItems, activeStatus } = this.data;
    console.log('=== 开始筛选商品 ===');
    console.log('筛选状态:', activeStatus);
    console.log('可筛选商品总数:', soldItems.length);
    
    let filteredItems = soldItems;
    
    if (activeStatus !== 'all') {
      // 状态筛选映射
      const statusMap = {
        'selling': '在售',
        'sold': '已售出',
        'withdrawn': '已下架'
      };
      
      const targetStatus = statusMap[activeStatus];
      console.log('目标状态:', targetStatus);
      
      filteredItems = soldItems.filter(item => item.status === targetStatus);
      console.log('筛选结果:', filteredItems.map(item => ({ 
        id: item.id, 
        title: item.title, 
        status: item.status 
      })));
    }
    
    console.log('最终筛选数量:', filteredItems.length);
    console.log('=== 筛选完成 ===');
    
    this.setData({ filteredItems });
  },
  
  // 标记商品为已售出
  async performMarkAsSold(itemId) {
    try {
      console.log('标记商品为已售出:', itemId);
      
      // 使用 itemManager 的方法
      const result = await itemManager.updateItemStatus(itemId, 'sold');
      console.log('商品状态更新成功:', result);
      
      wx.showToast({
        title: '标记成功，交易完成！',
        icon: 'success'
      });
      
      // 重新加载数据
      await this.loadSoldItems();
      
    } catch (error) {
      console.error('标记售出失败:', error);
      wx.showToast({
        title: error.message || '操作失败',
        icon: 'none'
      });
    }
  },

  // 执行标记已下架
  async performMarkAsWithdrawn(itemId) {
    try {
      const result = await itemManager.updateItemStatus(itemId, 'withdrawn');
      console.log('商品下架成功:', result);
      
      wx.showToast({
        title: '商品已下架',
        icon: 'success'
      });
      
      await this.loadSoldItems();
      
    } catch (error) {
      console.error('下架失败:', error);
      wx.showToast({
        title: error.message || '操作失败',
        icon: 'none'
      });
    }
  },

  // 执行重新上架
  async performMarkAsActive(itemId) {
    try {
      const result = await itemManager.updateItemStatus(itemId, 'selling');
      console.log('商品重新上架成功:', result);
      
      wx.showToast({
        title: '商品已重新上架',
        icon: 'success'
      });
      
      await this.loadSoldItems();
      
    } catch (error) {
      console.error('重新上架失败:', error);
      wx.showToast({
        title: error.message || '操作失败',
        icon: 'none'
      });
    }
  },

  // 执行删除
  async performDeleteItem(itemId) {
    // 添加调试日志
    console.log('performDeleteItem - itemId:', itemId);
    console.log('performDeleteItem - itemId type:', typeof itemId);
    
    if (!itemId) {
      wx.showToast({
        title: '商品ID不存在',
        icon: 'none'
      });
      return;
    }
    
    try {
      // 确保 itemId 是字符串或数字
      const validItemId = String(itemId).trim();
      if (!validItemId) {
        throw new Error('无效的商品ID');
      }
      
      console.log('删除商品 ID:', validItemId);
      const result = await itemManager.deleteItem(validItemId);
      console.log('商品删除成功:', result);
      
      wx.showToast({
        title: '删除成功',
        icon: 'success'
      });
      
      // 重新加载数据
      await this.loadSoldItems();
      
    } catch (error) {
      console.error('删除失败:', error);
      
      // 更详细的错误处理
      let errorMessage = '删除失败';
      if (error.message) {
        errorMessage = error.message;
      } else if (error.code && error.message) {
        errorMessage = error.message;
      }
      
      wx.showToast({
        title: errorMessage,
        icon: 'none',
        duration: 2000
      });
    }
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
    
    // 添加调试日志
    console.log('deleteItem - itemId:', itemId);
    console.log('deleteItem - dataset:', e.currentTarget.dataset);
    
    if (!itemId) {
      wx.showToast({
        title: '商品ID不存在',
        icon: 'none'
      });
      return;
    }
    
    const item = this.data.soldItems.find(item => item.id == itemId); // 使用 == 而不是 ===，防止类型不匹配
    
    if (!item) {
      wx.showToast({
        title: '找不到对应的商品',
        icon: 'none'
      });
      return;
    }
    
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
  
  // 显示价格编辑弹窗
  showEditPrice(e) {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    const itemId = e.currentTarget.dataset.itemId;
    const item = this.data.soldItems.find(item => item.id === itemId);
    
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
      await this.loadSoldItems();
      
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