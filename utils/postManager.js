// utils/postManager.js - 动态管理工具

const sharedTools = require('./sharedTools');

class PostManager {
  constructor() {
    this.POSTS_KEY = 'campus_posts';
    this.COMMENTS_KEY = 'campus_comments';
    this.init();
  }

  init() {
    const posts = this.getAllPosts();
    if (posts.length === 0) {
      // 初始化一些测试动态
      const testPosts = [
        {
          id: 1,
          userId: 1,
          userName: '张三',
          userNickname: '三张',          
          userAvatar: '/images/default-avatar.png',
          content: '新开的铁锅炖的小酥肉很好吃，但是阿姨和小哥们都呆呆的。',
          images: [],
          likes: 5,
          comments: 2,
          isLiked: false,
          createTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2小时前
          timeAgo: '2小时前'
        },
        {
          id: 2,
          userId: 2,
          userName: '李四',
          userNickname: '四李',
          userAvatar: '/images/default-avatar.png',
          content: '图书馆怎么这么多拍照的，我明年一定要到点就跑路。',
          images: ["/images/default-avatar.png"],
          likes: 8,
          comments: 3,
          isLiked: false,
          createTime: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5小时前
          timeAgo: '5小时前'
        },
        {
          id: 3,
          userId: 3,
          userName: '牛大果',
          userNickname: '蛋黄',
          userAvatar: '/images/default-avatar.png',
          content: '我要快点写完软工课设！！！！！',
          images: [],
          likes: 8,
          comments: 3,
          isLiked: false,
          createTime: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5小时前
          timeAgo: '1秒前'
        },
        {
          id: 4,
          userId: 1,
          userName: '张三',
          userNickname: '三张',
          userAvatar: '/images/default-avatar.png',
          content: '再也没有期末考试了（本科阶段）',
          images: [],
          likes: 12,
          comments: 6,
          isLiked: true,
          createTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1天前
          timeAgo: '1天前'
        }
      ];
      this.savePosts(testPosts);
      this.initTestComments();
    }
  }

  // 初始化测试评论数据
  initTestComments() {
    const testComments = [
      {
        id: 1,
        postId: 1,
        userId: 2,
        userName: '李四',
        userNickname: '四李',
        userAvatar: '/images/default-avatar.png',
        content: '确实很好吃！我上次也去了',
        isAuthor: false,
        createTime: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        timeAgo: '1小时前'
      },
      {
        id: 2,
        postId: 1,
        userId: 3,
        userName: '牛大果',
        userNickname: '蛋黄',
        userAvatar: '/images/default-avatar.png',
        content: '在哪里啊？求地址',
        isAuthor: false,
        createTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        timeAgo: '30分钟前'
      },
      {
        id: 3,
        postId: 2,
        userId: 1,
        userName: '张三',
        userNickname: '三张',
        userAvatar: '/images/default-avatar.png',
        content: '哈哈哈，我也遇到过',
        isAuthor: false,
        createTime: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        timeAgo: '3小时前'
      }
    ];
    this.saveComments(testComments);
  }

  // 获取所有动态
  getAllPosts() {
    try {
      return wx.getStorageSync(this.POSTS_KEY) || [];
    } catch (error) {
      console.error('获取动态失败:', error);
      return [];
    }
  }

  // 保存动态
  savePosts(posts) {
    try {
      wx.setStorageSync(this.POSTS_KEY, posts);
      return true;
    } catch (error) {
      console.error('保存动态失败:', error);
      return false;
    }
  }

  // 获取所有评论
  getAllComments() {
    try {
      return wx.getStorageSync(this.COMMENTS_KEY) || [];
    } catch (error) {
      console.error('获取评论失败:', error);
      return [];
    }
  }

  // 保存评论
  saveComments(comments) {
    try {
      wx.setStorageSync(this.COMMENTS_KEY, comments);
      return true;
    } catch (error) {
      console.error('保存评论失败:', error);
      return false;
    }
  }

  // 获取动态列表（分页）
  getPosts(page = 1, limit = 10) {
    return new Promise((resolve) => {
      const allPosts = this.getAllPosts();
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      
      // 按时间倒序排列
      allPosts.sort((a, b) => new Date(b.createTime) - new Date(a.createTime));
      
      const posts = allPosts.slice(startIndex, endIndex);
      const hasMore = endIndex < allPosts.length;
      
      // 模拟网络延迟
      setTimeout(() => {
        resolve({
          posts: posts,
          hasMore: hasMore,
          total: allPosts.length
        });
      }, 500);
    });
  }

  // 发布动态
  publishPost(content, images = []) {
    return new Promise((resolve, reject) => {
      if (!content.trim()) {
        reject({ message: '动态内容不能为空' });
        return;
      }

      // 获取当前用户信息
      const userManager = require('./userManager');
      const currentUser = userManager.getCurrentUser();
      
      if (!currentUser) {
        reject({ message: '请先登录' });
        return;
      }

      const posts = this.getAllPosts();
      const newPost = {
        id: Date.now(),
        userId: currentUser.id,
        userName: currentUser.name,
        userNickname: currentUser.nickname || currentUser.name,
        userAvatar: '/images/default-avatar.png',
        content: content,
        images: images,
        likes: 0,
        comments: 0,
        isLiked: false,
        createTime: new Date().toISOString(),
        timeAgo: '刚刚'
      };

      posts.unshift(newPost);
      
      if (this.savePosts(posts)) {
        resolve(newPost);
      } else {
        reject({ message: '发布失败，请重试' });
      }
    });
  }

  // 点赞/取消点赞
  toggleLike(postId) {
    return new Promise((resolve, reject) => {
      const posts = this.getAllPosts();
      const postIndex = posts.findIndex(p => p.id == postId);
      
      if (postIndex === -1) {
        reject({ message: '动态不存在' });
        return;
      }

      const post = posts[postIndex];
      if (post.isLiked) {
        post.likes -= 1;
        post.isLiked = false;
      } else {
        post.likes += 1;
        post.isLiked = true;
      }

      if (this.savePosts(posts)) {
        resolve({
          isLiked: post.isLiked,
          likes: post.likes
        });
      } else {
        reject({ message: '操作失败' });
      }
    });
  }

  // 获取单个动态详情
  getPostDetail(postId) {
    return new Promise((resolve, reject) => {
      console.log('getPostDetail 被调用，postId:', postId, '类型:', typeof postId);
      
      const posts = this.getAllPosts();
      console.log('所有帖子:', posts);
      console.log('帖子ID列表:', posts.map(p => ({ id: p.id, type: typeof p.id })));
      
      // 确保类型匹配
      const post = posts.find(p => p.id == postId);
      console.log('找到的帖子:', post);
      
      if (post) {
        // 更新时间显示
        post.timeAgo = sharedTools.formatTimeAgo(post.createTime);
        resolve(post);
      } else {
        console.log('未找到帖子，postId:', postId);
        reject({ message: '动态不存在' });
      }
    });
  }

  // 获取帖子评论列表
  getPostComments(postId, page = 1, limit = 20) {
    return new Promise((resolve) => {
      const allComments = this.getAllComments();
      const postComments = allComments.filter(comment => comment.postId == postId);
      
      // 按时间正序排列（最早的在前面）
      postComments.sort((a, b) => new Date(b.createTime) - new Date(a.createTime));
      
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const comments = postComments.slice(startIndex, endIndex);
      
      // 更新时间显示
      comments.forEach(comment => {
        comment.timeAgo = sharedTools.formatTimeAgo(comment.createTime);
      });
      
      setTimeout(() => {
        resolve(comments);
      }, 300);
    });
  }

  // 添加评论
  addComment(postId, content) {
    return new Promise((resolve, reject) => {
      if (!content.trim()) {
        reject({ message: '评论内容不能为空' });
        return;
      }

      // 获取当前用户信息
      const userManager = require('./userManager');
      const currentUser = userManager.getCurrentUser();

      if (!currentUser) {
        reject({ message: '请先登录' });
        return;
      }
      // 获取帖子作者信息
      const posts = this.getAllPosts();
      const post = posts.find(p => p.id == postId);
      const isAuthor = post && post.userId === currentUser.id;

      const comments = this.getAllComments();
      const newComment = {
        id: Date.now(),
        postId: parseInt(postId),
        userId: currentUser.id,
        userName: currentUser.name,
        userNickname: currentUser.nickname || currentUser.name,
        userAvatar: '/images/default-avatar.png',
        content: content.trim(),
        isAuthor: isAuthor, // 标识是否为楼主
        createTime: new Date().toISOString(),
        timeAgo: '刚刚'
      };

      comments.unshift(newComment);
      
      if (this.saveComments(comments)) {
        // 更新帖子的评论数
        this.updatePostCommentsCount(postId);
        resolve(newComment);
      } else {
        reject({ message: '评论失败，请重试' });
      }
    });
  }

  // 更新帖子评论数
  updatePostCommentsCount(postId) {
    const posts = this.getAllPosts();
    const postIndex = posts.findIndex(p => p.id == postId);
    
    if (postIndex !== -1) {
      const comments = this.getAllComments();
      const commentsCount = comments.filter(c => c.postId == postId).length;
      posts[postIndex].comments = commentsCount;
      this.savePosts(posts);
    }
  }

  // 搜索动态
  searchPosts(keyword) {
    return new Promise((resolve) => {
      const allPosts = this.getAllPosts();
      const results = allPosts.filter(post => 
        post.content.includes(keyword) || 
        post.userNickname.includes(keyword)
      );
      
      setTimeout(() => {
        resolve(results);
      }, 300);
    });
  }

  // 清空数据（调试用）
  clearAllPosts() {
    try {
      wx.removeStorageSync(this.POSTS_KEY);
      wx.removeStorageSync(this.COMMENTS_KEY);
      return true;
    } catch (error) {
      return false;
    }
  }
}

const postManager = new PostManager();
module.exports = postManager;