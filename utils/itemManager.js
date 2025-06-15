// utils/itemManager.js - 商品管理工具类

class ItemManager {
  constructor() {
    this.ITEMS_KEY = 'campus_items'; // 存储所有商品的key
    this.CATEGORIES_KEY = 'item_categories'; // 商品分类
    this.LIKED_ITEMS_KEY = 'liked_items'; // 用户收藏的商品
    this.init();
  }

  // 初始化，创建一些测试数据
  init() {
    const items = this.getAllItems();
    if (items.length === 0) {
      this.createMockData();
    }
    
    // 初始化分类数据
    const categories = this.getCategories();
    if (categories.length === 0) {
      this.initCategories();
    }
  }

  // 初始化商品分类
  initCategories() {
    const categories = [
      { id: 1, name: '数码电子', icon: '📱', description: '手机、电脑、相机等' },
      { id: 2, name: '生活用品', icon: '🏠', description: '日用品、家居用品等' },
      { id: 3, name: '学习用品', icon: '📚', description: '书籍、文具、学习资料等' },
      { id: 4, name: '服装配饰', icon: '👕', description: '衣服、鞋子、包包等' },
      { id: 5, name: '运动器材', icon: '⚽', description: '运动用品、健身器材等' },
      { id: 6, name: '化妆护肤', icon: '💄', description: '化妆品、护肤品等' },
      { id: 7, name: '食品零食', icon: '🍿', description: '零食、特产等' },
      { id: 8, name: '其他商品', icon: '🎁', description: '其他未分类商品' }
    ];
    
    wx.setStorageSync(this.CATEGORIES_KEY, categories);
  }

  // 创建模拟数据
  createMockData() {
    const mockItems = [
      {
        id: this.generateId(),
        title: 'iPhone 13 Pro 128GB 深空灰色',
        description: '自用iPhone 13 Pro，购买不到一年，九成五新。功能完好，外观无明显划痕，一直贴膜使用。包装盒和配件齐全，支持当面验货。因为换了新机型所以出售，价格可小刀。',
        price: '4500',
        images: ['/images/phone1.jpg', '/images/phone2.jpg'],
        categoryId: 1,
        category: '数码电子',
        condition: '95成新',
        isNegotiable: true,
        sellerId: 1,
        sellerName: '张三',
        sellerAvatar: '/images/avatar1.jpg',
        status: 'active',
        publishTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        viewCount: 25,
        likeCount: 3,
        tradeMethods: ['face_to_face', 'express'],
        tradeLocation: '学校南门',
        phone: '13812345678',
        tags: ['苹果', '手机', '数码']
      },
      {
        id: this.generateId(),
        title: '护眼台灯 全新未拆封',
        description: '全新护眼台灯，买重了，原价120，现80出售。品牌是飞利浦，有护眼认证，适合学习使用。',
        price: '80',
        images: ['/images/lamp1.jpg'],
        categoryId: 2,
        category: '生活用品',
        condition: '全新',
        isNegotiable: false,
        sellerId: 2,
        sellerName: '李四',
        sellerAvatar: '/images/avatar2.jpg',
        status: 'active',
        publishTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        viewCount: 12,
        likeCount: 1,
        tradeMethods: ['face_to_face'],
        tradeLocation: '图书馆',
        phone: '13898765432',
        tags: ['台灯', '护眼', '学习']
      }
    ];

    wx.setStorageSync(this.ITEMS_KEY, mockItems);
    console.log('初始化商品模拟数据');
  }

  // 生成唯一ID
  generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  // 获取所有商品
  getAllItems() {
    try {
      return wx.getStorageSync(this.ITEMS_KEY) || [];
    } catch (error) {
      console.error('获取商品数据失败:', error);
      return [];
    }
  }

  // 保存商品数据
  saveItems(items) {
    try {
      wx.setStorageSync(this.ITEMS_KEY, items);
      return true;
    } catch (error) {
      console.error('保存商品数据失败:', error);
      return false;
    }
  }

  // 获取商品分类
  getCategories() {
    try {
      return wx.getStorageSync(this.CATEGORIES_KEY) || [];
    } catch (error) {
      console.error('获取分类数据失败:', error);
      return [];
    }
  }

  // 根据ID获取单个商品
  getItemById(itemId) {
    const items = this.getAllItems();
    return items.find(item => item.id === itemId);
  }

  // 发布新商品
  publishItem(itemData, sellerId) {
    return new Promise((resolve, reject) => {
      try {
        // 数据验证
        if (!itemData.title || !itemData.price || !itemData.categoryId) {
          reject({ code: 400, message: '请填写完整的商品信息' });
          return;
        }

        if (!itemData.images || itemData.images.length === 0) {
          reject({ code: 400, message: '请至少上传一张商品图片' });
          return;
        }

        const items = this.getAllItems();
        const categories = this.getCategories();
        const category = categories.find(cat => cat.id === itemData.categoryId);

        const newItem = {
          id: this.generateId(),
          title: itemData.title,
          description: itemData.description || '',
          price: itemData.price,
          images: itemData.images,
          categoryId: itemData.categoryId,
          category: category ? category.name : '其他',
          condition: itemData.condition,
          isNegotiable: itemData.isNegotiable || false,
          sellerId: sellerId,
          sellerName: itemData.sellerName || '',
          sellerAvatar: itemData.sellerAvatar || '',
          status: 'active',
          publishTime: new Date().toISOString(),
          viewCount: 0,
          likeCount: 0,
          tradeMethods: itemData.tradeMethods || ['face_to_face'],
          tradeLocation: itemData.tradeLocation || '',
          phone: itemData.phone || '',
          wechat: itemData.wechat || '',
          tags: this.generateTags(itemData.title, itemData.description)
        };

        items.unshift(newItem);
        
        if (this.saveItems(items)) {
          resolve({
            code: 200,
            message: '商品发布成功',
            data: newItem
          });
        } else {
          reject({ code: 500, message: '发布失败，请重试' });
        }

      } catch (error) {
        console.error('发布商品失败:', error);
        reject({ code: 500, message: '发布失败，请重试' });
      }
    });
  }

  // 更新商品信息
  updateItem(itemId, updateData) {
    return new Promise((resolve, reject) => {
      try {
        const items = this.getAllItems();
        const itemIndex = items.findIndex(item => item.id === itemId);

        if (itemIndex === -1) {
          reject({ code: 404, message: '商品不存在' });
          return;
        }

        // 更新商品信息
        items[itemIndex] = {
          ...items[itemIndex],
          ...updateData,
          updatedTime: new Date().toISOString()
        };

        if (this.saveItems(items)) {
          resolve({
            code: 200,
            message: '更新成功',
            data: items[itemIndex]
          });
        } else {
          reject({ code: 500, message: '更新失败' });
        }

      } catch (error) {
        console.error('更新商品失败:', error);
        reject({ code: 500, message: '更新失败' });
      }
    });
  }

  // 删除商品
  deleteItem(itemId, sellerId) {
    return new Promise((resolve, reject) => {
      try {
        const items = this.getAllItems();
        const itemIndex = items.findIndex(item => item.id === itemId);

        if (itemIndex === -1) {
          reject({ code: 404, message: '商品不存在' });
          return;
        }

        // 验证权限
        if (items[itemIndex].sellerId !== sellerId) {
          reject({ code: 403, message: '无权限删除此商品' });
          return;
        }

        items.splice(itemIndex, 1);

        if (this.saveItems(items)) {
          resolve({ code: 200, message: '删除成功' });
        } else {
          reject({ code: 500, message: '删除失败' });
        }

      } catch (error) {
        console.error('删除商品失败:', error);
        reject({ code: 500, message: '删除失败' });
      }
    });
  }

  // 搜索商品
  searchItems(keyword, filters = {}) {
    const items = this.getAllItems();
    let filteredItems = items.filter(item => item.status === 'active');

    // 关键词搜索
    if (keyword && keyword.trim()) {
      const lowerKeyword = keyword.toLowerCase();
      filteredItems = filteredItems.filter(item => 
        item.title.toLowerCase().includes(lowerKeyword) ||
        item.description.toLowerCase().includes(lowerKeyword) ||
        item.tags.some(tag => tag.toLowerCase().includes(lowerKeyword))
      );
    }

    // 分类筛选
    if (filters.categoryId) {
      filteredItems = filteredItems.filter(item => item.categoryId === filters.categoryId);
    }

    // 价格范围筛选
    if (filters.minPrice !== undefined) {
      filteredItems = filteredItems.filter(item => parseFloat(item.price) >= filters.minPrice);
    }
    if (filters.maxPrice !== undefined) {
      filteredItems = filteredItems.filter(item => parseFloat(item.price) <= filters.maxPrice);
    }

    // 新旧程度筛选
    if (filters.condition) {
      filteredItems = filteredItems.filter(item => item.condition === filters.condition);
    }

    // 排序
    if (filters.sortBy) {
      switch (filters.sortBy) {
        case 'price_asc':
          filteredItems.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
          break;
        case 'price_desc':
          filteredItems.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
          break;
        case 'time_desc':
          filteredItems.sort((a, b) => new Date(b.publishTime) - new Date(a.publishTime));
          break;
        case 'popular':
          filteredItems.sort((a, b) => (b.viewCount + b.likeCount) - (a.viewCount + a.likeCount));
          break;
      }
    } else {
      // 默认按发布时间倒序
      filteredItems.sort((a, b) => new Date(b.publishTime) - new Date(a.publishTime));
    }

    return filteredItems;
  }

  // 获取用户发布的商品
  getUserItems(sellerId) {
    const items = this.getAllItems();
    return items
      .filter(item => item.sellerId === sellerId)
      .sort((a, b) => new Date(b.publishTime) - new Date(a.publishTime));
  }

  // 获取相关推荐商品
  getRelatedItems(itemId, categoryId, limit = 4) {
    const items = this.getAllItems();
    return items
      .filter(item => 
        item.id !== itemId && 
        item.categoryId === categoryId && 
        item.status === 'active'
      )
      .sort((a, b) => (b.viewCount + b.likeCount) - (a.viewCount + a.likeCount))
      .slice(0, limit);
  }

  // 增加浏览次数
  incrementViewCount(itemId) {
    const items = this.getAllItems();
    const itemIndex = items.findIndex(item => item.id === itemId);
    
    if (itemIndex !== -1) {
      items[itemIndex].viewCount = (items[itemIndex].viewCount || 0) + 1;
      this.saveItems(items);
    }
  }

  // 商品上架/下架
  toggleItemStatus(itemId, sellerId) {
    return new Promise((resolve, reject) => {
      try {
        const items = this.getAllItems();
        const itemIndex = items.findIndex(item => item.id === itemId);

        if (itemIndex === -1) {
          reject({ code: 404, message: '商品不存在' });
          return;
        }

        if (items[itemIndex].sellerId !== sellerId) {
          reject({ code: 403, message: '无权限操作此商品' });
          return;
        }

        const newStatus = items[itemIndex].status === 'active' ? 'inactive' : 'active';
        items[itemIndex].status = newStatus;
        items[itemIndex].updatedTime = new Date().toISOString();

        if (this.saveItems(items)) {
          resolve({
            code: 200,
            message: newStatus === 'active' ? '商品已上架' : '商品已下架',
            data: { status: newStatus }
          });
        } else {
          reject({ code: 500, message: '操作失败' });
        }

      } catch (error) {
        console.error('切换商品状态失败:', error);
        reject({ code: 500, message: '操作失败' });
      }
    });
  }

  // 生成商品标签
  generateTags(title, description) {
    const text = (title + ' ' + description).toLowerCase();
    const commonTags = [
      '手机', '电脑', '书籍', '衣服', '鞋子', '包包', '化妆品', '护肤品',
      '台灯', '文具', '运动', '健身', '零食', '数码', '电子', '生活用品'
    ];
    
    return commonTags.filter(tag => text.includes(tag));
  }

  // 获取热门商品
  getHotItems(limit = 10) {
    const items = this.getAllItems();
    return items
      .filter(item => item.status === 'active')
      .sort((a, b) => {
        const scoreA = (a.viewCount || 0) * 1 + (a.likeCount || 0) * 3;
        const scoreB = (b.viewCount || 0) * 1 + (b.likeCount || 0) * 3;
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  // 获取最新商品
  getLatestItems(limit = 10) {
    const items = this.getAllItems();
    return items
      .filter(item => item.status === 'active')
      .sort((a, b) => new Date(b.publishTime) - new Date(a.publishTime))
      .slice(0, limit);
  }

  // 获取用户收藏的商品
  getLikedItems(userId) {
    try {
      const likedIds = wx.getStorageSync(this.LIKED_ITEMS_KEY + '_' + userId) || [];
      const items = this.getAllItems();
      return items.filter(item => likedIds.includes(item.id));
    } catch (error) {
      console.error('获取收藏商品失败:', error);
      return [];
    }
  }

  // 切换收藏状态
  toggleLike(itemId, userId) {
    try {
      const key = this.LIKED_ITEMS_KEY + '_' + userId;
      let likedIds = wx.getStorageSync(key) || [];
      
      const index = likedIds.indexOf(itemId);
      if (index > -1) {
        likedIds.splice(index, 1);
      } else {
        likedIds.push(itemId);
      }
      
      wx.setStorageSync(key, likedIds);
      
      // 更新商品的点赞数
      const items = this.getAllItems();
      const itemIndex = items.findIndex(item => item.id === itemId);
      if (itemIndex !== -1) {
        items[itemIndex].likeCount = (items[itemIndex].likeCount || 0) + (index > -1 ? -1 : 1);
        this.saveItems(items);
      }
      
      return index === -1; // 返回是否已收藏
    } catch (error) {
      console.error('切换收藏状态失败:', error);
      return false;
    }
  }

  // 清除所有数据（调试用）
  debugClearAll() {
    try {
      wx.removeStorageSync(this.ITEMS_KEY);
      wx.removeStorageSync(this.CATEGORIES_KEY);
      console.log('已清空所有商品数据');
      return true;
    } catch (error) {
      console.error('清空数据失败:', error);
      return false;
    }
  }
}

// 创建单例
const itemManager = new ItemManager();

module.exports = itemManager;