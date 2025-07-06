const BaseManager = require('./baseManager');
const apiConfig = require('./apiConfig');

class categoryConfig extends BaseManager {
  constructor() {
    super('campus_categories');
    
    // 本地默认分类配置（作为fallback）
    this.defaultCategories = [
      { id: 1, value: 'electronics', name: '数码电子', sort_order: 1 },
      { id: 2, value: 'daily', name: '生活用品', sort_order: 2 },
      { id: 3, value: 'books', name: '教材书籍', sort_order: 3 },
      { id: 4, value: 'clothing', name: '服装配饰', sort_order: 4 },
      { id: 5, value: 'sports', name: '运动用品', sort_order: 5 },
      { id: 6, value: 'makeup', name: '化妆护肤', sort_order: 6 },
      { id: 7, value: 'snacks', name: '美食零食', sort_order: 7 },
      { id: 8, value: 'furniture', name: '家具家电', sort_order: 8 },
      { id: 9, value: 'other', name: '其他', sort_order: 9 }
    ];
    
    // 初始化时检查本地缓存
    this.initializeCategories();
  }

  // 初始化分类数据
  initializeCategories() {
    const cached = this.getAll();
    if (!cached.length) {
      // 如果没有缓存，使用默认配置
      this.save(this.defaultCategories);
      console.log('使用默认分类配置');
    }
  }

  // 获取所有分类（优先使用缓存）
  getCategories() {
    const cached = this.getAll();
    return cached.length ? cached : this.defaultCategories;
  }

  // 从服务器同步分类数据（可选，低优先级）
  async syncFromServer() {
    try {
      const data = await apiConfig.get('/categories');
      if (data.success && data.categories) {
        // 按 sort_order 排序
        const sortedCategories = data.categories.sort((a, b) => a.sort_order - b.sort_order);
        this.save(sortedCategories);
        console.log('分类数据已从服务器同步');
        return sortedCategories;
      }
    } catch (error) {
      console.log('服务器同步失败，使用本地分类:', error.message);
    }
    
    // 同步失败时返回本地数据
    return this.getCategories();
  }

  // 根据ID获取分类信息
  getCategoryById(id) {
    const categories = this.getCategories();
    return categories.find(cat => cat.id === parseInt(id)) || 
           categories.find(cat => cat.value === 'other');
  }

  // 根据value获取分类信息
  getCategoryByValue(value) {
    const categories = this.getCategories();
    return categories.find(cat => cat.value === value) || 
           categories.find(cat => cat.value === 'other');
  }

  // 根据ID获取分类名称
  getCategoryNameById(id) {
    const category = this.getCategoryById(id);
    return category ? category.name : '其他';
  }

  // 根据value获取分类ID
  getCategoryIdByValue(value) {
    const category = this.getCategoryByValue(value);
    return category ? category.id : 9; // 默认为"其他"
  }

  // 获取所有分类（用于发布页面选择器）
  getAllCategoriesForPicker() {
    const categories = this.getCategories();
    return categories.map(cat => ({
      value: cat.value,
      name: cat.name,
      id: cat.id
    }));
  }

  // 获取市场页面用的分类（包含"全部"选项）
  getMarketCategories() {
    const categories = this.getCategories();
    return [
      { id: 'all', value: 'all', name: '全部' },
      ...categories
    ];
  }

  // 根据分类获取样式类名（可用于显示不同颜色的标签）
  getCategoryStyleClass(categoryValue) {
    const styleMap = {
      'electronics': 'category-electronics',
      'daily': 'category-daily', 
      'books': 'category-books',
      'clothing': 'category-clothing',
      'sports': 'category-sports',
      'makeup': 'category-makeup',
      'snacks': 'category-snacks',
      'furniture': 'category-furniture',
      'other': 'category-other'
    };
    return styleMap[categoryValue] || 'category-other';
  }

  // 检查分类是否有效
  isValidCategory(categoryValue) {
    const categories = this.getCategories();
    return categories.some(cat => cat.value === categoryValue);
  }

  // 应用启动时的数据检查和同步（可选）
  async checkAndSync() {
    const lastSyncTime = wx.getStorageSync('categories_last_sync') || 0;
    const now = Date.now();
    const ONE_WEEK = 7 * 24 * 60 * 60 * 1000; // 一周
    
    // 如果超过一周没同步，尝试从服务器同步
    if (now - lastSyncTime > ONE_WEEK) {
      console.log('分类数据超过一周未同步，尝试从服务器更新...');
      await this.syncFromServer();
      wx.setStorageSync('categories_last_sync', now);
    }
    
    return this.getCategories();
  }
}

module.exports = new categoryConfig();