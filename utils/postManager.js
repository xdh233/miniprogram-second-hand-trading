// utils/postManager.js - 动态管理工具

class PostManager {
  constructor() {
    this.POSTS_KEY = 'campus_posts';
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
          userAvatar: '/images/default-avatar.png',
          content: '今天天气真好，在校园里散步心情很棒！#校园生活',
          images: [],
          likes: 5,
          comments: 2,
          isLiked: false,
          tag: '校园',
          createTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2小时前
          timeAgo: '2小时前'
        },
        {
          id: 2,
          userId: 2,
          userName: '李四',
          userAvatar: '/images/default-avatar.png',
          content: '图书馆新到了很多好书，推荐大家去借阅～',
          images: [],
          likes: 8,
          comments: 3,
          isLiked: false,
          tag: '学习',
          createTime: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5小时前
          timeAgo: '5小时前'
        },
        {
          id: 3,
          userId: 3,
          userName: '牛大果',
          userAvatar: '/images/default-avatar.png',
          content: '我要快点写完软工课设！！！！！',
          images: [],
          likes: 8,
          comments: 3,
          isLiked: false,
          tag: '学习',
          createTime: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5小时前
          timeAgo: '1秒前'
        },
        {
          id: 4,
          userId: 1,
          userName: '张三',
          userAvatar: '/images/default-avatar.png',
          content: '期末考试加油！大家一起努力💪',
          images: [],
          likes: 12,
          comments: 6,
          isLiked: true,
          tag: '考试',
          createTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1天前
          timeAgo: '1天前'
        }
      ];
      this.savePosts(testPosts);
    }
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
  publishPost(content, images = [], tag = '') {
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
        userAvatar: '/images/default-avatar.png',
        content: content,
        images: images,
        likes: 0,
        comments: 0,
        isLiked: false,
        tag: tag,
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
      const postIndex = posts.findIndex(p => p.id === postId);
      
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
      const posts = this.getAllPosts();
      const post = posts.find(p => p.id === postId);
      
      if (post) {
        resolve(post);
      } else {
        reject({ message: '动态不存在' });
      }
    });
  }

  // 搜索动态
  searchPosts(keyword) {
    return new Promise((resolve) => {
      const allPosts = this.getAllPosts();
      const results = allPosts.filter(post => 
        post.content.includes(keyword) || 
        post.userName.includes(keyword) ||
        (post.tag && post.tag.includes(keyword))
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
      return true;
    } catch (error) {
      return false;
    }
  }
}

const postManager = new PostManager();
module.exports = postManager;