const userManager = require('../../utils/userManager');
const itemManager = require('../../utils/itemManager');

Page({
  data: {
    item: null,
    userInfo: null,
    currentImageIndex: 0,
    comments: [],
    newComment: '',
    isLiked: false,
    likeCount: 0,
    loading: true,
    statusBarHeight: 0
  },

  onLoad(options) {
    const itemId = options.id;
    console.log('加载商品详情:', itemId);
    
    // 获取系统信息，处理状态栏高度
    this.getSystemInfo();
    
    // 检查登录状态
    this.checkLoginStatus();
    
    // 加载商品详情
    this.loadItemDetail(itemId);
    
    // 加载评论
    this.loadComments(itemId);
  },

  // 获取系统信息
  getSystemInfo() {
    const systemInfo = wx.getSystemInfoSync();
    const statusBarHeight = systemInfo.statusBarHeight || 0;
    
    // 转换为rpx单位 (1px = 2rpx on iPhone)
    const statusBarHeightRpx = statusBarHeight * 2;
    
    this.setData({
      statusBarHeight: statusBarHeightRpx
    });
    
    console.log('状态栏高度(px):', statusBarHeight);
    console.log('状态栏高度(rpx):', statusBarHeightRpx);
  },

  // 检查登录状态
  checkLoginStatus() {
    // 暂时使用测试用户，避免跳转
    const mockUserInfo = {
      id: 'test_user_123',
      username: '测试用户',
      avatar: '/images/default-avatar.png'
    };
    this.setData({ userInfo: mockUserInfo });
    
    /* 真实环境下使用这段代码
    if (!userManager.isLoggedIn()) {
      wx.redirectTo({
        url: '/pages/login/login'
      });
      return;
    }

    const userInfo = userManager.getCurrentUser();
    this.setData({ userInfo });
    */
  },

  // 简化 loadItemDetail 方法
  async loadItemDetail(itemId) {
    try {
      // 从 itemManager 获取商品详情（包含评论）
      const itemWithComments = itemManager.getItemWithComments(itemId);
      
      if (!itemWithComments) {
        throw new Error('商品不存在');
      }

      // 格式化发布时间
      itemWithComments.formattedPublishTime = this.formatTime(itemWithComments.publishTime);

      // 检查收藏状态
      const likedItems = itemManager.getLikedItems(this.data.userInfo.id);
      const isLiked = likedItems.some(likedItem => likedItem.id == itemId);

      // 增加浏览次数
      itemManager.incrementViewCount(itemId);

      this.setData({
        item: itemWithComments,
        comments: itemWithComments.comments || [],
        isLiked: isLiked,
        likeCount: itemWithComments.likeCount || 0,
        loading: false
      });

      console.log('商品详情加载成功:', itemWithComments);

    } catch (error) {
      console.error('加载商品详情失败:', error);
      this.setData({ loading: false });
      wx.showToast({
        title: error.message || '商品不存在',
        icon: 'error'
      });
      
      setTimeout(() => {
        wx.navigateBack();
      }, 2000);
    }
  },

  // 添加时间格式化方法
  formatTime(timestamp) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  },
  // 加载评论
  loadComments(itemId) {
    try {
      const testComments = [
        {
          id: 1,
          userId: 'user_1',
          username: '买家小明',
          avatar: '/images/default-avatar.png',
          content: '这里是这个人发的评论。',
          createTime: '2小时前',
          isAuthor: false  // 不是楼主
        },
        {
          id: 2,
          userId: this.data.item.sellerId, // 使用商品卖家ID
          username: this.data.item.seller.username,
          avatar: this.data.item.seller.avatar,
          content: '感谢大家的关注！有问题可以随时联系我。',
          createTime: '1小时前',
          isAuthor: true  // 是楼主
        },
        {
          id: 3,
          userId: 'user_3',
          username: '买家A',
          avatar: '/images/default-avatar.png',
          content: '电池健康度多少？有没有磕碰？',
          createTime: '1天前',
          isAuthor: false
        }
      ];

      this.setData({
        comments: testComments
      });

    } catch (error) {
      console.error('加载评论失败:', error);
    }
  },

  // 图片轮播切换
  onImageChange(e) {
    const current = e.detail.current;
    this.setData({
      currentImageIndex: current
    });
  },

  // 预览图片
  previewImage(e) {
    const current = e.currentTarget.dataset.src;
    const urls = this.data.item.images;
    
    wx.previewImage({
      current: current,
      urls: urls
    });
  },

  // 评论输入
  onCommentInput(e) {
    this.setData({
      newComment: e.detail.value
    });
  },

  // 发送评论
  async sendComment() {
    const comment = this.data.newComment.trim();
    if (!comment) {
      wx.showToast({
        title: '请输入评论内容',
        icon: 'none'
      });
      return;
    }
  
    try {
      // 使用 itemManager 保存评论
      const newComment = await itemManager.saveItemComment(
        this.data.item.id,
        comment,
        this.data.userInfo.id,
        this.data.userInfo
      );
  
      // 重新获取评论列表
      const updatedComments = itemManager.getItemComments(this.data.item.id);
      
      this.setData({
        comments: updatedComments,
        newComment: '',
        'item.commentsCount': updatedComments.length
      });
  
      wx.showToast({
        title: '评论成功',
        icon: 'success'
      });
  
    } catch (error) {
      console.error('发送评论失败:', error);
      wx.showToast({
        title: error.message || '评论失败',
        icon: 'error'
      });
    }
  },
  
  // 收藏/取消收藏
  async toggleLike() {
    try {
      const itemId = this.data.item.id;
      const userId = this.data.userInfo.id;
      
      const result = await itemManager.toggleLike(itemId, userId);
      
      this.setData({
        isLiked: result.isLiked,
        likeCount: result.likes
      });

      wx.showToast({
        title: result.isLiked ? '已收藏' : '已取消收藏',
        icon: 'success'
      });

    } catch (error) {
      console.error('收藏操作失败:', error);
      wx.showToast({
        title: error.message || '操作失败',
        icon: 'error'
      });
    }
  },

  // 分享商品
  onShareAppMessage() {
    return {
      title: this.data.item.title,
      path: `/pages/item-detail/item-detail?id=${this.data.item.id}`,
      imageUrl: this.data.item.images[0]
    };
  },

  // 点击分享按钮
  onShareClick() {
    wx.showActionSheet({
      itemList: ['分享给朋友', '分享到朋友圈'],
      success: (res) => {
        if (res.tapIndex === 0) {
          wx.showToast({
            title: '请点击右上角分享',
            icon: 'none'
          });
        } else if (res.tapIndex === 1) {
          wx.showToast({
            title: '敬请期待',
            icon: 'none'
          });
        }
      }
    });
  },

  // 联系卖家
  contactSeller() {
    const item = this.data.item;
    const currentUser = this.data.userInfo;
    
    if (!item || !item.seller) {
      wx.showToast({
        title: '卖家信息获取失败',
        icon: 'none'
      });
      return;
    }
    
    // 检查是否是自己的商品
    if (item.sellerId === currentUser.id) {
      wx.showToast({
        title: '不能联系自己',
        icon: 'none'
      });
      return;
    }
    
    // 直接跳转到聊天页面
    wx.navigateTo({
      url: `/pages/chat/chat?userId=${item.sellerId}&userName=${item.seller.username}&itemId=${item.id}&itemTitle=${encodeURIComponent(item.title)}`
    });
  },

  // 返回上一页
  goBack() {
    wx.navigateBack();
  },

  // 跳转到卖家主页
  navigateToSellerProfile() {
    wx.showToast({
      title: '跳转卖家主页',
      icon: 'none'
    });
  }
});
