// utils/categoryConfig.js - 修改版：后端数据库为主，前端配置为备用
const apiConfig = require('./apiConfig');

class CategoryConfig {
  constructor() {
    // 缓存分类数据
    this.categories = [];
    this.categoriesMap = new Map(); // id -> category 的映射
    this.isLoaded = false;
    this.isLoading = false;
    
    // 本地存储键名
    this.STORAGE_KEY = 'cached_categories';
    
    // 默认分类（作为备用）
    this.defaultCategories = [
      { id: 1, name: '数码电子', value: 'electronics', sort_order: 1 },
      { id: 2, name: '生活用品', value: 'books', sort_order: 2 },
      { id: 3, name: '教材书籍', value: 'daily', sort_order: 3 },
      { id: 4, name: '服装配饰', value: 'clothing', sort_order: 4 },
      { id: 5, name: '运动用品', value: 'sports', sort_order: 5 },
      { id: 6, name: '化妆护肤', value: 'beauty', sort_order: 6 },
      { id: 7, name: '美食零食', value: 'beauty', sort_order: 7 },
      { id: 8, name: '家具家电', value: 'furniture', sort_order: 8 },
      { id: 9, name: '其他', value: 'other', sort_order: 9 }
    ];
  }

  // 初始化分类数据（优先使用后端，降级到缓存，最后使用默认）
  async init() {
    if (this.isLoaded || this.isLoading) {
      return this.categories;
    }
    
    this.isLoading = true;
    
    try {
      // 1. 尝试从后端获取最新数据
      const onlineCategories = await this.fetchCategoriesFromServer();
      if (onlineCategories && onlineCategories.length > 0) {
        console.log('✅ 从服务器获取分类成功:', onlineCategories.length, '个');
        this.setCategories(onlineCategories);
        this.saveCategoriesCache(onlineCategories);
        return this.categories;
      }
    } catch (error) {
      console.warn('⚠️ 从服务器获取分类失败:', error.message);
    }
    
    try {
      // 2. 尝试从本地缓存获取
      const cachedCategories = this.loadCategoriesCache();
      if (cachedCategories && cachedCategories.length > 0) {
        console.log('📦 使用缓存分类:', cachedCategories.length, '个');
        this.setCategories(cachedCategories);
        return this.categories;
      }
    } catch (error) {
      console.warn('⚠️ 加载缓存分类失败:', error.message);
    }
    
    // 3. 最后使用默认分类
    console.log('🔄 使用默认分类备用方案');
    this.setCategories(this.defaultCategories);
    return this.categories;
  }

  // 从服务器获取分类数据
  async fetchCategoriesFromServer() {
    try {
      const response = await apiConfig.get('/categories');
      
      if (response.success && response.categories) {
        return response.categories.map(cat => ({
          id: cat.id,
          name: cat.name || cat.category_name,
          value: cat.value || cat.category_value || `cat_${cat.id}`,
          sort_order: cat.sort_order || 1,
          description: cat.description || '',
          icon: cat.icon || '',
          created_at: cat.created_at,
          updated_at: cat.updated_at
        }));
      } else {
        throw new Error('服务器返回数据格式错误');
      }
    } catch (error) {
      console.error('获取服务器分类失败:', error);
      throw error;
    }
  }

  // 设置分类数据并更新状态
  setCategories(categories) {
    this.categories = [...categories];
    this.updateCategoriesMap();
    this.isLoaded = true;
    this.isLoading = false;
  }

  // 更新分类映射表
  updateCategoriesMap() {
    this.categoriesMap.clear();
    this.categories.forEach(cat => {
      this.categoriesMap.set(cat.id, cat);
      this.categoriesMap.set(cat.value, cat); // 同时支持按value查找
    });
  }

  // 保存分类到本地缓存
  saveCategoriesCache(categories) {
    try {
      const cacheData = {
        categories: categories,
        timestamp: Date.now(),
      };
      
      wx.setStorageSync(this.STORAGE_KEY, cacheData);
      console.log('💾 分类数据已缓存');
    } catch (error) {
      console.error('保存分类缓存失败:', error);
    }
  }

  // 从本地缓存加载分类
  loadCategoriesCache() {
    try {
      const cacheData = wx.getStorageSync(this.STORAGE_KEY);
      
      if (!cacheData || !cacheData.categories) {
        return null;
      }
      
      // 检查缓存是否过期（24小时）
      const now = Date.now();
      const cacheAge = now - cacheData.timestamp;
      const maxAge = 24 * 60 * 60 * 1000; // 24小时
      
      if (cacheAge > maxAge) {
        console.log('📅 缓存已过期，需要更新');
        wx.removeStorageSync(this.STORAGE_KEY);
        return null;
      }
      
      return cacheData.categories;
    } catch (error) {
      console.error('读取分类缓存失败:', error);
      return null;
    }
  }

  // 强制刷新分类数据
  async refresh() {
    this.isLoaded = false;
    this.isLoading = false;
    this.categories = [];
    this.categoriesMap.clear();
    
    return await this.init();
  }

  // ===================
  // 对外提供的方法
  // ===================

  // 获取所有分类（确保数据已加载）
  async getAllCategories() {
    if (!this.isLoaded) {
      await this.init();
    }
    return this.categories;
  }

  // 获取分类用于选择器
  async getAllCategoriesForPicker() {
    const categories = await this.getAllCategories();
    return categories.map(cat => ({
      name: cat.name,
      id:cat.id,
      value: cat.value || cat.id.toString()
    }));
  }

  // 获取市场页面使用的分类（包含"全部"选项）
  async getMarketCategories() {
    const categories = await this.getAllCategories();
    return [
      { id: 'all', name: '全部', value: 'all' },
      ...categories
    ];
  }

  // 根据ID获取分类
  async getCategoryById(id) {
    if (!this.isLoaded) {
      await this.init();
    }
    return this.categoriesMap.get(id);
  }
// 优化后的 getCategoryIdByValue 方法
async getCategoryIdByValue(value) {
  // 参数验证
  if (!value) {
    console.warn('getCategoryIdByValue: 参数 value 为空');
    return 1; // 返回默认分类ID
  }

  // 确保分类数据已加载
  if (!this.isLoaded) {
    await this.init();
  }

  // 1. 优先从映射表中查找（支持 id 和 value 两种查找方式）
  const categoryFromMap = this.categoriesMap.get(value);
  if (categoryFromMap && categoryFromMap.id) {
    return categoryFromMap.id;
  }

  // 2. 如果value是数字字符串，尝试作为ID查找
  if (/^\d+$/.test(value)) {
    const numericId = parseInt(value, 10);
    const categoryById = this.categoriesMap.get(numericId);
    if (categoryById && categoryById.id) {
      return categoryById.id;
    }
  }

  // 3. 遍历分类数组进行模糊匹配
  const foundCategory = this.categories.find(cat => {
    // 精确匹配 value 或 id
    if (cat.value === value || cat.id.toString() === value) {
      return true;
    }
    
    // 忽略大小写匹配
    if (cat.value && cat.value.toLowerCase() === value.toLowerCase()) {
      return true;
    }
    
    // 匹配分类名称（支持中文）
    if (cat.name === value) {
      return true;
    }
    
    return false;
  });

  if (foundCategory) {
    // 更新映射表以提高后续查找效率
    this.categoriesMap.set(value, foundCategory);
    return foundCategory.id;
  }

  // 4. 使用备用映射表
  const fallbackMapping = {
    'electronics': 1,    // 数码电子
    'daily': 2,          // 生活用品  
    'books': 3,          // 教材书籍
    'clothing': 4,       // 服装配饰
    'sports': 5,         // 运动用品
    'makeup': 6,         // 化妆护肤
    'snacks': 7,           // 美食零食
    'furniture': 8,      // 家具家电
    'other': 9,          // 其他
  };

  // 先尝试精确匹配
  let fallbackId = fallbackMapping[value];
  
  // 如果没有精确匹配，尝试忽略大小写匹配
  if (!fallbackId && typeof value === 'string') {
    fallbackId = fallbackMapping[value.toLowerCase()];
  }

  if (fallbackId) {
    console.warn(`使用备用映射: "${value}" -> ${fallbackId}`);
    return fallbackId;
  }

  // 5. 最后的默认值
  console.warn(`分类值 "${value}" 未找到对应ID，使用默认分类1`);
  return 1;
}

  // 根据ID获取分类名称
  async getCategoryNameById(id) {
    const category = await this.getCategoryById(id);
    return category ? category.name : '未知分类';
  }

  // 获取默认分类（备用方案）
  getDefaultCategories() {
    return [...this.defaultCategories];
  }

}
// 创建单例
const categoryConfig = new CategoryConfig();

module.exports = categoryConfig;