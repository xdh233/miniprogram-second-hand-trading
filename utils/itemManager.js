const BaseManager = require('./baseManager');  
const sharedTools = require('./sharedTools');
class ItemManager extends BaseManager {
  constructor() {
    super('campus_items');
    this.CATEGORIES_KEY = 'item_categories';
    this.LIKED_ITEMS_KEY = 'liked_items';
    this.init();
  }

  init() {
    const items = this.getAll();
    if (items.length === 0) {
      this.createMockData();
    }
    
    const categories = this.getCategories();
    if (categories.length === 0) {
      this.initCategories();
    }
  }

  // 初始化商品分类
  initCategories() {
    const categories = [
      { id: 1, name: '数码电子', icon: '📱' },
      { id: 2, name: '生活用品', icon: '🏠' },
      { id: 3, name: '学习用品', icon: '📚' },
      { id: 4, name: '服装配饰', icon: '👕' },
      { id: 5, name: '运动器材', icon: '⚽' },
      { id: 6, name: '化妆护肤', icon: '💄' },
      { id: 7, name: '食品零食', icon: '🍿' },
      { id: 8, name: '其他商品', icon: '🎁' }
    ];
    
    wx.setStorageSync(this.CATEGORIES_KEY, categories);
  }

  // 创建模拟数据
  createMockData() {
    const mockItems = [
      {
        id: 1,
        title: 'iPhone 13 Pro 128GB 深空灰色',
        description: '自用iPhone 13 Pro，购买不到一年，九成五新。功能完好，外观无明显划痕，一直贴膜使用。包装盒和配件齐全，支持当面验货。因为换了新机型所以出售，价格可小刀。',
        price: '4500',
        images: ['/images/phone1.jpg', '/images/phone1.jpg'],
        categoryId: 1,
        category: '数码电子',
        sellerId: 1,
        sellerName: '张三',
        sellerNickname: '三张',
        sellerAvatar: '/images/default-avatar.jpg',
        status: 'active',
        tradeType: 'sell',
        createTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        timeAgo: '2天前',
        viewCount: 25,
        likeCount: 3,
        comments: 0
      },
      {
        id: 2,
        title: 'xbox游戏手柄',
        description: 'xbox游戏手柄 黑色 买来未使用过一直闲置 适配pc端',
        price: '315',
        images: ['/images/xbox.png'],
        categoryId: 1,
        category: '数码电子',
        sellerId: 2,
        sellerName: '李四',
        sellerNickname: '四李',
        sellerAvatar: '/images/default-avatar.jpg',
        status: 'active',
        tradeType: 'sell',
        createTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        timeAgo: '一天前',
        viewCount: 120,
        likeCount: 7,
        comments: 0
      }
      // ... 其他商品数据
    ];
    this.save(mockItems);
    console.log('初始化商品模拟数据');
  }

  // 获取单个商品详情
  getItemDetail(itemId) {
    return new Promise((resolve, reject) => {
      console.log('getItemDetail 被调用，itemId:', itemId, '类型:', typeof itemId);
      
      const item = this.getById(itemId);
      console.log('找到的商品:', item);
      
      if (item) {
        item.timeAgo = sharedTools.formatTimeAgo(item.createTime);
        resolve(item);
      } else {
        console.log('未找到商品，itemId:', itemId);
        reject({ message: '商品不存在' });
      }
    });
  }
  // 通过id获取
  getItemById(itemId) {
    return this.getById(itemId);
  }
  // 获取商品列表
  getItems(page = 1, limit = 10) {
    return new Promise((resolve) => {
      const allItems = this.getAll();
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      
      allItems.sort((a, b) => new Date(b.createTime) - new Date(a.createTime));
      
      const items = allItems.slice(startIndex, endIndex);
      const hasMore = endIndex < allItems.length;
      
      setTimeout(() => {
        resolve({
          items: items,
          hasMore: hasMore,
          total: allItems.length
        });
      }, 500);
    });
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

  // 发布新商品
  publishItem(itemData, sellerId) {
    return new Promise((resolve, reject) => {
      try {
        if (!itemData.title || !itemData.price || !itemData.categoryId) {
          reject({ code: 400, message: '请填写完整的商品信息' });
          return;
        }

        if (!itemData.images || itemData.images.length === 0) {
          reject({ code: 400, message: '请至少上传一张商品图片' });
          return;
        }

        const categories = this.getCategories();
        const category = categories.find(cat => cat.id === itemData.categoryId);

        const newItem = {
          id: Date.now(),
          title: itemData.title,
          description: itemData.description || '',
          price: itemData.price,
          images: itemData.images,
          categoryId: itemData.categoryId,
          category: category ? category.name : '其他',
          sellerId: sellerId,
          sellerName: itemData.sellerName || '',
          sellerNickname: itemData.sellerNickname || itemData.sellerName || '',
          sellerAvatar: itemData.sellerAvatar || '',
          status: 'active',
          tradeType: 'sell',
          createTime: new Date().toISOString(),
          viewCount: 0,
          likeCount: 0,
          comments: 0
        };

        if (this.add(newItem)) {
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

  // 商品点赞/取消点赞
  toggleLike(itemId) {
    return new Promise(async (resolve, reject) => {
      try {
        const userManager = require('./userManager');
        const currentUser = userManager.getCurrentUser();
        
        if (!currentUser) {
          reject({ message: '请先登录' });
          return;
        }

        const item = this.getById(itemId);
        if (!item) {
          reject({ message: '商品不存在' });
          return;
        }

        const newLikeState = !item.isLiked;
        const updatedItem = {
          ...item,
          isLiked: newLikeState,
          likes: newLikeState ? (item.likes || 0) + 1 : Math.max(0, (item.likes || 0) - 1)
        };

        const result = this.update(itemId, updatedItem);
        if (result) {
          if (newLikeState) {
            const notifyManager = require('./notifyManager');
            await notifyManager.createItemLikeNotification(
              currentUser.id,
              currentUser.nickname || currentUser.name,
              currentUser.avatar || '/images/default-avatar.png',
              itemId,
              item.title,
              item.sellerId
            );
          }
          
          resolve({
            isLiked: updatedItem.isLiked,
            likes: updatedItem.likes
          });
        } else {
          reject({ message: '操作失败' });
        }
      } catch (error) {
        console.error('商品点赞操作失败:', error);
        reject({ message: '操作失败' });
      }
    });
  }

  // 更新商品评论数（供commentManager调用）
  updateCommentsCount(itemId, count) {
    return this.update(itemId, { comments: count });
  }

  // 增加浏览次数
  incrementViewCount(itemId) {
    const item = this.getById(itemId);
    if (item) {
      this.update(itemId, { viewCount: (item.viewCount || 0) + 1 });
    }
  }

  // 搜索商品
  searchItems(keyword, filters = {}) {
    return new Promise((resolve) => {
      const items = this.getAll();
      let filteredItems = items.filter(item => item.status === 'active');

      if (keyword && keyword.trim()) {
        const lowerKeyword = keyword.toLowerCase();
        filteredItems = filteredItems.filter(item => 
          item.title.toLowerCase().includes(lowerKeyword) ||
          item.description.toLowerCase().includes(lowerKeyword)
        );
      }

      if (filters.categoryId) {
        filteredItems = filteredItems.filter(item => item.categoryId === filters.categoryId);
      }

      if (filters.minPrice !== undefined) {
        filteredItems = filteredItems.filter(item => parseFloat(item.price) >= filters.minPrice);
      }
      if (filters.maxPrice !== undefined) {
        filteredItems = filteredItems.filter(item => parseFloat(item.price) <= filters.maxPrice);
      }

      if (filters.sortBy) {
        switch (filters.sortBy) {
          case 'price_asc':
            filteredItems.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
            break;
          case 'price_desc':
            filteredItems.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
            break;
          case 'time_desc':
            filteredItems.sort((a, b) => new Date(b.createTime) - new Date(a.createTime));
            break;
          case 'popular':
            filteredItems.sort((a, b) => (b.viewCount + b.likeCount) - (a.viewCount + a.likeCount));
            break;
        }
      } else {
        filteredItems.sort((a, b) => new Date(b.createTime) - new Date(a.createTime));
      }

      setTimeout(() => {
        resolve(filteredItems);
      }, 300);
    });
  }

  // 获取用户发布的商品
  getUserItems(sellerId) {
    const items = this.getAll();
    return items
      .filter(item => item.sellerId === sellerId)
      .sort((a, b) => new Date(b.createTime) - new Date(a.createTime));
  }
}

module.exports = new ItemManager();
