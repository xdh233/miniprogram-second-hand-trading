// pages/index/index.js - 社交帖子流版本
const userManager = require('../../utils/userManager');
const postManager = require('../../utils/postManager');

Page({
  data: {
    userInfo: null,
    posts: [],
    loading: false,
    refreshing: false,
    hasMore: true,
    currentPage: 1,
    searchKeyword: ''
  },

  onLoad() {
    console.log('=== 首页加载 ===');
    this.checkLoginStatus();
  },

  onShow() {
    console.log('=== 首页显示 ===');
    this.checkLoginStatus();
    if (this.data.userInfo) {
      this.loadPosts(true);
    }
  },

  // 检查登录状态
  checkLoginStatus() {
    console.log('检查登录状态...');
    
    try {
      const isLoggedIn = userManager.isLoggedIn();
      console.log('登录状态:', isLoggedIn);
      
      if (!isLoggedIn) {
        console.log('未登录，跳转到登录页');
        wx.reLaunch({
          url: '/pages/login/login'
        });
        return;
      }

      const userInfo = userManager.getCurrentUser();
      console.log('当前用户:', userInfo);
      
      if (userInfo) {
        this.setData({ userInfo });
      } else {
        console.log('用户信息为空，跳转登录页');
        wx.reLaunch({
          url: '/pages/login/login'
        });
      }
    } catch (error) {
      console.error('检查登录状态出错:', error);
    }
  },

  // 加载帖子列表
  async loadPosts(refresh = false) {
    if (this.data.loading) return;
    
    this.setData({ loading: true });
    
    try {
      const page = refresh ? 1 : this.data.currentPage;
      const result = await postManager.getPosts(page, 10);
      
      const posts = refresh ? result.posts : [...this.data.posts, ...result.posts];
      
      // 更新每个帖子的时间显示
      posts.forEach(post => {
        post.timeAgo = this.formatTimeAgo(post.createTime);
      });
      
      this.setData({
        posts: posts,
        hasMore: result.hasMore,
        currentPage: refresh ? 2 : page + 1,
        loading: false,
        refreshing: false
      });
      
    } catch (error) {
      console.error('加载帖子失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
      this.setData({ 
        loading: false, 
        refreshing: false 
      });
    }
  },

  // 格式化时间显示
  formatTimeAgo(timestamp) {
    const now = new Date();
    const postTime = new Date(timestamp);
    const diff = now - postTime;
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
      return postTime.toLocaleDateString();
    }
  },

  // 搜索功能
  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value });
  },

  onSearchConfirm() {
    const keyword = this.data.searchKeyword.trim();
    if (!keyword) return;
    
    wx.navigateTo({
      url: `/pages/search/search?keyword=${encodeURIComponent(keyword)}`
    });
  },

  // 转发帖子
  onSharePost(e) {
    const postId = e.currentTarget.dataset.id;
    console.log('转发帖子:', postId);
    wx.showToast({
      title: '转发功能开发中',
      icon: 'none'
    });
  },

  // 评论帖子
  onCommentPost(e) {
    const postId = e.currentTarget.dataset.id;
    console.log('评论帖子:', postId);
    wx.navigateTo({
      url: `/pages/post-detail/post-detail?id=${postId}`
    });
  },

  // 点赞/取消点赞
  async onLikePost(e) {
    const postId = e.currentTarget.dataset.id;
    const postIndex = e.currentTarget.dataset.index;
    
    try {
      const result = await postManager.toggleLike(postId);
      
      // 更新页面数据
      const posts = this.data.posts;
      posts[postIndex].isLiked = result.isLiked;
      posts[postIndex].likes = result.likes;
      
      this.setData({ posts });
      
      // 删除了振动反馈
      // wx.vibrateShort();
      
    } catch (error) {
      wx.showToast({
        title: error.message || '操作失败',
        icon: 'none'
      });
    }
  },

  // 查看图片
  previewImage(e) {
    const { images, index } = e.currentTarget.dataset;
    wx.previewImage({
      urls: images,
      current: images[index]
    });
  },

  // 查看用户主页
  navigateToUserProfile(e) {
    const userId = e.currentTarget.dataset.userid;
    console.log('查看用户主页:', userId);
    wx.showToast({
      title: '用户主页开发中',
      icon: 'none'
    });
    // wx.navigateTo({
    //   url: `/pages/user-profile/user-profile?id=${userId}`
    // });
  },

  // 下拉刷新
  async onPullDownRefresh() {
    console.log('下拉刷新');
    this.setData({ refreshing: true });
    await this.loadPosts(true);
    wx.stopPullDownRefresh();
  },

  // 触底加载更多
  onReachBottom() {
    console.log('触底加载更多');
    if (this.data.hasMore && !this.data.loading) {
      this.loadPosts(false);
    }
  },

  // 页面分享
  onShareAppMessage() {
    return {
      title: '校园生活分享',
      desc: '发现精彩的校园生活',
      path: '/pages/index/index'
    };
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: '校园生活分享'
    };
  }
});