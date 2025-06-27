// pages/index/index.js - 修复版本

const userManager = require('../../utils/userManager');
const postManager = require('../../utils/postManager');
const sharedTools = require('../../utils/sharedTools');

Page({
  data: {
    userInfo: null,
    posts: [],
    loading: false,
    refreshing: false,
    hasMore: true,
    currentPage: 1,
    searchKeyword: '',
    sharePostId: '' // 保持不变
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
      wx.reLaunch({
        url: '/pages/login/login'
      });
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
        post.timeAgo = sharedTools.formatTimeAgo(post.createTime);
      });
      
      this.setData({
        posts: posts,
        hasMore: result.hasMore,
        currentPage: refresh ? 2 : page + 1,
        loading: false,
        ...(refresh && { refreshing: false })
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

  // 搜索功能 
  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value });
  },

  async onSearch(e) {
    const keyword = e.detail.value || this.data.searchKeyword;
    if (!keyword.trim()) {
      this.loadPosts(true);
      return;
    }
    
    console.log('搜索帖子:', keyword);
    
    try {
      const results = await postManager.searchPosts(keyword);
      
      this.setData({
        posts: results,
        hasMore: false,
      });
      
      if (results.length === 0) {
        wx.showToast({
          title: '没有找到相关帖子',
          icon: 'none'
        });
      }
    } catch (error) {
      wx.showToast({
        title: '搜索失败',
        icon: 'error'
      });
    }
  },

  // 修复1: onShareAppMessage 中的变量引用错误
  onShareAppMessage() {
    const post = this.data.posts.find(p => p.id == this.data.sharePostId);
    
    if (!post) {
      return {
        title: '校园生活分享',
        desc: '发现精彩的校园生活',
        path: '/pages/index/index',
        imageUrl: '/images/default-share.jpg'
      };
    }
    
    return {
      title: post.content.substring(0, 20) || '校园动态', // 改为 post.content
      path: `/pages/post-detail/post-detail?id=${this.data.sharePostId}`,
      imageUrl: post.images?.[0] || '/images/default-share.jpg' // 改为 post.images
    };
  },

  // 转发帖子 
  onSharePost(e) {
    const postId = e.currentTarget.dataset.id;
    const post = this.data.posts.find(p => p.id == postId);
    
    if (!post) {
      wx.showToast({
        title: '帖子不存在',
        icon: 'none'
      });
      return;
    }
    
    console.log('要分享的帖子:', post);
    this.setData({ sharePostId: postId });
  },

  // 修复2: 实际使用 formatShareTitle 方法（可选）
  formatShareTitle(post) {
    if (!post || !post.content) {
      return '校园动态';
    }
    
    const authorName = post.userNickname || post.userName || '校园用户';
    
    let contentPreview = post.content.trim();
    if (contentPreview.length > 30) {
      contentPreview = contentPreview.substring(0, 30) + '...';
    }
    
    return `${authorName}: ${contentPreview}`;
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
      
      const posts = this.data.posts;
      posts[postIndex].isLiked = result.isLiked;
      posts[postIndex].likes = result.likes;
      
      this.setData({ posts });
      
    } catch (error) {
      wx.showToast({
        title: error.message || '操作失败',
        icon: 'none'
      });
    }
  },

  // 查看详情 
  onPostTap(e) {
    const postId = e.currentTarget.dataset.id;
    console.log('点击帖子，跳转到详情页:', postId);
    wx.navigateTo({
      url: `/pages/post-detail/post-detail?id=${postId}`
    });
  },

  // 防止事件冒泡 
  preventBubble() {
    // 什么都不做，只是阻止事件冒泡
  },

  // 查看图片 
  previewImage(e) {
    const { images, index } = e.currentTarget.dataset;
    wx.previewImage({
      urls: images,
      current: images[index]
    });
  },

  navigateToUserProfile(e) {
    const userId = e.currentTarget.dataset.userid;
    console.log('查看用户主页:', userId);
    
    // 可以选择显示开发中提示，或者直接跳转
    wx.showToast({
      title: '用户主页开发中',
      icon: 'none'
    });
    
    // 如果用户主页已开发，取消注释下面的代码
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
  }
});
