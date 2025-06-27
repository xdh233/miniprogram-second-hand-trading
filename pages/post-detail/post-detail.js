const postManager = require('../../utils/postManager');
const userManager = require('../../utils/userManager');

Page({
  data: {
    postId: null,
    post: null,
    userInfo: null,
    comments: [],
    newCommentContent: '',
    loading: true,
    loadingMore: false,
    hasMore: true,
    currentPage: 1,
    currentImageIndex: 0,
    pageSize: 20,
    sortType: 'hot',
  },

  onLoad(options) {
    console.log('post-detail onLoad, options:', options);
    if (options.id) {
      // 确保postId是数字类型
      const postId = parseInt(options.id);
      console.log('设置postId:', postId);
      this.setData({ postId: postId });
      this.loadPostDetail();
      this.loadComments();
    } else {
      console.error('没有传入postId');
      wx.showToast({
        title: '帖子ID缺失',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 2000);
    }
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
  // 加载帖子详情
  async loadPostDetail() {
    // 先检查postId是否存在
    if (!this.data.postId) {
      console.error('postId为空:', this.data.postId);
      wx.showToast({
        title: '帖子ID无效',
        icon: 'none'
      });
      return;
    }
    try {
      this.setData({ loading: true });
      console.log('正在加载帖子的ID:', this.data.postId);
      
      const post = await postManager.getPostDetail(this.data.postId);
      console.log('获取到的帖子数据:', post);
      
      if (!post) {
        throw new Error('未获取到帖子数据');
      }
      
      this.setData({ 
        post,
        loading: false
      });
      
      // 设置页面标题
      wx.setNavigationBarTitle({
        title: '动态详情'
      });
      
    } catch (error) {
      console.error('加载帖子详情失败:', error);
      this.setData({ loading: false });
      
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none',
        duration: 2000
      });
      
      // 3秒后返回上一页
      setTimeout(() => {
        wx.navigateBack();
      }, 3000);
    }
  },
  // 加载评论列表
  async loadComments(refresh = false) {
    if (this.data.loadingMore && !refresh) return;

    const page = refresh ? 1 : this.data.currentPage;
    
    try {
      this.setData({ loadingMore: true });
      console.log('加载评论，postId:', this.data.postId, 'page:', page);
      
      const comments = await postManager.getPostComments(
        this.data.postId,
        page,
        this.data.pageSize,
        this.data.sortType
      );

      console.log('获取到的评论:', comments);

      this.setData({
        comments: refresh ? comments : [...this.data.comments, ...comments],
        currentPage: page + 1,
        hasMore: comments.length === this.data.pageSize,
        loadingMore: false,
        'post.commentsCount': comments.length
      });
    } catch (error) {
      console.error('加载评论失败:', error);
      this.setData({ loadingMore: false });
    }
  },
  // 选择评论显示方式
  onSortSelect(e) {
    const sortType = e.currentTarget.dataset.sort;
    
    if (sortType === this.data.sortType) {
      // 如果选择的是当前排序，不做操作
      return;
    }
    
    console.log('切换排序方式:', sortType);
    
    this.setData({
      sortType: sortType,
      comments: [], // 清空现有评论
      currentPage: 1,
      hasMore: true
    });
    
    // 重新加载评论
    this.loadComments(true);
  }, 
  // 评论内容输入
  onCommentInput(e) {
    this.setData({
      newCommentContent: e.detail.value
    });
  },
  // 提交评论
  async submitComment() {
    if (!this.data.newCommentContent.trim()) {
      return wx.showToast({
        title: '请输入评论内容',
        icon: 'none'
      });
    }

    try {
      console.log('提交评论，postId:', this.data.postId, 'content:', this.data.newCommentContent);
      
      await postManager.addCommentByPostId(this.data.postId, this.data.newCommentContent);
      
      this.setData({ newCommentContent: '' });
      
      // 刷新评论列表 评论数量
      this.loadComments(true);

      wx.showToast({
        title: '评论成功',
        icon: 'success'
      });
      
    } catch (error) {
      console.error('提交评论失败:', error);
      wx.showToast({
        title: error.message || '评论失败',
        icon: 'none'
      });
    }
  },
  // 点赞/取消点赞
  async onLikePost() {
    try {
      const result = await postManager.toggleLike(this.data.postId);
      this.setData({
        'post.isLiked': result.isLiked,
        'post.likes': result.likes
      });
    } catch (error) {
      console.error('点赞操作失败:', error);
      wx.showToast({
        title: error.message || '操作失败',
        icon: 'none'
      });
    }
  },
  // 评论点赞/取消点赞
  async onLikeComment(e) {
    const commentId = e.currentTarget.dataset.id;
    const commentIndex = e.currentTarget.dataset.index;
    
    try {
      const result = await postManager.toggleCommentLike(commentId);
      
      // 更新评论数据
      const comments = this.data.comments;
      comments[commentIndex].isLiked = result.isLiked;
      comments[commentIndex].likes = result.likes;
      
      this.setData({ comments });
      
    } catch (error) {
      console.error('评论点赞操作失败:', error);
      wx.showToast({
        title: error.message || '操作失败',
        icon: 'none'
      });
    }
  },
  // 分享
  onShareAppMessage() {
    const post = this.data.post;
    
    if (!post) {
      return {
        title: '校园动态分享',
        desc: '发现精彩的校园生活',
        path: '/pages/index/index',
        imageUrl: '/images/default-share.jpg'
      };
    }
    
    return {
      title: this.formatShareTitle(post),
      path: `/pages/post-detail/post-detail?id=${postId}`,
      imageUrl: post.images?.[0] || '/images/default-share.jpg'
    };
  },
  // 格式化分享标题 
  formatShareTitle(post) {
    if (!post || !post.content) {
      return '校园动态分享';
    }
    
    const authorName = post.userNickname || post.userName || '校园用户';
    
    // 清理内容并截取
    let contentPreview = post.content.trim();
    if (contentPreview.length > 30) {
      contentPreview = contentPreview.substring(0, 30) + '...';
    }
    
    return `${authorName}: ${contentPreview}`;
  },
  // 私信
  onPrivateChat() {
    const post = this.data.post;
    if (!post) {
      wx.showToast({
        title: '帖子信息获取失败',
        icon: 'none'
      });
      return;
    }
    const currentUser = userManager.getCurrentUser(); // 获取当前用户ID
    const currentUserId =currentUser.id;
    if (post.userId === currentUserId) {
      wx.showToast({
        title: '不能联系自己',
        icon: 'none'
      });
      return;
    }

    wx.navigateTo({
      url: `/pages/chat/chat?userId=${post.userId}&postId=${post.id}`
    });
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
    const images = e.currentTarget.dataset.images || this.data.post.images;
    const index = e.currentTarget.dataset.index || 0;
    
    wx.previewImage({
      current: images[index],
      urls: images
    });
  },

  // 下拉刷新
  async onPullDownRefresh() {
    await this.loadPostDetail();
    await this.loadComments(true);
    wx.stopPullDownRefresh();
  },

  // 触底加载更多
  onReachBottom() {
    if (this.data.hasMore && !this.data.loadingMore) {
      this.loadComments();
    }
  }
});