const userManager = require('../../utils/userManager');
const postManager = require('../../utils/postManager');
const itemManager = require('../../utils/itemManager');
const sharedTools = require('../../utils/sharedTools');
const apiConfig = require('../../utils/apiConfig'); // 引入API配置

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
      
      // 获取用户基本信息 - 参考settings页面的成功实现
      let userInfo;
      
      if (this.data.isCurrentUser) {
        // 如果是当前用户，直接获取本地用户信息，然后刷新
        userInfo = userManager.getCurrentUser();
        
        // 从服务器获取最新信息
        try {
          const response = await apiConfig.get(`/users/${this.data.targetUserId}`);
          if (response && response.success && response.data) {
            userInfo = response.data;
            // 更新本地缓存
            userManager.updateUserInfo(userInfo);
          }
        } catch (refreshError) {
          console.warn('刷新用户信息失败，使用本地缓存:', refreshError);
        }
      } else {
        // 如果是其他用户，直接从服务器获取
        try {
          const response = await apiConfig.get(`/users/${this.data.targetUserId}`);
          if (response && response.success && response.data) {
            userInfo = response.data;
          } else {
            throw new Error('用户不存在');
          }
        } catch (error) {
          // 如果API调用失败，尝试使用旧的方法
          console.warn('新API失败，尝试旧方法:', error);
          const userResult = await userManager.getUserInfo(this.data.targetUserId);
          userInfo = userResult.data ? userResult.data.userInfo || userResult.data : userResult;
        }
      }
      
      if (!userInfo) {
        throw new Error('无法获取用户信息');
      }
      
      console.log('获取到的用户信息:', userInfo);
      
      // 处理头像URL - 参考settings页面的实现
      if (userInfo.avatar) {
        // 如果已经是完整URL，直接使用；否则使用apiConfig处理
        if (!userInfo.avatar.startsWith('http')) {
          userInfo.avatar = apiConfig.getAvatarUrl(userInfo.avatar);
        }
      }
      
      // 加载用户发布的内容
      await this.loadUserContent(this.data.targetUserId);
      
      this.setData({
        userInfo: userInfo,
        loading: false
      });
      
      // 设置页面标题
      wx.setNavigationBarTitle({
        title: userInfo.nickname || userInfo.name || '用户空间'
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
      
      let userPosts = [];
      let allUserItems = [];
      
      // 获取用户发布的帖子 - 优先使用API
      try {
        if (typeof postManager !== 'undefined' && postManager.getUserPosts) {
          // 使用专门的getUserPosts方法
          const postsResult = await postManager.getUserPosts(userId, 1, 50);
          userPosts = postsResult.posts || [];
        } else if (typeof postManager !== 'undefined' && postManager.getAll) {
          // 回退到getAll方法
          const allPosts = postManager.getAll();
          console.log('所有帖子:', allPosts);
          
          userPosts = allPosts.filter(post => {
            console.log('对比帖子userId:', post.userId, '目标userId:', userId);
            return post.userId === userId;
          });
        }
        
        // 格式化帖子时间
        userPosts = userPosts.map(post => ({
          ...post,
          formattedTime: sharedTools.formatTimeAgo(post.createTime),
          originalTime: post.createTime
        }));
        
        console.log('筛选并格式化后的用户帖子:', userPosts);
      } catch (postError) {
        console.error('获取用户帖子失败:', postError);
        userPosts = [];
      }
      
      // 获取用户发布的商品
      try {
        if (typeof itemManager !== 'undefined') {
          // 检查是否有getUserItems方法
          if (itemManager.getUserItems) {
            const itemsResult = await itemManager.getUserItems(userId);
            allUserItems = itemsResult.data || itemsResult || [];
          } else if (itemManager.getAll) {
            // 回退到getAll方法
            const allItems = itemManager.getAll();
            console.log('所有商品:', allItems);
            
            allUserItems = allItems.filter(item => {
              console.log('对比商品sellerId:', item.sellerId, '目标userId:', userId);
              return item.sellerId === userId;
            });
          }
        }
        
        console.log('筛选后的用户商品:', allUserItems);
      } catch (itemError) {
        console.error('获取用户商品失败:', itemError);
        allUserItems = [];
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

  // 删除动态（直接处理，使用catchtap）
  async deletePost(e) {
    const postId = e.currentTarget.dataset.postId;
    console.log('删除动态:', postId);
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条动态吗？删除后无法恢复。',
      success: async (res) => {
        if (res.confirm) {
          try {
            // 显示加载提示
            wx.showLoading({
              title: '删除中...',
              mask: true
            });

            // 调用postManager删除动态
            if (typeof postManager !== 'undefined' && postManager.deletePost) {
              await postManager.deletePost(postId);
              
              wx.hideLoading();
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              });
              
              // 重新加载用户内容
              this.loadUserContent(this.data.targetUserId);
            } else {
              wx.hideLoading();
              wx.showToast({
                title: '删除功能暂不可用',
                icon: 'error'
              });
            }
          } catch (error) {
            wx.hideLoading();
            console.error('删除动态失败:', error);
            wx.showToast({
              title: error.message || '删除失败',
              icon: 'error'
            });
          }
        }
      }
    });
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