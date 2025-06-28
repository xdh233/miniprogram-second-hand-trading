// post-detail.js - 嵌套回复功能

const postManager = require('../../utils/postManager');
const userManager = require('../../utils/userManager');

Page({
  data: {
    postId: null,
    post: null,
    userInfo: null,
    comments: [],
    organizedComments: [], // 组织好的嵌套评论结构
    totalCommentsCount: 0, // 总评论数（包括回复）
    newCommentContent: '',
    loading: true,
    loadingMore: false,
    hasMore: true,
    currentPage: 1,
    currentImageIndex: 0,
    pageSize: 20,
    sortType: 'hot',
    
    // 回复相关字段
    showReplyInput: false,
    replyingToComment: null,  // 主评论对象
    replyToTarget: null,      // 被回复的具体目标（可能是主评论或子回复）
    replyContent: '',
    replyTargetInfo: {        // 回复目标信息
      targetName: '',         // 直接回复的用户名
      replyToName: ''         // 如果是回复子回复，这里是原始被回复者的名字
    }
  },

  // 跳转到用户个人空间
  goToUserProfile(e) {
    const userId = e.currentTarget.dataset.userId;
    console.log('跳转到用户空间:', userId);
    
    // 检查是否是当前用户自己
    const currentUser = userManager.getCurrentUser();
    if (currentUser && currentUser.id == userId) {
      // 跳转到自己的个人中心
      wx.switchTab({
        url: '/pages/profile/profile'
      });
    } else {
      // 跳转到其他用户的个人空间
      wx.navigateTo({
        url: `/pages/user-profile/user-profile?userId=${userId}`
      });
    }
  },

  onLoad(options) {
    console.log('post-detail onLoad, options:', options);
    if (options.id) {
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

      // 组织评论为嵌套结构
      const organizedComments = this.organizeCommentsWithReplies(comments);
      
      // 强制重新初始化 displayReplies，确保数据正确
      organizedComments.forEach(comment => {
        if (comment.replies.length <= 2) {
          comment.displayReplies = [...comment.replies];
        } else {
          comment.displayReplies = comment.replies.slice(0, 2);
        }
        console.log(`强制初始化 - 评论 ${comment.userNickname}: 总回复=${comment.replies.length}, 显示=${comment.displayReplies.length}`);
      });
      
      // 计算总评论数（包括回复）
      const totalCommentsCount = this.calculateTotalComments(organizedComments);

      console.log('设置 organizedComments:');
      organizedComments.forEach((c, index) => {
        console.log(`设置评论${index}: ID=${c.id}, showAllReplies=${c.showAllReplies}, 回复数=${c.replies.length}, 显示回复数=${c.displayReplies ? c.displayReplies.length : '未定义'}`);
      });

      this.setData({
        comments: refresh ? comments : [...this.data.comments, ...comments],
        organizedComments: organizedComments,
        totalCommentsCount: totalCommentsCount,
        currentPage: page + 1,
        hasMore: comments.length === this.data.pageSize,
        loadingMore: false,
        'post.comments': totalCommentsCount
      });
    } catch (error) {
      console.error('加载评论失败:', error);
      this.setData({ loadingMore: false });
    }
  },

  // 组织评论为嵌套结构
  organizeCommentsWithReplies(allComments) {
    const commentMap = new Map();
    const rootComments = [];
    
    // 先创建所有评论的映射，并初始化replies数组
    allComments.forEach(comment => {
      comment.replies = [];
      comment.showAllReplies = false; // 控制是否显示所有回复
      commentMap.set(comment.id, comment);
      
      // 如果没有parentId，说明是主评论
      if (!comment.parentId) {
        rootComments.push(comment);
      }
    });
    
    // 然后将回复分配到对应的主评论下
    allComments.forEach(comment => {
      if (comment.parentId) {
        const parentComment = commentMap.get(comment.parentId);
        if (parentComment) {
          parentComment.replies.push(comment);
        }
      }
    });
    
    // 对每个主评论的回复按时间排序
    rootComments.forEach(comment => {
      if (comment.replies.length > 0) {
        comment.replies.sort((a, b) => new Date(a.createTime) - new Date(b.createTime));
      }
    });
    
    console.log('组织后的评论结构:', rootComments);
    console.log('每个评论的回复数量和显示状态:');
    rootComments.forEach((c, index) => {
      console.log(`评论${index}: ID=${c.id}, 昵称=${c.userNickname}, 回复数=${c.replies.length}, showAllReplies=${c.showAllReplies}, 应显示展开按钮=${c.replies.length > 2}`);
    });
    
    return rootComments;
  },

  // 计算总评论数（包括回复）
  calculateTotalComments(organizedComments) {
    let total = 0;
    organizedComments.forEach(comment => {
      total += 1; // 主评论
      total += comment.replies.length; // 回复数
    });
    return total;
  },

  // 选择评论显示方式
  onSortSelect(e) {
    const sortType = e.currentTarget.dataset.sort;
    
    if (sortType === this.data.sortType) {
      return;
    }
    
    console.log('切换排序方式:', sortType);
    
    this.setData({
      sortType: sortType,
      comments: [],
      organizedComments: [],
      currentPage: 1,
      hasMore: true
    });
    
    this.loadComments(true);
  },

  // 展开/收起更多回复
  toggleReplies(e) {
    const index = e.currentTarget.dataset.index;
    const organizedComments = [...this.data.organizedComments]; // 创建副本
    const comment = organizedComments[index];
    
    // 确保 displayReplies 存在
    if (!comment.displayReplies) {
      comment.displayReplies = comment.replies.length <= 2 ? comment.replies : comment.replies.slice(0, 2);
    }
    
    console.log('切换前:', {
      index: index,
      showAllReplies: comment.showAllReplies,
      totalReplies: comment.replies.length,
      currentDisplayReplies: comment.displayReplies.length
    });
    
    // 切换展开状态
    comment.showAllReplies = !comment.showAllReplies;
    
    // 更新显示的回复
    if (comment.showAllReplies) {
      comment.displayReplies = comment.replies; // 显示全部
    } else {
      comment.displayReplies = comment.replies.slice(0, 2); // 显示前2条
    }
    
    console.log('切换后:', {
      showAllReplies: comment.showAllReplies,
      displayReplies: comment.displayReplies.length
    });
    
    this.setData({
      organizedComments: organizedComments
    });
  },

  // 显示回复输入框
  showReplyInput(e) {
    const dataset = e.currentTarget.dataset;
    const comment = dataset.comment;  // 主评论
    const replyTo = dataset.replyTo;  // 被回复的目标（如果是回复子回复）
    const isReply = dataset.isReply;  // 是否是回复子回复
    
    console.log('开始回复:', { comment, replyTo, isReply });
    
    let replyTargetInfo = {
      targetName: comment.userNickname,
      replyToName: ''
    };
    
    let replyToTarget = comment;
    
    // 如果是回复子回复
    if (isReply && replyTo) {
      replyTargetInfo.targetName = replyTo.userNickname;
      replyTargetInfo.replyToName = replyTo.replyToUserName || comment.userNickname;
      replyToTarget = replyTo;
    }
    
    this.setData({
      showReplyInput: true,
      replyingToComment: comment,      // 始终是主评论
      replyToTarget: replyToTarget,    // 实际回复的目标
      replyContent: '',
      replyTargetInfo: replyTargetInfo
    });
  },

  // 取消回复
  cancelReply() {
    this.setData({
      showReplyInput: false,
      replyingToComment: null,
      replyToTarget: null,
      replyContent: '',
      replyTargetInfo: {
        targetName: '',
        replyToName: ''
      }
    });
  },

  // 评论内容输入
  onCommentInput(e) {
    this.setData({
      newCommentContent: e.detail.value
    });
  },

  // 回复内容输入
  onReplyInput(e) {
    this.setData({
      replyContent: e.detail.value
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

  // 提交回复
  async submitReply() {
    if (!this.data.replyContent.trim()) {
      return wx.showToast({
        title: '请输入回复内容',
        icon: 'none'
      });
    }

    const replyingTo = this.data.replyingToComment; // 主评论
    const replyToTarget = this.data.replyToTarget;   // 实际回复目标
    
    try {
      console.log('提交回复:', {
        postId: this.data.postId,
        parentCommentId: replyingTo.id,
        content: this.data.replyContent,
        replyToUserId: replyToTarget.userId,
        replyToUserName: replyToTarget.userNickname
      });
      
      await postManager.addReplyToComment(
        this.data.postId,
        replyingTo.id,  // 父评论ID（始终是主评论的ID）
        this.data.replyContent,
        replyToTarget.userId,
        replyToTarget.userNickname
      );
      
      this.cancelReply();
      
      // 保存当前的展开状态
      const currentExpandStates = {};
      this.data.organizedComments.forEach((comment, index) => {
        currentExpandStates[comment.id] = comment.showAllReplies;
      });
      
      // 重新加载评论
      await this.loadComments(true);
      
      // 恢复展开状态
      const organizedComments = [...this.data.organizedComments];
      organizedComments.forEach(comment => {
        if (currentExpandStates[comment.id]) {
          comment.showAllReplies = true;
          comment.displayReplies = [...comment.replies];
        }
      });
      
      this.setData({ organizedComments });
      
      wx.showToast({
        title: '回复成功',
        icon: 'success'
      });
      
    } catch (error) {
      console.error('提交回复失败:', error);
      wx.showToast({
        title: error.message || '回复失败',
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
    const isReply = e.currentTarget.dataset.isReply;
    
    try {
      const result = await postManager.toggleCommentLike(commentId);
      
      // 更新对应的评论数据
      if (isReply) {
        // 更新回复的点赞状态
        this.updateReplyLikeStatus(commentId, result);
      } else {
        // 更新主评论的点赞状态
        this.updateMainCommentLikeStatus(commentId, result);
      }
      
    } catch (error) {
      console.error('评论点赞操作失败:', error);
      wx.showToast({
        title: error.message || '操作失败',
        icon: 'none'
      });
    }
  },

  // 更新主评论点赞状态
  updateMainCommentLikeStatus(commentId, result) {
    const organizedComments = [...this.data.organizedComments]; // 创建副本
    const commentIndex = organizedComments.findIndex(c => c.id == commentId);
    
    if (commentIndex !== -1) {
      organizedComments[commentIndex].isLiked = result.isLiked;
      organizedComments[commentIndex].likes = result.likes;
      this.setData({ organizedComments });
    }
  },

  // 更新回复点赞状态
  updateReplyLikeStatus(replyId, result) {
    const organizedComments = [...this.data.organizedComments]; // 创建副本
    
    for (let i = 0; i < organizedComments.length; i++) {
      const comment = organizedComments[i];
      const replyIndex = comment.replies.findIndex(r => r.id == replyId);
      
      if (replyIndex !== -1) {
        comment.replies[replyIndex].isLiked = result.isLiked;
        comment.replies[replyIndex].likes = result.likes;
        this.setData({ organizedComments });
        break;
      }
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
      path: `/pages/post-detail/post-detail?id=${this.data.postId}`,
      imageUrl: post.images?.[0] || '/images/default-share.jpg'
    };
  },

  // 格式化分享标题 
  formatShareTitle(post) {
    if (!post || !post.content) {
      return '校园动态分享';
    }
    
    const authorName = post.userNickname || post.userName || '校园用户';
    
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
    
    const currentUser = userManager.getCurrentUser();
    const currentUserId = currentUser.id;
    
    if (post.userId === currentUserId) {
      wx.showToast({
        title: '不能私信自己',
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

  // 键盘高度变化
  onKeyboardHeightChange(e) {
    console.log('键盘高度变化:', e.detail);
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