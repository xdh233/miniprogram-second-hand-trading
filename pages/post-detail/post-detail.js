const postManager = require('../../utils/postManager')

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
    if (options.id) {
      this.setData({ postId: options.id })
      this.loadPostDetail()
      this.loadComments()
    }
  },

  // 加载帖子详情
  async loadPostDetail() {
    try {
      const post = await postManager.getPostDetail(this.data.postId)
      this.setData({ 
        post,
        loading: false
      })
    } catch (error) {
      console.error('加载帖子详情失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      })
    }
  },

  // 加载评论列表
  async loadComments(refresh = false) {
    if (this.data.loadingMore && !refresh) return

    const page = refresh ? 1 : this.data.currentPage
    
    try {
      this.setData({ loadingMore: true })
      const comments = await postManager.getPostComments(
        this.data.postId,
        page,
        this.data.pageSize
      )

      this.setData({
        comments: refresh ? comments : [...this.data.comments, ...comments],
        currentPage: page + 1,
        hasMore: comments.length === this.data.pageSize,
        loadingMore: false
      })
    } catch (error) {
      console.error('加载评论失败:', error)
      this.setData({ loadingMore: false })
    }
  },

  // 提交评论
  async submitComment() {
    if (!this.data.commentContent.trim()) {
      return wx.showToast({
        title: '请输入评论内容',
        icon: 'none'
      })
    }

    try {
      await postManager.addComment(this.data.postId, this.data.commentContent)
      this.setData({ commentContent: '' })
      // 刷新评论列表
      this.loadComments(true)
    } catch (error) {
      console.error('提交评论失败:', error)
      wx.showToast({
        title: '评论失败',
        icon: 'error'
      })
    }
  },

  // 点赞/取消点赞
  async onLikePost() {
    try {
      const newPost = await postManager.toggleLike(this.data.post.id)
      this.setData({
        'post.isLiked': newPost.isLiked,
        'post.likes': newPost.likes
      })
    } catch (error) {
      console.error('点赞操作失败:', error)
    }
  },

  // 分享
  onShareAppMessage() {
    const post = this.data.post
    return {
      title: post.content.substring(0, 50),
      path: `/pages/post-detail/post-detail?id=${post.id}`
    }
  },

  // 预览图片
  previewImage(e) {
    const { images, index } = e.currentTarget.dataset
    wx.previewImage({
      current: images[index],
      urls: images
    })
  },

  // 评论内容输入
  onCommentInput(e) {
    this.setData({
      commentContent: e.detail.value
    })
  },

  // 下拉刷新
  async onPullDownRefresh() {
    await this.loadPostDetail()
    await this.loadComments(true)
    wx.stopPullDownRefresh()
  },

  // 触底加载更多
  onReachBottom() {
    if (this.data.hasMore && !this.data.loadingMore) {
      this.loadComments()
    }
  }
})