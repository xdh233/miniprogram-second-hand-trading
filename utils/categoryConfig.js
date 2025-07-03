// 1. 创建一个统一的分类配置文件 utils/categoryConfig.js

const categoryConfig = {
  // 统一的分类定义
  categories: [
    { id: 1, value: 'electronics', name: '数码电子' },
    { id: 2, value: 'daily', name: '生活用品' },
    { id: 3, value: 'books', name: '教材书籍' },
    { id: 4, value: 'clothing', name: '服装配饰' },
    { id: 5, value: 'sports', name: '运动用品' },
    { id: 6, value: 'makeup', name: '化妆护肤' },
    { id: 7, value: 'snacks', name: '美食零食' },
    { id: 8, value: 'furniture', name: '家具家电' },
    { id: 9, value: 'other', name: '其他' }
  ],

  // 根据ID获取分类信息
  getCategoryById(id) {
    return this.categories.find(cat => cat.id === id) || this.categories.find(cat => cat.value === 'other');
  },

  // 根据value获取分类信息
  getCategoryByValue(value) {
    return this.categories.find(cat => cat.value === value) || this.categories.find(cat => cat.value === 'other');
  },

  // 根据ID获取分类名称
  getCategoryNameById(id) {
    const category = this.getCategoryById(id);
    return category ? category.name : '其他';
  },

  // 根据value获取分类ID
  getCategoryIdByValue(value) {
    const category = this.getCategoryByValue(value);
    return category ? category.id : 9; // 默认为"其他"
  },

  // 获取所有分类（用于选择器）
  getAllCategories() {
    return this.categories.map(cat => ({
      value: cat.value,
      name: cat.name
    }));
  },

  // 获取市场页面用的分类（包含"全部"选项）
  getMarketCategories() {
    return [
      { id: 'all', name: '全部' },
      ...this.categories
    ];
  }
};

module.exports = categoryConfig;