// pages/likes/likes.js - 点赞通知页面（修正版）
const userManager = require('../../utils/userManager');
const apiConfig = require('../../utils/apiConfig');

Page({
  data: {
    userInfo: null,
    likeList: [],
    refreshing: false,
    loading: false,
    page: 1,
    hasMore: true
  },

  onLoad() {
    console.log('点赞通知页面加载');
    this.checkLoginStatus();
  },

  onShow() {
    console.log('点赞通知页面显示');
    this.resetAndLoadLikes();
    setTimeout(() => {
      this.autoMarkAllAsRead();
    }, 1000);
  },

  // 检查登录状态
  checkLoginStatus() {
    if (!userManager.isLoggedIn()) {
      wx.redirectTo({
        url: '/pages/login/login'
      });
      return;
    }

    const userInfo = userManager.getCurrentUser();
    this.setData({ userInfo });
  },

  // 重置并加载点赞通知
  resetAndLoadLikes() {
    this.setData({
      page: 1,
      likeList: [],
      hasMore: true
    });
    this.loadLikes();
  },

  // 加载点赞通知
  async loadLikes() {
    if (!this.data.userInfo || this.data.loading || !this.data.hasMore) return;

    this.setData({ loading: true });

    try {
      const response = await apiConfig.get('/notifications/likes', {
        page: this.data.page,
        limit: 20
      });

      if (response.success) {
        const newLikes = response.data || [];
        
        // 处理数据格式，确保显示正确的用户信息
        const processedLikes = newLikes.map(like => {
          // 格式化时间
          const timeStr = this.formatTime(like.createdAt);
          
          return {
            id: like.id,
            type: like.type,
            likeType: like.likeType,
            targetId: like.targetId,
            postId: like.postId,
            itemId: like.itemId,
            // 修正：显示点赞者信息
            userName: like.liker.username, // 点赞者昵称
            userAvatar: apiConfig.getAvatarUrl(like.liker.avatar), // 点赞者头像
            targetContent: like.targetContent,
            time: timeStr,
            isRead: like.isRead, // 进入页面就算已读
            createdAt: like.createdAt
          };
        });
        
        const allLikes = this.data.page === 1 ? processedLikes : [...this.data.likeList, ...processedLikes];
        
        this.setData({
          likeList: allLikes,
          hasMore: newLikes.length === 20,
          page: this.data.page + 1,
          loading: false,
          refreshing: false
        });

        // 进入页面自动标记所有为已读
        if (this.data.page === 1 && newLikes.length > 0) {
          this.autoMarkAllAsRead();
        }
      } else {
        throw new Error(response.message || '获取点赞通知失败');
      }

    } catch (error) {
      console.error('加载点赞通知失败:', error);
      
      // 检查是否是登录过期
      if (error.message === '登录已过期') {
        wx.redirectTo({
          url: '/pages/login/login'
        });
        return;
      }
      
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      });
      
      this.setData({
        loading: false,
        refreshing: false
      });
    }
  },

  // 格式化时间
  formatTime(timeStr) {
    const now = new Date();
    const time = new Date(timeStr);
    const diff = now.getTime() - time.getTime();
    
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    
    if (diff < minute) {
      return '刚刚';
    } else if (diff < hour) {
      return Math.floor(diff / minute) + '分钟前';
    } else if (diff < day) {
      return Math.floor(diff / hour) + '小时前';
    } else if (diff < 7 * day) {
      return Math.floor(diff / day) + '天前';
    } else {
      return time.getMonth() + 1 + '月' + time.getDate() + '日';
    }
  },

  // 自动标记所有为已读（页面隐藏时调用）
  async autoMarkAllAsRead() {
    if (!this.data.userInfo || this.data.likeList.length === 0) return;
    
    try {
      console.log('自动标记所有点赞通知为已读');
      
      const response = await apiConfig.put('/notifications/likes/mark-all-read');
      
      if (response.success) {
        // 更新本地状态
        const likeList = this.data.likeList.map(item => ({ ...item, isRead: true }));
        this.setData({ likeList });
        console.log('自动标记已读成功');
      }
    } catch (error) {
      console.error('自动标记已读失败:', error);
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.setData({ refreshing: true });
    this.resetAndLoadLikes();
    wx.stopPullDownRefresh();
  },

  // 上拉加载更多
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadLikes();
    }
  },

  // 点击点赞项，跳转到相关内容（不再显示已读提示）
  navigateToContent(e) {
    const item = e.currentTarget.dataset.item;
    if (!item) return;

    console.log('跳转到内容:', item);
    
    if (item.likeType === 'post' && item.postId) {
      // 跳转到帖子详情
      wx.navigateTo({
        url: `/pages/post-detail/post-detail?id=${item.postId}`
      });
    } else if (item.likeType === 'comment' && item.postId) {
      // 跳转到包含评论的帖子详情
      wx.navigateTo({
        url: `/pages/post-detail/post-detail?id=${item.postId}`
      });
    } else if (item.likeType === 'item' && item.itemId) {
      // 跳转到商品详情
      wx.navigateTo({
        url: `/pages/item-detail/item-detail?id=${item.itemId}`
      });
    }
  },

  // 长按点赞项（如果不需要删除功能，可以移除这个方法或者显示其他选项）
  onLongPressLike(e) {
    // 如果不需要任何长按功能，可以直接返回
    return;
    
    // 或者可以显示一些信息
    // const item = e.currentTarget.dataset.item;
    // wx.showToast({
    //   title: '长按了通知',
    //   icon: 'none'
    // });
  },

  // 手动全部标记为已读（用户主动点击）
  markAllAsRead() {
    if (this.data.likeList.length === 0) {
      wx.showToast({
        title: '暂无通知',
        icon: 'none'
      });
      return;
    }

    wx.showModal({
      title: '确认操作',
      content: '将所有点赞通知标记为已读？',
      success: (res) => {
        if (res.confirm) {
          this.performMarkAllAsRead();
        }
      }
    });
  },

  async performMarkAllAsRead() {
    try {
      // 调用后端API
      const response = await apiConfig.put('/notifications/likes/mark-all-read');

      // 更新本地状态
      const likeList = this.data.likeList.map(item => ({ ...item, isRead: true }));
      this.setData({ likeList });
      
      wx.showToast({
        title: '已全部标记为已读',
        icon: 'success'
      });
    } catch (error) {
      console.error('批量标记已读失败:', error);
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      });
    }
  }
});