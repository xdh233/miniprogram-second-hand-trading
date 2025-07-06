// pages/index/index.js - 调试版本
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
    sharePostId: ''
  },

  onLoad() {
    console.log('=== 首页加载 ===');
    this.checkLoginStatus();
  },

  // 优化后的 onShow 方法
  onShow() {
    console.log('=== 首页显示 ===');
    this.checkLoginStatus();
    
    if (this.data.userInfo) {
      // 检查是否需要刷新数据
      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1];
      
      // 如果是从详情页返回，刷新当前页面数据
      if (pages.length > 1) {
        const prevPage = pages[pages.length - 2];
        if (prevPage && prevPage.route && prevPage.route.includes('post-detail')) {
          console.log('🔄 从详情页返回，刷新帖子数据');
          this.refreshCurrentPosts();
          return;
        }
      }
      
      // 如果帖子列表为空，重新加载
      if (this.data.posts.length === 0) {
        console.log('🔄 帖子列表为空，重新加载');
        this.loadPosts(true);
      }
    }
  },

  // 刷新当前已加载的帖子数据（保持分页状态）
  async refreshCurrentPosts() {
    if (this.data.posts.length === 0) {
      this.loadPosts(true);
      return;
    }
    
    try {
      console.log('🔄 刷新当前帖子数据...');
      
      // 获取当前帖子的ID列表
      const currentPostIds = this.data.posts.map(post => post.id);
      
      // 重新获取这些帖子的最新数据
      const refreshPromises = currentPostIds.map(async (postId) => {
        try {
          return await postManager.getPostDetail(postId);
        } catch (error) {
          console.error(`刷新帖子 ${postId} 失败:`, error);
          return null;
        }
      });
      
      const refreshedPosts = await Promise.all(refreshPromises);
      
      // 过滤掉获取失败的帖子，保持原有顺序
      const updatedPosts = refreshedPosts
        .filter(post => post !== null)
        .map(post => {
          // 应用相同的数据处理逻辑
          let commentCount = post.comments || post.comment_count || post.commentCount || 0;
          let likeCount = post.likes || post.like_count || post.likeCount || 0;
          let isLiked = post.isLiked || post.is_liked || post.user_liked || false;
          
          return {
            ...post,
            comments: commentCount,
            likes: likeCount,
            isLiked: isLiked
          };
        });
      
      console.log('✅ 刷新完成，更新帖子数据');
      this.setData({ posts: updatedPosts });
      
    } catch (error) {
      console.error('❌ 刷新帖子数据失败:', error);
      // 刷新失败时，重新加载第一页
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
      console.log('🔄 开始加载帖子，页码:', page);
      
      const result = await postManager.getPosts(page, 10);
      console.log('📥 从postManager获取的原始数据:', result);
      
      // 🔍 详细检查评论数据
      if (result.posts && Array.isArray(result.posts)) {
        result.posts.forEach((post, index) => {
          console.log(`📝 帖子${index + 1} (ID: ${post.id}):`);
          console.log('  - 内容:', post.content?.substring(0, 30) + '...');
          console.log('  - 评论数量字段:', {
            comments: post.comments,
            comment_count: post.comment_count,
            commentCount: post.commentCount,
            commentsCount: post.commentsCount
          });
          console.log('  - 点赞数量字段:', {
            likes: post.likes,
            like_count: post.like_count,
            likeCount: post.likeCount,
            likesCount: post.likesCount
          });
          console.log('  - 所有字段:', Object.keys(post));
          console.log('---');
        });
      }
      
      const posts = refresh ? result.posts : [...this.data.posts, ...result.posts];
      
      this.setData({
        posts: posts,
        hasMore: result.hasMore,
        currentPage: refresh ? 2 : page + 1,
        loading: false,
        ...(refresh && { refreshing: false })
      });
      
      console.log('✅ 设置数据完成，当前页面posts数量:', posts.length);
      
    } catch (error) {
      console.error('❌ 加载帖子失败:', error);
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
    
    console.log('🔍 搜索帖子:', keyword);
    
    try {
      const results = await postManager.searchPosts(keyword);
      console.log('🔍 搜索结果:', results);
      
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
      console.error('❌ 搜索失败:', error);
      wx.showToast({
        title: '搜索失败',
        icon: 'error'
      });
    }
  },

  // 🆕 图片加载成功事件
  onImageLoad(e) {
    console.log('✅ 图片加载成功:', e.detail);
    console.log('✅ 成功加载的图片URL:', e.target.dataset);
  },

  // 🆕 图片加载失败事件
  onImageError(e) {
    console.error('❌ 图片加载失败:', e.detail);
    console.error('❌ 失败的图片URL:', e.target.src);
    console.error('❌ 失败的图片数据:', e.target.dataset);
  },

  // onShareAppMessage 中的变量引用
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
      title: post.content.substring(0, 20) || '校园动态',
      path: `/pages/post-detail/post-detail?id=${this.data.sharePostId}`,
      imageUrl: post.images?.[0] || '/images/default-share.jpg'
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
    
    console.log('📤 要分享的帖子:', post);
    this.setData({ sharePostId: postId });
  },

  // 评论帖子 
  onCommentPost(e) {
    const postId = e.currentTarget.dataset.id;
    console.log('💬 评论帖子:', postId);
    wx.navigateTo({
      url: `/pages/post-detail/post-detail?id=${postId}`
    });
  },

  // 点赞/取消点赞 
  async onLikePost(e) {
    const postId = e.currentTarget.dataset.id;
    const postIndex = e.currentTarget.dataset.index;
    
    // 防抖处理
    if (this.data.posts[postIndex].liking) {
      return;
    }
    
    try {
      // 设置点赞状态，防止重复点击
      const posts = [...this.data.posts];
      posts[postIndex].liking = true;
      this.setData({ posts });
      
      const result = await postManager.toggleLike(postId);
      
      // 更新点赞状态
      posts[postIndex].isLiked = result.isLiked;
      posts[postIndex].likes = result.likes;
      posts[postIndex].liking = false;
      
      this.setData({ posts });
      
    } catch (error) {
      // 恢复点赞状态
      const posts = [...this.data.posts];
      posts[postIndex].liking = false;
      this.setData({ posts });
      
      wx.showToast({
        title: error.message || '操作失败',
        icon: 'none'
      });
    }
  },

  // 查看详情 
  onPostTap(e) {
    const postId = e.currentTarget.dataset.id;
    console.log('👆 点击帖子，跳转到详情页:', postId);
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
    console.log('🖼️ 预览图片:', images, '索引:', index);
    wx.previewImage({
      urls: images,
      current: images[index]
    });
  },

  // 用户主页跳转参数名统一
  navigateToUserProfile(e) {
    const userId = e.currentTarget.dataset.userid;
    console.log('👤 查看用户主页:', userId);
    
    if (userId) {
      wx.navigateTo({
        url: `/pages/user-profile/user-profile?userId=${userId}`
      });
    }
  },

  // 下拉刷新 
  async onPullDownRefresh() {
    console.log('🔄 下拉刷新');
    this.setData({ refreshing: true });
    await this.loadPosts(true);
    wx.stopPullDownRefresh();
  },

  // 触底加载更多 
  onReachBottom() {
    console.log('📄 触底加载更多');
    if (this.data.hasMore && !this.data.loading) {
      this.loadPosts(false);
    }
  }
});