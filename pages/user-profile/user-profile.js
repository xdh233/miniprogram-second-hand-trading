const userManager = require('../../utils/userManager');
const postManager = require('../../utils/postManager');
const itemManager = require('../../utils/itemManager');
const sharedTools = require('../../utils/sharedTools');

Page({
  data: {
    userInfo: null,
    isCurrentUser: false, // 是否是当前登录用户的个人空间
    currentUserId: null,
    targetUserId: null,
    
    // 页面状态
    loading: true,
    error: null,
    
    // 内容切换
    activeTab: 'posts', // 'posts' 或 'sell' 或 'buy'
    
    // 用户发布的内容
    userPosts: [],
    sellItems: [], // 在售商品
    buyItems: [],  // 想要商品
    leftSellItems: [],
    rightSellItems: [],
    leftBuyItems: [],
    rightBuyItems: []
  },

  onLoad(options) {
    console.log('个人空间页面加载，参数:', options);
    
    // 获取目标用户ID
    const targetUserId = parseInt(options.userId);
    const currentUser = userManager.getCurrentUser();
    console.log("userId:",targetUserId);
    if (!targetUserId) {
      this.setData({
        error: '用户不存在',
        loading: false
      });
      return;
    }

    this.setData({
      targetUserId: targetUserId,
      currentUserId: currentUser ? currentUser.id : null,
      isCurrentUser: currentUser && currentUser.id === targetUserId
    });

    this.loadUserProfile();
  },

  onShow() {
    // 如果是当前用户的空间，刷新数据
    if (this.data.isCurrentUser) {
      this.loadUserProfile();
    }
  },

  // 加载用户资料
  async loadUserProfile() {
    try {
      this.setData({ loading: true, error: null });
      
      // 获取用户基本信息
      const userResult = await userManager.getUserInfo(this.data.targetUserId);
      const userInfo = userResult.data.userInfo;
      
      // 加载用户发布的内容
      await this.loadUserContent(this.data.targetUserId);
      
      this.setData({
        userInfo: userInfo,
        loading: false
      });
      
      // 设置页面标题
      wx.setNavigationBarTitle({
        title: userInfo.nickname || userInfo.name
      });
      
    } catch (error) {
      console.error('加载用户资料失败:', error);
      this.setData({
        error: error.message || '加载失败',
        loading: false
      });
    }
  },

  // 加载用户发布的内容
  async loadUserContent(userId) {
    try {
      console.log('开始加载用户内容，userId:', userId, '类型:', typeof userId);
      
      // 从实际的数据管理器获取数据
      let userPosts = [];
      let allUserItems = [];
      
      // 获取用户发布的帖子
      if (typeof postManager !== 'undefined' && postManager.getAll) {
        const allPosts = postManager.getAll();
        console.log('所有帖子:', allPosts);
        
        // 使用 userId 而不是 authorId
        userPosts = allPosts.filter(post => {
          console.log('对比帖子userId:', post.userId, '目标userId:', userId);
          return post.userId === userId;
        });
        
        // 格式化帖子时间 - 添加这部分
        userPosts = userPosts.map(post => ({
          ...post,
          // 添加格式化的时间显示
          formattedTime: sharedTools.formatTimeAgo(post.createTime),
          // 保留原始时间
          originalTime: post.createTime
        }));
        
        console.log('筛选并格式化后的用户帖子:', userPosts);
      }
      
      // 获取用户发布的商品的部分保持不变
      if (typeof itemManager !== 'undefined' && itemManager.getAll) {
        const allItems = itemManager.getAll();
        console.log('所有商品:', allItems);
        
        allUserItems = allItems.filter(item => {
          console.log('对比商品sellerId:', item.sellerId, '目标userId:', userId);
          return item.sellerId === userId;
        });
        
        console.log('筛选后的用户商品:', allUserItems);
      }
  
      // 按交易类型和状态分类商品
      const sellItems = allUserItems.filter(item => {
        console.log('检查在售商品:', item.title, 'tradeType:', item.tradeType, 'status:', item.status);
        return item.tradeType === 'sell' && item.status === 'selling';
      });
      
      const buyItems = allUserItems.filter(item => {
        console.log('检查求购商品:', item.title, 'tradeType:', item.tradeType, 'status:', item.status);
        return item.tradeType === 'buy' && item.status === 'seeking';
      });
  
      console.log('商品分类结果:', {
        总商品数: allUserItems.length,
        在售商品: sellItems.length,
        求购商品: buyItems.length,
        用户帖子: userPosts.length
      });
      
      // 分配商品到左右两列
      const { leftItems: leftSellItems, rightItems: rightSellItems } = this.distributeItems(sellItems);
      const { leftItems: leftBuyItems, rightItems: rightBuyItems } = this.distributeItems(buyItems);
  
      this.setData({
        userPosts: userPosts,
        sellItems: sellItems,
        buyItems: buyItems,
        leftSellItems: leftSellItems,
        rightSellItems: rightSellItems,
        leftBuyItems: leftBuyItems,
        rightBuyItems: rightBuyItems
      });
      
      console.log('用户内容加载完成:', {
        postsCount: userPosts.length,
        sellItemsCount: sellItems.length,
        buyItemsCount: buyItems.length
      });
      
    } catch (error) {
      console.error('加载用户内容失败:', error);
      this.setData({
        userPosts: [],
        sellItems: [],
        buyItems: [],
        leftSellItems: [],
        rightSellItems: [],
        leftBuyItems: [],
        rightBuyItems: []
      });
    }
  },

  // 分配商品到左右两列
  distributeItems(items) {
    console.log('开始分配商品，输入:', items);
    
    const leftItems = [];
    const rightItems = [];
    
    // 检查输入是否为数组
    if (!Array.isArray(items)) {
      console.warn('distributeItems: 输入不是数组:', items);
      return { leftItems, rightItems };
    }
    
    // 如果没有商品，返回空数组
    if (items.length === 0) {
      console.log('没有商品需要分配');
      return { leftItems, rightItems };
    }
    
    // 分配商品：偶数索引放左列，奇数索引放右列
    items.forEach((item, index) => {
      if (index % 2 === 0) {
        leftItems.push(item);
        console.log(`商品 ${index} 分配到左列:`, item.title);
      } else {
        rightItems.push(item);
        console.log(`商品 ${index} 分配到右列:`, item.title);
      }
    });
    
    console.log('分配完成 - 左列数量:', leftItems.length, '右列数量:', rightItems.length);
    return { leftItems, rightItems };
  },

  // 确保有这个方法供WXML调用
  navigateToItemDetail(e) {
    const itemId = e.currentTarget.dataset.id;
    console.log('查看商品详情:', itemId);
    wx.navigateTo({
      url: `/pages/item-detail/item-detail?id=${itemId}`
    });
  },

  // 切换内容标签
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    console.log('切换到标签:', tab);
    this.setData({ activeTab: tab });
  },

  // 发私信
  sendMessage() {
    if (!this.data.currentUserId) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    if (this.data.isCurrentUser) {
      wx.showToast({
        title: '不能给自己发私信',
        icon: 'none'
      });
      return;
    }

    // 跳转到私聊页面
    wx.navigateTo({
      url: `/pages/chat/chat?userId=${this.data.targetUserId}&userName=${this.data.userInfo.nickname || this.data.userInfo.name}`
    });
  },

  // 点击帖子
  onPostTap(e) {
    const postId = e.currentTarget.dataset.postId;
    wx.navigateTo({
      url: `/pages/post-detail/post-detail?id=${postId}`
    });
  },
  
  // 点击商品
  onItemTap(e) {
    const itemId = e.currentTarget.dataset.itemId;
    wx.navigateTo({
      url: `/pages/item-detail/item-detail?id=${itemId}`
    });
  },

  // 点击头像
  onAvatarTap() {
    if (this.data.userInfo && this.data.userInfo.avatar) {
      wx.previewImage({
        urls: [this.data.userInfo.avatar],
        current: this.data.userInfo.avatar
      });
    }
  },

  // 编辑个人资料（仅当前用户可见）
  editProfile() {
    if (!this.data.isCurrentUser) return;
    
    wx.navigateTo({
      url: '/pages/settings/settings'
    });
  },

  // 分享用户空间
  onShareAppMessage() {
    return {
      title: `${this.data.userInfo.nickname || this.data.userInfo.name}的个人空间`,
      path: `/pages/user-profile/user-profile?userId=${this.data.targetUserId}`,
      imageUrl: this.data.userInfo.avatar
    };
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadUserProfile().finally(() => {
      wx.stopPullDownRefresh();
    });
  }
});