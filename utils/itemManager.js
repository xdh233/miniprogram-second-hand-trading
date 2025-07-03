const BaseManager = require('./baseManager');  
const sharedTools = require('./sharedTools');
const categoryConfig = require('./categoryConfig'); // 引入统一分类配置

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
        category: categoryConfig.getCategoryNameById(1),
        sellerId: 1,
        sellerName: '张三',
        sellerNickname: '三张',
        sellerAvatar: '/images/default-avatar.jpg',
        status: 'selling',
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
        category: categoryConfig.getCategoryNameById(1),
        sellerId: 2,
        sellerName: '李四',
        sellerNickname: '四李',
        sellerAvatar: '/images/default-avatar.jpg',
        status: 'selling',
        tradeType: 'sell',
        createTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        timeAgo: '一天前',
        viewCount: 120,
        likeCount: 7,
        comments: 0
      },
      {
        id: 3,
        title: '护眼台灯LED书桌灯',
        description: '护眼台灯LED书桌灯 白色 全新未拆封 三档调光 USB充电 适合学习办公使用',
        price: '88',
        images: ['/images/lamp1.jpg'],
        categoryId: 2,
        category: categoryConfig.getCategoryNameById(2),
        sellerId: 2,
        sellerName: '李四',
        sellerNickname: '四李',
        sellerAvatar: '/images/default-avatar.jpg',
        status: 'selling',
        tradeType: 'sell',
        createTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        timeAgo: '两天前',
        viewCount: 85,
        likeCount: 12,
        comments: 3
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

        const category = categoryConfig.getCategoryNameById(itemData.categoryId);
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
          status: itemData.status,
          tradeType: itemData.tradeType,
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
      let filteredItems = items.filter(item => item.status === 'selling' || item.status === 'seeking');

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

  // 更新商品状态
  updateItemStatus(itemId, newStatus) {
    return new Promise((resolve, reject) => {
      try {
        console.log('更新商品状态:', { itemId, newStatus });
        
        // 验证状态值
        const validStatuses = ['sold', 'withdrawn', 'selling', 'seeking', 'bought'];
        if (!validStatuses.includes(newStatus)) {
          reject({ code: 400, message: '无效的状态值' });
          return;
        }

        // 获取商品
        const item = this.getById(itemId);
        if (!item) {
          reject({ code: 404, message: '商品不存在' });
          return;
        }

        // 更新状态和更新时间
        const updatedItem = {
          ...item,
          status: newStatus,
          updateTime: new Date().toISOString()
        };

        // 如果是标记为已售出，添加售出时间
        if (newStatus === 'sold') {
          updatedItem.soldTime = new Date().toISOString();
        }

        // 保存更新
        const result = this.update(itemId, updatedItem);
        
        if (result) {
          console.log('商品状态更新成功:', updatedItem);
          resolve({
            code: 200,
            message: '状态更新成功',
            data: updatedItem
          });
        } else {
          reject({ code: 500, message: '更新失败' });
        }

      } catch (error) {
        console.error('更新商品状态失败:', error);
        reject({ code: 500, message: '更新失败' });
      }
    });
  }

  // 更新商品价格
  updateItemPrice(itemId, newPrice) {
    return new Promise((resolve, reject) => {
      try {
        console.log('更新商品价格:', { itemId, newPrice });
        
        // 验证价格
        if (!newPrice || newPrice <= 0) {
          reject({ code: 400, message: '价格必须大于0' });
          return;
        }

        // 获取商品
        const item = this.getById(itemId);
        if (!item) {
          reject({ code: 404, message: '商品不存在' });
          return;
        }

        // 更新价格和更新时间
        const updatedItem = {
          ...item,
          price: newPrice.toString(),
          updateTime: new Date().toISOString()
        };

        // 保存更新
        const result = this.update(itemId, updatedItem);
        
        if (result) {
          console.log('商品价格更新成功:', updatedItem);
          resolve({
            code: 200,
            message: '价格更新成功',
            data: updatedItem
          });
        } else {
          reject({ code: 500, message: '更新失败' });
        }

      } catch (error) {
        console.error('更新商品价格失败:', error);
        reject({ code: 500, message: '更新失败' });
      }
    });
  }

  // 删除商品
  deleteItem(itemId) {
    return new Promise((resolve, reject) => {
      try {
        console.log('删除商品:', itemId);
        
        // 检查商品是否存在
        const item = this.getById(itemId);
        if (!item) {
          reject({ code: 404, message: '商品不存在' });
          return;
        }

        // 执行删除
        const result = this.delete(itemId);
        
        if (result) {
          console.log('商品删除成功:', itemId);
          resolve({
            code: 200,
            message: '删除成功'
          });
        } else {
          reject({ code: 500, message: '删除失败' });
        }

      } catch (error) {
        console.error('删除商品失败:', error);
        reject({ code: 500, message: '删除失败' });
      }
    });
  }
}

module.exports = new ItemManager();