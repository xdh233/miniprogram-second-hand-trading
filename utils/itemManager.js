const BaseManager = require('./baseManager');  
const sharedTools = require('./sharedTools');
const apiConfig = require('./apiConfig');

class ItemManager extends BaseManager {
  constructor() {
    super('campus_items');
    this.CATEGORIES_KEY = 'item_categories';
    this.LIKED_ITEMS_KEY = 'liked_items';
  }

  // 获取单个商品详情
  getItemDetail(itemId) {
    return new Promise((resolve, reject) => {
      console.log('getItemDetail 被调用，itemId:', itemId);
      
      if (!itemId) {
        reject({ message: '商品ID不能为空' });
        return;
      }
      
      apiConfig.get(`/items/${itemId}`)
        .then(item => {
          if (item) {
            // 添加时间格式化
            item.timeAgo = sharedTools.formatTimeAgo(item.createTime);
            // 确保isLiked是布尔值
            item.isLiked = Boolean(item.isLiked);
            
            // 处理图片URL
            item = apiConfig.processItemImages(item);
            
            resolve(item);
          } else {
            reject({ message: '商品不存在' });
          }
        })
        .catch(error => {
          console.error('获取商品详情失败:', error);
          reject({ message: error.message || '获取商品详情失败' });
        });
    });
  }

  // 通过id获取商品
  getItemById(itemId) {
    return apiConfig.get(`/items/${itemId}`);
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

        const newItemData = {
          title: itemData.title,
          description: itemData.description || '',
          price: itemData.price,
          images: itemData.images,
          category_id: itemData.categoryId,
          seller_id: sellerId,
          status: itemData.status || 'selling',
          trade_type: itemData.tradeType || 'sell'
        };

        apiConfig.post('/items', newItemData)
          .then(result => {
            resolve({
              code: 200,
              message: '商品发布成功',
              data: result
            });
          })
          .catch(error => {
            console.error('发布商品失败:', error);
            reject({ code: 500, message: error.message || '发布失败，请重试' });
          });

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

        if (!itemId) {
          reject({ message: '商品ID不能为空' });
          return;
        }

        apiConfig.post(`/items/${itemId}/like`)
          .then(result => {
            resolve({
              isLiked: Boolean(result.isLiked),
              likes: result.likes || 0
            });
          })
          .catch(error => {
            console.error('商品点赞操作失败:', error);
            reject({ message: error.message || '操作失败' });
          });

      } catch (error) {
        console.error('商品点赞操作失败:', error);
        reject({ message: '操作失败' });
      }
    });
  }

  // 更新商品评论数
  updateCommentsCount(itemId, count) {
    return apiConfig.put(`/items/${itemId}/comments-count`, { count });
  }

  // 增加浏览次数
  incrementViewCount(itemId) {
    if (!itemId) return;
    
    apiConfig.post(`/items/${itemId}/view`)
      .catch(error => {
        console.error('更新浏览次数失败:', error);
      });
  }

  // 搜索商品
  searchItems(keyword, filters = {}) {
    return new Promise((resolve, reject) => {
      const searchParams = {};
      
      if (keyword && keyword.trim()) {
        searchParams.keyword = keyword.trim();
      }
      
      if (filters.categoryId) {
        searchParams.categoryId = filters.categoryId;
      }
      
      if (filters.minPrice !== undefined) {
        searchParams.minPrice = filters.minPrice;
      }
      
      if (filters.maxPrice !== undefined) {
        searchParams.maxPrice = filters.maxPrice;
      }
      
      if (filters.sortBy) {
        searchParams.sortBy = filters.sortBy;
      }
  
      apiConfig.get('/items/search', searchParams)
        .then(items => {
          // 为搜索结果添加时间格式化和数据处理
          if (Array.isArray(items)) {
            items.forEach(item => {
              item.timeAgo = sharedTools.formatTimeAgo(item.createTime);
              item.isLiked = Boolean(item.isLiked);
            });
            
            // 处理图片URL
            items = apiConfig.processItemImages(items);
          }
          resolve(items);
        })
        .catch(error => {
          console.error('搜索商品失败:', error);
          reject(error);
        });
    });
  }
  
  // 获取商品列表
  getItems(page = 1, limit = 10) {
    return new Promise((resolve, reject) => {      
      apiConfig.get('/items', { page, limit })
        .then(data => {
          // 为每个商品添加时间格式化和数据处理
          if (data.items && Array.isArray(data.items)) {
            data.items.forEach(item => {
              item.timeAgo = sharedTools.formatTimeAgo(item.createTime);
              item.isLiked = Boolean(item.isLiked);
            });
            
            // 处理图片URL
            data.items = apiConfig.processItemImages(data.items);
          }
          
          resolve({
            items: data.items || data,
            hasMore: data.hasMore || false,
            total: data.total || 0
          });
        })
        .catch(error => {
          console.error('获取商品列表失败:', error);
          reject(error);
        });
    });
  }

  // 获取用户发布的商品
  getUserItems(sellerId) {
    return new Promise((resolve, reject) => {
      apiConfig.get(`/items/users/${sellerId}`)
        .then(items => {
          // 为用户商品添加时间格式化
          if (Array.isArray(items)) {
            items.forEach(item => {
              item.timeAgo = sharedTools.formatTimeAgo(item.createTime);
              item.isLiked = Boolean(item.isLiked);
            });
            items = apiConfig.processItemImages(items);
          }
          resolve(items);
        })
        .catch(error => {
          console.error('获取用户商品失败:', error);
          reject(error);
        });
    });
  }

  // 更新商品状态
  updateItemStatus(itemId, newStatus) {
    return new Promise((resolve, reject) => {
      try {
        console.log('更新商品状态:', { itemId, newStatus });
        
        if (!itemId) {
          reject({ code: 400, message: '商品ID不能为空' });
          return;
        }
        
        // 验证状态值
        const validStatuses = ['selling', 'sold', 'seeking', 'bought', 'withdrawn'];
        if (!validStatuses.includes(newStatus)) {
          reject({ code: 400, message: '无效的状态值' });
          return;
        }

        apiConfig.put(`/items/${itemId}/status`, { status: newStatus })
          .then(result => {
            console.log('商品状态更新成功:', result);
            resolve({
              code: 200,
              message: '状态更新成功',
              data: result
            });
          })
          .catch(error => {
            console.error('更新商品状态失败:', error);
            reject({ code: 500, message: error.message || '更新失败' });
          });

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
        
        if (!itemId) {
          reject({ code: 400, message: '商品ID不能为空' });
          return;
        }
        
        // 验证价格
        if (!newPrice || newPrice <= 0) {
          reject({ code: 400, message: '价格必须大于0' });
          return;
        }

        apiConfig.put(`/items/${itemId}/price`, { price: newPrice })
          .then(result => {
            console.log('商品价格更新成功:', result);
            resolve({
              code: 200,
              message: '价格更新成功',
              data: result
            });
          })
          .catch(error => {
            console.error('更新商品价格失败:', error);
            reject({ code: 500, message: error.message || '更新失败' });
          });

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
        
        if (!itemId) {
          reject({ code: 400, message: '商品ID不能为空' });
          return;
        }
        
        apiConfig.delete(`/items/${itemId}`)
          .then(result => {
            console.log('商品删除成功:', itemId);
            resolve({
              code: 200,
              message: '删除成功'
            });
          })
          .catch(error => {
            console.error('删除商品失败:', error);
            reject({ code: 500, message: error.message || '删除失败' });
          });

      } catch (error) {
        console.error('删除商品失败:', error);
        reject({ code: 500, message: '删除失败' });
      }
    });
  }
}

module.exports = new ItemManager();