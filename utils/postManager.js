const BaseManager = require('./baseManager');  
const sharedTools = require('./sharedTools');

class PostManager extends BaseManager {
  constructor() {
    super('campus_posts');
    this.init();
  }

  init() {
    const posts = this.getAll();
    if (posts.length === 0) {
      this.createMockData();
    }
  }

  createMockData() {
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
        createTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        timeAgo: '2小时前'
      },
      {
        id: 2,
        userId: 2,
        userName: '李四',
        userNickname: '四李',
        userAvatar: '/images/default-avatar.png',
        content: '图书馆怎么这么多拍照的，我明年一定要到点就跑路。',
        images: ["/images/default-avatar.png","/images/xbox.png"],
        likes: 8,
        comments: 3,
        isLiked: false,
        createTime: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
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
        createTime: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
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
        createTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        timeAgo: '1天前'
      }
    ];
    this.save(testPosts);
    console.log('初始化动态模拟数据');
  }

  // 获取单个动态详情
  getPostDetail(postId) {
    return new Promise((resolve, reject) => {
      console.log('getPostDetail 被调用，postId:', postId, '类型:', typeof postId);
      
      const post = this.getById(postId);
      console.log('找到的帖子:', post);
      
      if (post) {
        post.timeAgo = sharedTools.formatTimeAgo(post.createTime);
        resolve(post);
      } else {
        console.log('未找到帖子，postId:', postId);
        reject({ message: '动态不存在' });
      }
    });
  }
  // 通过id获取
  getPostById(itemId) {
    return this.getById(itemId);
  }
  // 获取动态列表（分页）
  getPosts(page = 1, limit = 10) {
    return new Promise((resolve) => {
      const allPosts = this.getAll();
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      
      allPosts.sort((a, b) => new Date(b.createTime) - new Date(a.createTime));
      
      const posts = allPosts.slice(startIndex, endIndex);
      const hasMore = endIndex < allPosts.length;
      
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

      const userManager = require('./userManager');
      const currentUser = userManager.getCurrentUser();
      
      if (!currentUser) {
        reject({ message: '请先登录' });
        return;
      }

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

      if (this.add(newPost)) {
        resolve(newPost);
      } else {
        reject({ message: '发布失败，请重试' });
      }
    });
  }

  // 搜索动态
  searchPosts(keyword) {
    return new Promise((resolve) => {
      const allPosts = this.getAll();
      const results = allPosts.filter(post => 
        post.content.includes(keyword) || 
        post.userNickname.includes(keyword)
      );
      
      setTimeout(() => {
        resolve(results);
      }, 300);
    });
  }

  // 动态点赞/取消点赞
  toggleLike(postId) {
    return new Promise(async (resolve, reject) => {
      try {
        const userManager = require('./userManager');
        const currentUser = userManager.getCurrentUser();
        
        if (!currentUser) {
          reject({ message: '请先登录' });
          return;
        }

        const post = this.getById(postId);
        if (!post) {
          reject({ message: '帖子不存在' });
          return;
        }

        const newLikeState = !post.isLiked;
        const updatedPost = {
          ...post,
          isLiked: newLikeState,
          likes: newLikeState ? (post.likes || 0) + 1 : Math.max(0, (post.likes || 0) - 1)
        };

        const result = this.update(postId, updatedPost);
        if (result) {
          if (newLikeState) {
            const notifyManager = require('./notifyManager');
            await notifyManager.createPostLikeNotification(
              currentUser.id,
              currentUser.nickname || currentUser.name,
              currentUser.avatar || '/images/default-avatar.png',
              postId,
              post.content,
              post.userId
            );
          }
          
          resolve({
            isLiked: updatedPost.isLiked,
            likes: updatedPost.likes
          });
        } else {
          reject({ message: '操作失败' });
        }
      } catch (error) {
        console.error('点赞操作失败:', error);
        reject({ message: '操作失败' });
      }
    });
  }

  // 更新动态评论数（供commentManager调用）
  updateCommentsCount(postId, count) {
    return this.update(postId, { comments: count });
  }
}

module.exports = new PostManager();
