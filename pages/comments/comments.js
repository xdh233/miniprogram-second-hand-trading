const userManager = require('../../utils/userManager');
const apiConfig = require('../../utils/apiConfig');

Page({
  data: {
    userInfo: null,
    commentList: [],
    refreshing: false,
    loading: false,
    page: 1,
    hasMore: true
  },

  onLoad() {
    console.log('评论通知页面加载');
    this.checkLoginStatus();
  },

  onShow() {
    console.log('评论通知页面显示');
    this.resetAndLoadComments();
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

  // 重置并加载评论通知
  resetAndLoadComments() {
    this.setData({
      page: 1,
      commentList: [],
      hasMore: true
    });
    this.loadComments();
  },

  // 处理评论数据
  processCommentData(comment) {
    const timeStr = this.formatTime(comment.createdAt);
    
    return {
      id: comment.id,
      type: comment.type,
      commentType: comment.commentType,
      targetId: comment.targetId,
      postId: comment.postId,
      itemId: comment.itemId,
      parent_id: comment.parent_id,
      userName: comment.commenter.username,
      userAvatar: apiConfig.getAvatarUrl(comment.commenter.avatar),
      commentContent: comment.commentContent,
      targetContent: comment.targetContent,
      time: timeStr,
      isRead: comment.isRead,
      createdAt: comment.createdAt
    };
  },

  // 加载评论通知
  async loadComments() {
    if (!this.data.userInfo || this.data.loading || !this.data.hasMore) return;

    this.setData({ loading: true });

    try {
      const response = await apiConfig.get('/notifications/comments', {
        page: this.data.page,
        limit: 20
      });

      if (response.success) {
        const newComments = response.data || [];
        const processedComments = newComments.map(comment => this.processCommentData(comment));
        
        const allComments = this.data.page === 1 ? processedComments : [...this.data.commentList, ...processedComments];
        
        this.setData({
          commentList: allComments,
          hasMore: newComments.length === 20,
          page: this.data.page + 1,
          loading: false,
          refreshing: false
        });

        console.log('加载评论通知完成:', {
          current: newComments.length,
          total: allComments.length,
          unread: response.unreadCount || 0
        });
      } else {
        throw new Error(response.message || '获取评论通知失败');
      }

    } catch (error) {
      console.error('加载评论通知失败:', error);
      
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
    if (!this.data.userInfo || this.data.commentList.length === 0) return;
    
    try {
      console.log('自动标记所有评论通知为已读');
      
      const response = await apiConfig.put('/notifications/comments/mark-all-read');
      
      if (response.success) {
        // 更新本地状态
        const commentList = this.data.commentList.map(item => ({ ...item, isRead: true }));
        this.setData({ commentList });
        console.log('自动标记已读成功');
      }
    } catch (error) {
      console.error('自动标记已读失败:', error);
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.setData({ refreshing: true });
    this.resetAndLoadComments();
    wx.stopPullDownRefresh();
  },

  // 上拉加载更多
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadComments();
    }
  },

  // 点击评论项，跳转到相关内容
  navigateToContent(e) {
    const item = e.currentTarget.dataset.item;
    if (!item) return;

    console.log('跳转到内容:', item);
    
    if (item.postId) {
      wx.navigateTo({
        url: `/pages/post-detail/post-detail?id=${item.postId}`
      });
    } else if (item.itemId) {
      wx.navigateTo({
        url: `/pages/item-detail/item-detail?id=${item.itemId}`
      });
    }
  },

  // 手动全部标记为已读（用户主动点击）
  markAllAsRead() {
    if (this.data.commentList.length === 0) {
      wx.showToast({
        title: '暂无通知',
        icon: 'none'
      });
      return;
    }

    wx.showModal({
      title: '确认操作',
      content: '将所有评论通知标记为已读？',
      success: (res) => {
        if (res.confirm) {
          this.performMarkAllAsRead();
        }
      }
    });
  },

  async performMarkAllAsRead() {
    try {
      const response = await apiConfig.put('/notifications/comments/mark-all-read');
      
      if (response.success) {
        // 更新本地状态
        const commentList = this.data.commentList.map(item => ({ ...item, isRead: true }));
        this.setData({ commentList });
        
        wx.showToast({
          title: '已全部标记为已读',
          icon: 'success'
        });
      } else {
        throw new Error(response.message || '标记失败');
      }
    } catch (error) {
      console.error('批量标记已读失败:', error);
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      });
    }
  }
});