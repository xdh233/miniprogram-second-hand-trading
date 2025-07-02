const userManager = require('../../utils/userManager');
const itemManager = require('../../utils/itemManager');
const commentManager = require('../../utils/commentManager');
const sharedTools = require('../../utils/sharedTools');
Page({
  data: {
    itemId: null,
    item: null,
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
    isLiked: false, // 收藏状态
    
    // 回复相关字段（与 Item-detail 保持一致）
    showReplyInput: false,
    replyingToComment: null,  // 主评论对象
    replyToTarget: null,      // 被回复的具体目标（可能是主评论或子回复）
    replyContent: '',
    inputFocus: false,        // 控制输入框焦点
    replyTargetInfo: {        // 回复目标信息
      targetName: '',         // 直接回复的用户名
      replyToName: ''         // 如果是回复子回复，这里是原始被回复者的名字
    }
  },

  onLoad(options) {
    console.log('item-detail onLoad, options:', options);
    if (options.id) {
      const itemId = parseInt(options.id);
      console.log('设置itemId:', itemId);
      this.setData({ itemId: itemId });
      this.checkLoginStatus();
      this.loadItemDetail();
      this.loadComments();
    } else {
      console.error('没有传入itemId');
      wx.showToast({
        title: '商品ID缺失',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 500);
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

  // 加载商品详情
  async loadItemDetail() {
    const itemId = this.data.itemId;
    if (!itemId) {
      console.error('itemId为空:', itemId);
      wx.showToast({
        title: '商品ID无效',
        icon: 'none'
      });
      return;
    }

    try {
      this.setData({ loading: true });
      console.log('正在加载商品的ID:', itemId);

      const item = await itemManager.getItemDetail(itemId);
      console.log('获取到的商品数据:', item);

      if (!item) {
        throw new Error('商品不存在');
      }

      // 格式化发布时间
      item.formattedPublishTime = sharedTools.formatTime(item.createTime);

      // 增加浏览次数
      itemManager.incrementViewCount(itemId);

      // 设置收藏状态
      const isLiked = item.isLiked || false;

      this.setData({
        item: item,
        isLiked: isLiked,
        loading: false
      });

      // 设置页面标题
      wx.setNavigationBarTitle({
        title: '商品详情'
      });

      console.log('商品详情加载成功:', itemId);

    } catch (error) {
      console.error('加载商品详情失败:', error);
      this.setData({ loading: false });
      
      wx.showToast({
        title: error.message || '商品不存在',
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
      console.log('加载评论，itemId:', this.data.itemId, 'page:', page);
      
      const comments = await commentManager.getComments(
        this.data.itemId,
        'item',
        page,
        this.data.pageSize,
        this.data.sortType
      );

      console.log('获取到的评论:', comments);

      // 组织评论为嵌套结构
      const organizedComments = this.organizeCommentsWithReplies(comments);
      
      // 计算总评论数（包括回复）
      const totalCommentsCount = this.calculateTotalComments(organizedComments);

      this.setData({
        comments: refresh ? comments : [...this.data.comments, ...comments],
        organizedComments: organizedComments,
        totalCommentsCount: totalCommentsCount,
        currentPage: page + 1,
        hasMore: comments.length === this.data.pageSize,
        loadingMore: false
      });

    } catch (error) {
      console.error('加载评论失败:', error);
      this.setData({ 
        loadingMore: false,
        organizedComments: [],
        totalCommentsCount: 0
      });
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
    
    // 对每个主评论的回复按时间排序，并初始化显示状态
    rootComments.forEach(comment => {
      if (comment.replies.length > 0) {
        comment.replies.sort((a, b) => new Date(a.createTime) - new Date(b.createTime));
      }
      
      // 关键修复：强制重新初始化 displayReplies
      if (comment.replies.length <= 2) {
        comment.displayReplies = [...comment.replies];
      } else {
        comment.displayReplies = comment.replies.slice(0, 2);
      }
      comment.showAllReplies = false; // 强制设为未展开状态
      
      console.log(`评论 ${comment.userNickname}: 总回复=${comment.replies.length}, 显示回复=${comment.displayReplies.length}, 展开状态=${comment.showAllReplies}`);
    });
    
    console.log('组织后的评论结构:', rootComments);
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

  // 展开/收起更多回复
  toggleReplies(e) {
    const index = e.currentTarget.dataset.index;
    const organizedComments = [...this.data.organizedComments];
    const comment = organizedComments[index];
    
    console.log('切换展开状态，当前:', comment.showAllReplies);
    
    // 切换展开状态
    comment.showAllReplies = !comment.showAllReplies;
    
    // 更新显示的回复
    if (comment.showAllReplies) {
      comment.displayReplies = [...comment.replies]; // 显示全部
    } else {
      comment.displayReplies = comment.replies.slice(0, 2); // 显示前2条
    }
    
    this.setData({
      organizedComments: organizedComments
    });
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
      comments: [], // 清空现有评论
      organizedComments: [],
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

  // 回复内容输入
  onReplyInput(e) {
    // 添加详细的日志
    console.log('onReplyInput 事件触发:', {
      value: e.detail.value,
      type: typeof e.detail.value
    });
    
    // 确保设置值
    this.setData({
      replyContent: e.detail.value || '' // 确保不会是 undefined
    });
    
    // 验证设置是否成功
    console.log('设置后的 replyContent:', this.data.replyContent);
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
      console.log('提交评论，itemId:', this.data.itemId, 'content:', this.data.newCommentContent);
      
      await commentManager.addComment(this.data.itemId,'item',this.data.newCommentContent);
      
      this.setData({ newCommentContent: '' });
      
      // 刷新评论列表
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

  // 显示回复输入框
  showReplyInput(e) {
    const dataset = e.currentTarget.dataset;
    const comment = dataset.comment;
    const replyTo = dataset.replyTo;
    const isReply = dataset.isReply;
  
    // 重置状态确保干净
    this.setData({
      showReplyInput: true,
      replyingToComment: comment,
      replyToTarget: replyTo || comment,
      replyContent: '',
      inputFocus: false // 先设为false确保下次设置生效
    });
  
    // 设置回复目标信息
    const replyTargetInfo = {
      targetName: (replyTo || comment).userNickname,
      replyToName: isReply ? comment.userNickname : ''
    };
    
    // 延迟设置焦点（解决微信渲染问题）
    setTimeout(() => {
      this.setData({ 
        replyTargetInfo,
        inputFocus: true // 触发焦点
      });
    }, 300);
  },

  // 取消回复
  cancelReply() {
    console.log('取消回复');
    
    this.setData({
      showReplyInput: false,
      replyingToComment: null,
      replyToTarget: null,
      replyContent: '',               // 确保清空
      inputFocus: false,              // 取消焦点
      replyTargetInfo: {
        targetName: '',
        replyToName: ''
      }
    });
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
    
    // 调试信息
    console.log('当前回复状态:', {
      replyingTo: replyingTo,
      replyToTarget: replyToTarget,
      organizedComments: this.data.organizedComments
    });
    
    if (!replyingTo || !replyingTo.id) {
      wx.showToast({
        title: '回复信息错误，请重试',
        icon: 'none'
      });
      return;
    }
    
    try {
      console.log('提交回复参数:', {
        itemId: this.data.itemId,
        parentCommentId: replyingTo.id,
        content: this.data.replyContent,
        replyToUserId: replyToTarget?.userId,
        replyToUserName: replyToTarget?.userNickname
      });
      
      // 调用回复接口，需要传递主评论ID作为parentId
      await commentManager.addReply(
        this.data.itemId,
        'item',
        replyingTo.id,  // 父评论ID（始终是主评论的ID）
        this.data.replyContent,
        replyToTarget?.userId || replyingTo.userId,
        replyToTarget?.userNickname || replyingTo.userNickname
      );
      
      // 清空回复状态
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

  
  // 收藏/取消收藏
  async toggleLike() {
    try {
      const itemId = this.data.itemId;      
      const result = await itemManager.toggleLike(itemId);
      
      this.setData({
        isLiked: result.isLiked,
        'item.likeCount': result.likes
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

  // 评论点赞/取消点赞
  async onLikeComment(e) {
    const commentId = e.currentTarget.dataset.id;
    const isReply = e.currentTarget.dataset.isReply;
    
    try {
      const result = await commentManager.toggleCommentLike(commentId);
      
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
    const organizedComments = [...this.data.organizedComments];
    const commentIndex = organizedComments.findIndex(c => c.id == commentId);
    
    if (commentIndex !== -1) {
      organizedComments[commentIndex].isLiked = result.isLiked;
      organizedComments[commentIndex].likes = result.likes;
      this.setData({ organizedComments });
    }
  },

  // 更新回复点赞状态
  updateReplyLikeStatus(replyId, result) {
    const organizedComments = [...this.data.organizedComments];
    
    for (let i = 0; i < organizedComments.length; i++) {
      const comment = organizedComments[i];
      const replyIndex = comment.replies.findIndex(r => r.id == replyId);
      
      if (replyIndex !== -1) {
        comment.replies[replyIndex].isLiked = result.isLiked;
        comment.replies[replyIndex].likes = result.likes;
        
        // 同时更新displayReplies中的数据
        const displayIndex = comment.displayReplies.findIndex(r => r.id == replyId);
        if (displayIndex !== -1) {
          comment.displayReplies[displayIndex].isLiked = result.isLiked;
          comment.displayReplies[displayIndex].likes = result.likes;
        }
        
        this.setData({ organizedComments });
        break;
      }
    }
  },

  // 跳转到用户个人空间
  goToUserProfile(e) {
    const userId = e.currentTarget.dataset.userId;
    console.log('跳转到用户空间:', userId);
    
    // 检查是否是当前用户自己
    const currentUser = userManager.getCurrentUser();
    // 跳转到其他用户的个人空间
    wx.navigateTo({
      url: `/pages/user-profile/user-profile?userId=${userId}`
    });
  },

  // 键盘高度变化处理
  onKeyboardHeightChange(e) {
    const { height } = e.detail;
    console.log('键盘高度变化:', height);
  },

  // 分享
  onShareAppMessage() {
    const item = this.data.item;
    
    if (!item) {
      return {
        title: '校园二手分享',
        desc: '发现好物，省钱购物',
        path: '/pages/index/index',
        imageUrl: '/images/default-share.jpg'
      };
    }
    
    return {
      title: this.formatShareTitle(item),
      path: `/pages/item-detail/item-detail?id=${this.data.itemId}`,
      imageUrl: item.images?.[0] || '/images/default-share.jpg'
    };
  },

  // 格式化分享标题 
  formatShareTitle(item) {
    if (!item || !item.title) {
      return '校园二手分享';
    }
    
    const sellerName = item.sellerName || item.sellerNickname || '校园用户';
    
    // 清理标题并截取
    let titlePreview = item.title.trim();
    if (titlePreview.length > 30) {
      titlePreview = titlePreview.substring(0, 30) + '...';
    }
    
    return `${sellerName}: ${titlePreview}`;
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

  // 联系卖家
  contactSeller() {
    const item = this.data.item;
    const currentUser = userManager.getCurrentUser();
    const currentUserId = currentUser.id;

    if (!item || !item.sellerId) {
      wx.showToast({
        title: '卖家信息获取失败',
        icon: 'none'
      });
      return;
    }
    
    if (item.sellerId === currentUserId) {
      wx.showToast({
        title: '不能私信自己',
        icon: 'none'
      });
      return;
    }
    
    wx.navigateTo({
      url: `/pages/chat/chat?userId=${item.sellerId}&itemId=${this.data.itemId}`
    });
  },

  // 跳转到卖家主页
  navigateToSellerProfile() {
    const item = this.data.item;
    if (item && item.sellerId) {
      this.goToUserProfile({ currentTarget: { dataset: { userId: item.sellerId } } });
    }
  },

  // 下拉刷新
  async onPullDownRefresh() {
    await this.loadItemDetail();
    await this.loadComments(true);
    wx.stopPullDownRefresh();
  },

  // 触底加载更多
  onReachBottom() {
    if (this.data.hasMore && !this.data.loadingMore) {
      this.loadComments();
    }
  },
  // 购买商品
  onBuyItem() {
    const item = this.data.item;
    const currentUser = userManager.getCurrentUser();
    const currentUserId = currentUser.id;

    if (!item || !item.sellerId) {
      wx.showToast({
        title: '商品信息获取失败',
        icon: 'none'
      });
      return;
    }
    
    if (item.sellerId === currentUserId) {
      wx.showToast({
        title: '不能购买自己的商品',
        icon: 'none'
      });
      return;
    }

    // 显示购买确认弹窗
    wx.showModal({
      title: '确认购买',
      content: `确定要购买《${item.title}》吗？\n价格：¥${item.price}\n`,
      confirmText: '确认购买',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.processPurchase();
        }
      }
    });
  },

  // 处理购买流程
  async processPurchase() {
    try {
      wx.showLoading({
        title: '处理中...',
        mask: true
      });

      // 这里可以调用购买相关的API
      // 例如：await itemManager.purchaseItem(this.data.itemId);
      
      // 模拟购买成功
      setTimeout(() => {
        wx.hideLoading();
        wx.showToast({
          title: '购买成功！',
          icon: 'success',
          duration: 2000
        });
        
        // 可以跳转到订单页面或者聊天页面
        // wx.navigateTo({
        //   url: `/pages/order/order?itemId=${this.data.itemId}`
        // });
      }, 1500);

    } catch (error) {
      wx.hideLoading();
      console.error('购买失败:', error);
      wx.showToast({
        title: error.message || '购买失败',
        icon: 'none'
      });
    }
  }
});