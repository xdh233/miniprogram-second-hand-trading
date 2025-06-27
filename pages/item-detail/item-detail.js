const userManager = require('../../utils/userManager');
const itemManager = require('../../utils/itemManager');
const sharedTools = require('../../utils/sharedTools');

Page({
  data: {
    itemId: null,
    item: null,
    comments: [],
    newCommentContent: '',
    loading: true,
    loadingMore: false,
    userInfo: null,
    hasMore: true,
    currentPage: 1,
    currentImageIndex: 0,  // 修正：从0开始
    pageSize: 20,
    sortType: 'hot',
    isLiked: false,  // 添加收藏状态
  },
  onLoad(options) {
    console.log('item-detail onLoad, options:', options);
    if (options.id) {
      // 确保itemId是数字类型
      const itemId = parseInt(options.id);
      console.log('设置itemId:', itemId);
      this.setData({ itemId: itemId });
      // 检查登录状态
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

      console.log('商品详情加载成功:', itemId);

    } catch (error) {
      console.error('加载商品详情失败:', error);
      this.setData({ loading: false });
      wx.showToast({
        title: error.message || '商品不存在',
        icon: 'error'
      });
      
      setTimeout(() => {
        wx.navigateBack();
      }, 500);
    }
  },
  // 加载评论
  async loadComments(refresh = false) {
    if (this.data.loadingMore && !refresh) return;

    const page = refresh ? 1 : this.data.currentPage;
    
    try {
      this.setData({ loadingMore: true });
      console.log('加载评论，itemId:', this.data.itemId, 'page:', page);
      
      const comments = await itemManager.getItemComments(
        this.data.itemId,
        page,
        this.data.pageSize,
        this.data.sortType
      );

      console.log('获取到的评论:', comments);

      // 格式化评论时间
      const formattedComments = comments.map(comment => ({
        ...comment,
        formattedTime: sharedTools.formatTime(comment.createTime)
      }));

      this.setData({
        comments: refresh ? formattedComments : [...this.data.comments, ...formattedComments],
        currentPage: page + 1,
        hasMore: comments.length === this.data.pageSize,
        loadingMore: false
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
      return;
    }
    
    console.log('切换排序方式:', sortType);
    
    this.setData({
      sortType: sortType,
      comments: [],
      currentPage: 1,
      hasMore: true
    });
    
    this.loadComments(true);
  },
  // 评论输入
  onCommentInput(e) {
    this.setData({
      newCommentContent: e.detail.value
    });
  },
  // 发送评论
  async submitComment() {
    const comment = this.data.newCommentContent.trim();
    if (!comment) {
      wx.showToast({
        title: '请输入评论内容',
        icon: 'none'
      });
      return;
    }
  
    try {
      console.log('提交评论，itemId:', this.data.itemId, 'content:', this.data.newCommentContent);
      await itemManager.addCommentByItemId(this.data.itemId, this.data.newCommentContent);

      this.setData({ newCommentContent: '' });  // 发送完清空
      
      this.loadComments(true);

      wx.showToast({
        title: '评论成功',
        icon: 'success'
      });
  
    } catch (error) {
      console.error('发送评论失败:', error);
      wx.showToast({
        title: error.message || '评论失败',
        icon: 'error'
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
  // 评论点赞
  async toggleCommentLike(e) {
    const commentId = e.currentTarget.dataset.id;
    try {
      const result = await itemManager.toggleCommentLike(commentId);
      
      // 更新评论列表中的点赞状态
      const comments = this.data.comments.map(comment => {
        if (comment.id == commentId) {
          return {
            ...comment,
            isLiked: result.isLiked,
            likes: result.likes
          };
        }
        return comment;
      });
      
      this.setData({ comments });
      
    } catch (error) {
      console.error('评论点赞失败:', error);
      wx.showToast({
        title: error.message || '操作失败',
        icon: 'error'
      });
    }
  },
  // 分享
  onShareAppMessage() {
    const item = this.data.item;
    
    if (!item) {
      return {
        title: '校园动态分享',
        desc: '发现精彩的校园生活',
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
  // 返回上一页
  goBack() {
    wx.navigateBack();
  },
  // 跳转到卖家主页
  navigateToSellerProfile() {
    wx.showToast({
      title: '跳转卖家主页',
      icon: 'none'
    });
  },
  // 触底加载更多
  onReachBottom() {
    if (this.data.hasMore && !this.data.loadingMore) {
      this.loadComments();
    }
  }
});