// utils/itemManager.js - 商品管理工具类

const sharedTools = require("./sharedTools");

class ItemManager {
  constructor() {
    this.ITEMS_KEY = 'campus_items'; // 存储所有商品的key
    this.CATEGORIES_KEY = 'item_categories'; // 商品分类
    this.LIKED_ITEMS_KEY = 'liked_items'; // 用户收藏的商品
    this.COMMENTS_KEY = 'item_comments'; // 商品评论存储key
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
        
    // 初始化测试评论数据
    this.initTestItemComments();
  }
  
  // 初始化时添加一些测试评论数据
  initTestItemComments() {
    const existingComments = wx.getStorageSync(this.COMMENTS_KEY) || [];
    if (existingComments.length === 0) {
      const testComments = [
        {
          id: 1,
          itemId: 1, // 这里需要对应实际的商品ID
          userId: 3,
          userNickname: '蛋黄',
          avatar: '/images/default-avatar.png',
          content: '这个商品看起来不错，还有货吗？',
          isAuthor: false,
          likes: 5,
          isLiked: false,
          createTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          timeAgo: '2小时前'
        },
        {
          id: 2,
          itemId: 1, 
          userId: 1,
          userNickname: '三张',
          avatar: '/images/default-avatar.png',
          content: '主播我也想玩。',
          isAuthor: false,
          likes: 3,
          isLiked: true,
          createTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          timeAgo: '2小时前',
        },
        {
          id: 3,
          itemId: 2, 
          userId: 1,
          userNickname: '三张',
          avatar: '/images/default-avatar.png',
          content: '主播我也想玩。',
          isAuthor: false,
          likes: 3,
          isLiked: true,
          createTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          timeAgo: '2小时前',
        },
        {
          id: 4,
          itemId: 2, 
          userId: 1,
          userNickname: '三张',
          avatar: '/images/default-avatar.png',
          content: '主播我也想玩。',
          isAuthor: false,
          likes: 3,
          isLiked: true,
          createTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          timeAgo: '2小时前',
        }
        // 可以添加更多测试评论
      ];
      
      wx.setStorageSync(this.COMMENTS_KEY, testComments);
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
        images: ['/images/phone1.jpg', '/images/phone2.jpg'],
        categoryId: 1,
        category: '数码电子',
        sellerId: 1,
        sellerName: '张三',
        sellerNickname: '三张',
        sellerAvatar: '/images/default-avatar.jpg',
        status: 'active',
        createTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        timeAgo: '2天前',
        viewCount: 25,
        likeCount: 3,
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
        createTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        timeAgo: '一天前',
        viewCount: 120,
        likeCount: 7,
      },
      {
        id: 3,
        title: '护眼台灯 全新未拆封',
        description: '全新护眼台灯，买重了，原价120，现80出售。品牌是飞利浦，有护眼认证，适合学习使用。',
        price: '80',
        images: ['/images/lamp1.jpg'],
        categoryId: 2,
        category: '生活用品',
        sellerId: 2,
        sellerName: '李四',
        sellerNickname: '四李',
        sellerAvatar: '/images/default-avatar.jpg',
        status: 'active',
        createTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        timeAgo: '一天前',
        viewCount: 12,
        likeCount: 1,
      },
      {
        id: 4,
        title: '嵌入式技术第五版',
        description: '物联网专业选修课 嵌入式系统与技术的教科书 收的二手 现在考完了转卖',
        price: '10',
        images: ['/images/lamp1.jpg'],
        categoryId: 3,
        category: '学习用品',
        sellerId: 2,
        sellerName: '李四',
        sellerNickname: '四李',
        sellerAvatar: '/images/embedded.jpg',
        status: 'active',
        createTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        timeAgo: '一天前',
        viewCount: 32,
        likeCount: 2,
      }
    ];
    this.saveItems(mockItems);
    console.log('初始化商品模拟数据');
  }
  
  // 获取单个商品详情
  getItemDetail(itemId) {
    return new Promise((resolve, reject) => {
      console.log('getItemDetail 被调用，itemId:', itemId, '类型:', typeof itemId);
      
      const items = this.getAllItems();
      console.log('所有商品:', items);
      console.log('商品ID列表:', items.map(p => ({ id: p.id, type: typeof p.id })));
      
      // 确保类型匹配
      const item = items.find(p => p.id == itemId);
      console.log('找到的商品:', item);
      
      if (item) {
        // 更新时间显示
        item.timeAgo = sharedTools.formatTimeAgo(item.createTime);
        resolve(item);
      } else {
        console.log('未找到商品，itemId:', itemId);
        reject({ message: '商品不存在' });
      }
    });
  }

  // 获取商品列表
  getItems(page = 1, limit = 10) {
    return new Promise((resolve) => {
      const allItems = this.getAllItems();
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      
      // 按时间倒序排列
      allItems.sort((a, b) => new Date(b.createTime) - new Date(a.createTime));
      
      const items = allItems.slice(startIndex, endIndex);
      const hasMore = endIndex < allItems.length;
      
      // 模拟网络延迟
      setTimeout(() => {
        resolve({
          items: items,
          hasMore: hasMore,
          total: allItems.length
        });
      }, 500);
    });
  }

  // 获得所有商品
  getAllItems() {
    try {
      return wx.getStorageSync(this.ITEMS_KEY) || [];
    } catch (error) {
      console.error('获取商品数据失败:', error);
      return [];
    }
  }

  // 保存商品
  saveItems(items) {
    try {
      wx.setStorageSync(this.ITEMS_KEY, items);
      return true;
    } catch (error) {
      console.error('保存商品失败:', error);
      return false;
    }
  }

  // 根据ID获取单个商品
  getItemById(itemId) {
    const items = this.getAllItems();
    return items.find(item => item.id == itemId);
  }

  // 获得商品评论
  getCommentByItemId(itemId) {
    try {
      const allComments = wx.getStorageSync(this.COMMENTS_KEY) || [];
      // 筛选出该商品的评论，按时间正序排列
      return allComments
        .filter(comment => comment.itemId == itemId)
        .sort((a, b) => new Date(a.createTime) - new Date(b.createTime));
    } catch (error) {
      console.error('获取商品评论失败:', error);
      return [];
    }
  }

  // 添加并保存评论
  addCommentByItemId(itemId, content) {
    return new Promise((resolve, reject) => {
      try {
        if (!content.trim()) {
          reject({ message: '评论内容不能为空' });
          return;
        }
        // 获取当前用户信息
        const userManager = require('./userManager');
        const currentUser = userManager.getCurrentUser();

        if (!currentUser) {
          reject({ message: '请先登录' });
          return;
        }
        // 获取商品信息，判断是否为楼主
        const item = this.getItemById(itemId);
        if (!item) {
          reject({ message: '商品不存在' });
          return;
        }
  
        const isAuthor = item.sellerId === currentUser.id;
        
        const allComments = wx.getStorageSync(this.COMMENTS_KEY) || [];
        const newComment = {
          id: Date.now().toString(),
          itemId: itemId,
          userId: currentUser.id,
          userNickname: currentUser.nickname || currentUser.name,
          avatar: currentUser.avatar || '/images/default-avatar.png',
          content: content.trim(),
          likes: 0,
          isLiked: false,
          isAuthor: isAuthor,
          createTime: new Date().toISOString(),
          timeAgo: '刚刚'
        };
  
        allComments.unshift(newComment);
        wx.setStorageSync(this.COMMENTS_KEY, allComments);
  
        if (this.saveComments(allComments)) {
          // 更新商品的评论数
          this.updateItemCommentsCount(itemId);
          resolve(newComment);
        } else {
          reject({ message: '评论失败，请重试' });
        }
      } catch (error) {
        console.error('保存评论失败:', error);
        reject({ message: '评论失败，请重试' });
      }
    });
  }

  // 获得所有评论
  getAllComment(){
    try {
      return wx.getStorageSync(this.COMMENTS_KEY) || [];
    } catch (error) {
      console.error('获取所有评论失败:', error);
      return [];
    }
  }

  // 保存评论
  saveComments(comments) {
    try {
      wx.setStorageSync(this.COMMENTS_KEY, comments);
      return true;
    } catch (error) {
      console.error('保存评论失败:', error);
      return false;
    }
  }

  // 获取商品评论列表 - 支持排序
  getItemComments(itemId, page = 1, limit = 20, sortType = 'time_desc') {
    return new Promise((resolve) => {
      const itemComments = this.getCommentByItemId(itemId);
      // 根据排序类型进行排序
      switch (sortType) {
        case 'hot':
          // 最热：按点赞数降序，点赞数相同按时间降序
          itemComments.sort((a, b) => {
            const likesA = a.likes || 0;
            const likesB = b.likes || 0;
            if (likesB !== likesA) {
              return likesB - likesA; // 点赞数降序
            }
            return new Date(b.createTime) - new Date(a.createTime); // 时间降序
          });
          break;
        case 'time_asc':
          // 最早：按时间升序
          itemComments.sort((a, b) => new Date(a.createTime) - new Date(b.createTime));
          break;
        case 'time_desc':
        default:
          // 最新：按时间降序（默认）
          itemComments.sort((a, b) => new Date(b.createTime) - new Date(a.createTime));
          break;
      }
      
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const comments = itemComments.slice(startIndex, endIndex);
      
      // 更新时间显示
      comments.forEach(comment => {
        comment.timeAgo = sharedTools.formatTimeAgo(comment.createTime);
      });
      
      console.log(`评论排序 - 类型: ${sortType}, 总数: ${itemComments.length}, 返回: ${comments.length}`);
      
      setTimeout(() => {
        resolve(comments);
      }, 300);
    });
  }

  // 更新商品的评论数
  updateItemCommentsCount(itemId) {
    const comments = this.getCommentByItemId(itemId);
    return comments.length;
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
          createTime: new Date().toISOString(),
          viewCount: 0,
          likeCount: 0,
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
    return new Promise((resolve) => {
      const items = this.getAllItems();
      let filteredItems = items.filter(item => item.status === 'active');

      // 关键词搜索
      if (keyword && keyword.trim()) {
        const lowerKeyword = keyword.toLowerCase();
        filteredItems = filteredItems.filter(item => 
          item.title.toLowerCase().includes(lowerKeyword) ||
          item.description.toLowerCase().includes(lowerKeyword)
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
            filteredItems.sort((a, b) => new Date(b.createTime) - new Date(a.createTime));
            break;
          case 'popular':
            filteredItems.sort((a, b) => (b.viewCount + b.likeCount) - (a.viewCount + a.likeCount));
            break;
        }
      } else {
        // 默认按发布时间倒序
        filteredItems.sort((a, b) => new Date(b.createTime) - new Date(a.createTime));
      }

      // 添加延迟，与 getItems 保持一致
      setTimeout(() => {
        resolve(filteredItems);
      }, 300); // 300ms 延迟，可以调整
    });
  }

  // 获取用户发布的商品
  getUserItems(sellerId) {
    const items = this.getAllItems();
    return items
      .filter(item => item.sellerId === sellerId)
      .sort((a, b) => new Date(b.createTime) - new Date(a.createTime));
  }

  // 增加浏览次数
  incrementViewCount(itemId) {
    const items = this.getAllItems();
    const itemIndex = items.findIndex(item => item.id == itemId); // 改为 ==
    
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

  // 获取用户收藏的商品
  getLikedItems(userId) {
    try {
      const likedIds = wx.getStorageSync(this.LIKED_ITEMS_KEY + '_' + userId) || [];
      const items = this.getAllItems();
      // 使用 == 进行宽松比较
      return items.filter(item => likedIds.some(id => id == item.id));
    } catch (error) {
      console.error('获取收藏商品失败:', error);
      return [];
    }
  }

  // 切换收藏状态
  toggleLike(itemId) {
    return new Promise((resolve, reject) => {
      const items = this.getAllItems();
      const updatedItems = items.map(item => {
        if (item.id === itemId) {
          const newLikeState = !item.isLiked;
          return {
            ...item,
            isLiked: newLikeState,
            likes: newLikeState ? item.likes + 1 : item.likes - 1
          };
        }
        return item;
      });
      
      if (this.saveItems(updatedItems)) {
        const updatedItem = updatedItems.find(p => p.id === itemId);
        resolve({
          isLiked: updatedItem.isLiked,
          likes: updatedItem.likes
        });
      } else {
        reject({ message: '操作失败' });
      }
    });
  }

   // 评论点赞/取消点赞
   toggleCommentLike(commentId) {
    return new Promise((resolve, reject) => {
      const comments = this.getAllComment();
      const commentIndex = comments.findIndex(c => c.id == commentId);
      
      if (commentIndex === -1) {
        reject({ message: '评论不存在' });
        return;
      }

      const comment = comments[commentIndex];
      if (comment.isLiked) {
        comment.likes = Math.max(0, (comment.likes || 0) - 1);
        comment.isLiked = false;
      } else {
        comment.likes = (comment.likes || 0) + 1;
        comment.isLiked = true;
      }

      if (this.saveComments(comments)) {
        resolve({
          isLiked: comment.isLiked,
          likes: comment.likes
        });
      } else {
        reject({ message: '操作失败' });
      }
    });
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