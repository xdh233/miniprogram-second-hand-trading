const userManager = require('../../utils/userManager');
const itemManager = require('../../utils/itemManager');
const commentManager = require('../../utils/commentManager');
const sharedTools = require('../../utils/sharedTools');
const transactionManager = require('../../utils/transactionManager');

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
    
    isSold: false,
    isWithdrawn: false,
    canPurchase: false,
    
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
    console.log('=== loadItemDetail 开始 ===');
    console.log('itemId:', itemId, 'type:', typeof itemId);
    
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
      console.log('itemManager.getItemDetail 返回结果:', item);
      // 在 loadItemDetail 方法中，获取到 item 数据后立即添加：

      console.log('=== 原始商品数据调试 ===');
      console.log('完整商品对象:', item);
      console.log('商品对象键名:', Object.keys(item));
      console.log('图片字段 item.images:', item.images);
      console.log('图片字段类型:', typeof item.images);
      console.log('是否为数组:', Array.isArray(item.images));

      // 检查其他可能的图片字段名
      console.log('item.image_urls:', item.image_urls);
      console.log('item.imageUrls:', item.imageUrls);
      console.log('item.photos:', item.photos);
      console.log('item.pictures:', item.pictures);

      // 检查 processItemImages 是否被正确调用
      console.log('processItemImages 调用前的图片:', item.images);

      // 如果 item.images 存在但为空或格式不对
      if (item.images) {
        console.log('图片数据详情:');
        console.log('- 长度:', item.images.length);
        console.log('- 第一张图片:', item.images[0]);
        console.log('- 完整数组:', JSON.stringify(item.images));
      }
      if (!item) {
        console.error('商品不存在，item为:', item);
        throw new Error('商品不存在');
      }

      console.log('商品数据验证通过，item.status:', item.status);

      // 格式化发布时间 - 修改字段映射
      item.formattedPublishTime = sharedTools.formatTime(item.createTime || item.create_time);

      // 增加浏览次数
      itemManager.incrementViewCount(itemId);

      // 设置收藏状态
      const isLiked = item.isLiked || false;

      // ===== 数据字段映射处理 =====
      // 处理卖家信息字段映射
      if (!item.sellerId && item.seller_id) {
        item.sellerId = item.seller_id;
      }
      if (!item.sellerName && item.seller_name) {
        item.sellerName = item.seller_name;
      }
      if (!item.sellerNickname) {
        item.sellerNickname = item.seller_nickname || item.sellerName || item.seller_name;
      }
      if (!item.sellerAvatar && item.seller_avatar) {
        item.sellerAvatar = item.seller_avatar;
      }
      
      // 处理商品字段映射
      if (!item.tradeType && item.trade_type) {
        item.tradeType = item.trade_type;
      }
      if (!item.viewCount && item.view_count !== undefined) {
        item.viewCount = item.view_count;
      }
      if (!item.likeCount && item.like_count !== undefined) {
        item.likeCount = item.like_count;
      }

      // ===== 安全的状态判断 =====
      console.log('开始状态判断，item.status:', item.status);
      const itemStatus = (item && typeof item.status === 'string') ? item.status : 'selling';
      console.log('处理后的itemStatus:', itemStatus);
      
      const isSold = itemStatus === 'sold';
      const isWithdrawn = itemStatus === 'withdrawn';
      const canPurchase = item && item.tradeType === 'sell' && !isSold && !isWithdrawn;
      
      console.log('状态判断结果:', { isSold, isWithdrawn, canPurchase });

      // 判断当前用户是否是商品发布者
      const currentUser = userManager.getCurrentUser();
      const isOwner = currentUser && currentUser.id === item.sellerId;

      console.log('设置页面数据...');
      this.setData({
        item: item,
        isLiked: isLiked,
        isSold: isSold,
        isWithdrawn: isWithdrawn,
        canPurchase: canPurchase,
        isOwner: isOwner,
        loading: false
      });

      // 设置页面标题
      let titleSuffix = '';
      if (isSold) {
        titleSuffix = '（已售出）';
      } else if (isWithdrawn) {
        titleSuffix = '（已下架）';
      }
      wx.setNavigationBarTitle({
        title: `商品详情${titleSuffix}`
      });

      console.log('商品详情加载成功:', itemId, '状态:', itemStatus);
      console.log('=== loadItemDetail 完成 ===');

    } catch (error) {
      console.error('=== loadItemDetail 异常 ===');
      console.error('错误详情:', error);
      console.error('错误堆栈:', error.stack);
      
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
      // 处理评论字段映射
      if (!comment.userId && comment.user_id) {
        comment.userId = comment.user_id;
      }
      if (!comment.userNickname && comment.user_nickname) {
        comment.userNickname = comment.user_nickname;
      }
      if (!comment.userAvatar && comment.avatar) {
        comment.userAvatar = comment.avatar;
      }
      if (!comment.parentId && comment.parent_id) {
        comment.parentId = comment.parent_id;
      }
      if (!comment.createTime && comment.create_time) {
        comment.createTime = comment.create_time;
      }
      if (!comment.replyToUserId && comment.reply_to_user_id) {
        comment.replyToUserId = comment.reply_to_user_id;
      }
      if (!comment.replyToUserName && comment.reply_to_user_name) {
        comment.replyToUserName = comment.reply_to_user_name;
      }
      comment.isAuthor = comment.userId === this.data.item.sellerId;
      // 格式化时间
      comment.timeAgo = sharedTools.formatTimeAgo(comment.createTime);
      
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
    if (item.status === 'sold') {
      wx.showModal({
        title: '提示',
        content: '该商品已售出，您还要联系卖家吗？',
        success: (res) => {
          if (res.confirm) {
            this.navigateToChat();
          }
        }
      });
      return;
    }
  
    if (item.status === 'withdrawn') {
      wx.showModal({
        title: '提示',
        content: '该商品已下架，您还要联系卖家吗？',
        success: (res) => {
          if (res.confirm) {
            this.navigateToChat();
          }
        }
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
  
    // ===== 新增：检查商品状态 =====
    if (item.status === 'sold') {
      wx.showToast({
        title: '商品已售出',
        icon: 'none'
      });
      return;
    }
    if (item.status === 'withdrawn') {
      wx.showToast({
        title: '商品已下架',
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
  
    // 检查用户余额是否足够
    this.checkBalanceAndShowPurchaseModal();
  },

  // 检查余额并显示购买弹窗
  async checkBalanceAndShowPurchaseModal() {
    try {
      const item = this.data.item;
      const currentUser = userManager.getCurrentUser();
      
      // ✅ 直接使用本地用户信息中的余额，不调用API
      const userBalance = currentUser.balance || 0;
      const itemPrice = parseFloat(item.price) || 0;
      if (userBalance < itemPrice) {
        // 余额不足，显示充值提示
        wx.showModal({
          title: '余额不足',
          content: `您的余额：¥${userBalance.toFixed(2)}\n商品价格：¥${itemPrice.toFixed(2)}\n还需要：¥${(itemPrice - userBalance).toFixed(2)}\n\n是否前往充值？`,
          confirmText: '去充值',
          cancelText: '取消',
          success: (res) => {
            if (res.confirm) {
              console.log("用户点击了去充值");
              // 跳转到个人中心充值
              wx.switchTab({
                url: '/pages/profile/profile'
              });
            }
          }
        });
        return;
      }

      // 余额足够，显示购买确认弹窗
      wx.showModal({
        title: '确认购买',
        content: `确定要购买《${item.title}》吗？\n价格：¥${itemPrice.toFixed(2)}\n您的余额：¥${userBalance.toFixed(2)}\n购买后余额：¥${(userBalance - itemPrice).toFixed(2)}`,
        confirmText: '确认购买',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            this.processPurchase();
          }
        }
      });

    } catch (error) {
      console.error('检查余额失败:', error);
      wx.showToast({
        title: '获取余额信息失败',
        icon: 'none'
      });
    }
  },

  // 处理购买流程 - 真实的余额转账
  async processPurchase() {
    try {
      wx.showLoading({ title: '处理中...', mask: true });
  
      const item = this.data.item;
      const currentUser = userManager.getCurrentUser();
      const itemPrice = parseFloat(item.price) || 0;
  
      // 调用 TransactionManager 处理购买
      await transactionManager.processPurchase(
        currentUser.id,     // 买家ID
        item.sellerId,      // 卖家ID  
        item.id,           // 商品ID
        itemPrice,         // 金额
        item.title         // 商品标题
      );

      wx.hideLoading();
      wx.showToast({ title: '购买成功！', icon: 'success' });
  
      setTimeout(() => {
        wx.navigateBack();
      }, 2000);
  
    } catch (error) {
      wx.hideLoading();
      console.error('购买失败:', error);
      
      if (error.message === '余额不足') {
        wx.showModal({
          title: '余额不足',
          content: '您的余额不足，是否前往充值？',
          confirmText: '去充值',
          success: (res) => {
            if (res.confirm) {
              wx.switchTab({ url: '/pages/profile/profile' });
            }
          }
        });
      } else {
        wx.showToast({ title: error.message || '购买失败', icon: 'none' });
      }
    }
  },

});