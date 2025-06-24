const postManager = require('../../utils/postManager');
const userManager = require('../../utils/userManager');

Page({
  data: {
    postId: null,
    post: null,
    comments: [],
    loading: true,
    commentContent: '',
    loadingMore: false,
    hasMore: true,
    currentPage: 1,
    pageSize: 20
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
      console.log('正在加载帖子ID:', this.data.postId);
      
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
        this.data.pageSize
      );

      console.log('获取到的评论:', comments);

      this.setData({
        comments: refresh ? comments : [...this.data.comments, ...comments],
        currentPage: page + 1,
        hasMore: comments.length === this.data.pageSize,
        loadingMore: false
      });
    } catch (error) {
      console.error('加载评论失败:', error);
      this.setData({ loadingMore: false });
    }
  },

  // 提交评论
  async submitComment() {
    if (!this.data.commentContent.trim()) {
      return wx.showToast({
        title: '请输入评论内容',
        icon: 'none'
      });
    }

    try {
      console.log('提交评论，postId:', this.data.postId, 'content:', this.data.commentContent);
      
      await postManager.addComment(this.data.postId, this.data.commentContent);
      
      this.setData({ commentContent: '' });
      
      // 刷新评论列表
      this.loadComments(true);
      
      // 更新帖子的评论数显示
      this.loadPostDetail();
      
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
      const result = await postManager.toggleLike(this.data.post.id);
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

  // 分享
  onShareAppMessage() {
    const post = this.data.post;
    if (!post) {
      return {
        title: '校园动态分享',
        path: '/pages/index/index'
      };
    }
    
    return {
      title: post.content.length > 50 ? post.content.substring(0, 50) + '...' : post.content,
      path: `/pages/post-detail/post-detail?id=${post.id}`
    };
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
    // 方法一：跳转到聊天页面
    wx.navigateTo({
      url: `/pages/chat/chat?userId=${post.userId}&userName=${post.userName || post.nickname}`
    });
  },
  // 预览图片
  previewImage(e) {
    const { images, index } = e.currentTarget.dataset;
    wx.previewImage({
      current: images[index],
      urls: images
    });

    if (this.data.isSeller) {
      wx.showToast({
        title: '不能联系自己',
        icon: 'none'
      });
      return;
    }
  },

  // 评论内容输入
  onCommentInput(e) {
    this.setData({
      commentContent: e.detail.value
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
})