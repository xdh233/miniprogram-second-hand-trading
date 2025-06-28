// utils/postManager.js - 动态管理工具

const sharedTools = require('./sharedTools');

class PostManager {
  constructor() {
    this.POSTS_KEY = 'campus_posts';
    this.COMMENTS_KEY = 'campus_comments';
    this.REPLIES_KEY = 'post_replies'; // 新增回复存储Key
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
          images: ["/images/default-avatar.png","/images/xbox.png"],
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
        parentId: null, // 主评论
        isAuthor: false,
        likes: 5,
        isLiked: false,
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
        parentId: null, // 主评论
        isAuthor: false,
        likes: 3,
        isLiked: false,
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
        parentId: null, // 主评论
        isAuthor: false,
        likes: 1,
        isLiked: true,
        createTime: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        timeAgo: '3小时前'
      },
      // 添加一些测试回复
      {
        id: 4,
        postId: 1,
        userId: 1,
        userName: '张三',
        userNickname: '三张',
        userAvatar: '/images/default-avatar.png',
        content: '在学校食堂二楼',
        parentId: 1, // 回复评论1
        replyToUserId: 3,
        replyToUserName: '蛋黄',
        isAuthor: true, // 楼主回复
        likes: 2,
        isLiked: false,
        createTime: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
        timeAgo: '25分钟前'
      },
      {
        id: 5,
        postId: 1,
        userId: 3,
        userName: '牛大果',
        userNickname: '蛋黄',
        userAvatar: '/images/default-avatar.png',
        content: '谢谢楼主！',
        parentId: 1, // 回复评论1
        replyToUserId: 1,
        replyToUserName: '三张',
        isAuthor: false,
        likes: 1,
        isLiked: false,
        createTime: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
        timeAgo: '20分钟前'
      }
    ];
    this.saveComments(testComments);
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

  // 根据ID获取单个商品
  getPostById(postId) {
    const posts = this.getAllPosts();
    return posts.find(post => post.id == postId);
  }

  // 获得商品评论（包含所有评论和回复）
  getCommentByPostId(postId) {
    try {
      const allComments = this.getAllComment();
      // 筛选出该商品的评论，按时间正序排列
      return allComments
        .filter(comment => comment.postId == postId)
        .sort((a, b) => new Date(a.createTime) - new Date(b.createTime));
    } catch (error) {
      console.error('获取商品评论失败:', error);
      return [];
    }
  }

  // 添加主评论
  addCommentByPostId(postId, content) {
    return new Promise((resolve, reject) => {
      try {
        // 参数验证
        if (!content || typeof content !== 'string' || !content.trim()) {
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
        const post = this.getPostById(postId);
        if (!post) {
          reject({ message: '帖子不存在' });
          return;
        }

        const isAuthor = post.userId === currentUser.id;

        const allComments = this.getAllComment();
        const newComment = {
          id: Date.now(),
          postId: parseInt(postId),
          userId: currentUser.id,
          userName: currentUser.name,
          userNickname: currentUser.nickname || currentUser.name,
          userAvatar: '/images/default-avatar.png',
          content: content.trim(),
          parentId: null, // 主评论没有父评论
          likes: 0,
          isLiked: false,
          isAuthor: isAuthor,
          createTime: new Date().toISOString(),
          timeAgo: '刚刚'
        };

        allComments.unshift(newComment);
        
        if (this.saveComments(allComments)) {
          // 更新帖子的评论数
          this.updatePostCommentsCount(postId);
          resolve(newComment);
        } else {
          reject({ message: '评论失败，请重试' });
        }
      } catch (error) {
        console.error('保存评论失败:', error);
        reject({ message: '评论失败，请重试' });
      }
    });
  }

  // 添加回复
  addReplyToComment(postId, parentCommentId, content, replyToUserId, replyToUserName) {
    return new Promise((resolve, reject) => {
      try {
        console.log('addReplyToComment 参数:', { postId, parentCommentId, content, replyToUserId, replyToUserName });
        
        // 1. 参数验证
        if (!content || typeof content !== 'string' || !content.trim()) {
          reject({ message: '回复内容不能为空' });
          return;
        }

        // 2. 获取当前用户
        const userManager = require('./userManager');
        const currentUser = userManager.getCurrentUser();
        if (!currentUser) {
          reject({ message: '请先登录' });
          return;
        }

        // 3. 查找被回复的主评论
        const allComments = this.getAllComment();
        const parentComment = allComments.find(c => c.id == parentCommentId );
        if (!parentComment) {
          reject({ message: '评论不存在' });
          return;
        }

        // 4. 查找帖子信息
        const post = this.getPostById(postId);
        if (!post) {
          reject({ message: '帖子不存在' });
          return;
        }

        const isAuthor = post.userId === currentUser.id;

        // 5. 创建回复对象
        const newReply = {
          id: Date.now(), // 唯一ID
          postId: parseInt(postId),
          parentId: parseInt(parentCommentId), // 父评论ID
          userId: currentUser.id,
          userName: currentUser.name,
          userNickname: currentUser.nickname || currentUser.name,
          userAvatar: '/images/default-avatar.png',
          content: content.trim(),
          replyToUserId: replyToUserId || null, // 被回复的用户ID
          replyToUserName: replyToUserName || null, // 被回复的用户名
          likes: 0,
          isLiked: false,
          isAuthor: isAuthor,
          createTime: new Date().toISOString(),
          timeAgo: '刚刚'
        };

        console.log('创建的回复对象:', newReply);

        // 6. 保存回复到评论列表中
        allComments.unshift(newReply);
        
        if (this.saveComments(allComments)) {
          // 7. 更新帖子的评论数
          this.updatePostCommentsCount(postId);
          resolve(newReply);
        } else {
          reject({ message: '回复失败，请重试' });
        }
        
      } catch (error) {
        console.error('回复失败:', error);
        reject({ message: '回复失败，请重试' });
      }
    });
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

  // 获取帖子评论列表 - 支持排序（包含嵌套回复）
  getPostComments(postId, page = 1, limit = 20, sortType = 'time_desc') {
    return new Promise((resolve) => {
      const postComments = this.getCommentByPostId(postId);
      
      // 根据排序类型进行排序
      switch (sortType) {
        case 'hot':
          // 最热：按点赞数降序，点赞数相同按时间降序
          postComments.sort((a, b) => {
            const likesA = a.likes || 0;
            const likesB = b.likes || 0;
            if (likesB !== likesA) {
              return likesB - likesA; // 点赞数降序
            }
            return new Date(b.createTime) - new Date(a.createTime); // 时间降序
          });
          break;
        case 'time_asc':
          // 最早：按时间升序
          postComments.sort((a, b) => new Date(a.createTime) - new Date(b.createTime));
          break;
        case 'time_desc':
        default:
          // 最新：按时间降序（默认）
          postComments.sort((a, b) => new Date(b.createTime) - new Date(a.createTime));
          break;
      }
      
      // 这里返回所有评论（包括回复），前端会进行嵌套组织
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      
      // 注意：这里我们需要考虑分页逻辑
      // 可以只对主评论进行分页，然后带上它们的所有回复
      const mainComments = postComments.filter(c => !c.parentId);
      const paginatedMainComments = mainComments.slice(startIndex, endIndex);
      
      // 获取这些主评论的所有回复
      const mainCommentIds = paginatedMainComments.map(c => c.id);
      const replies = postComments.filter(c => c.parentId && mainCommentIds.includes(c.parentId));
      
      // 合并主评论和回复
      const comments = [...paginatedMainComments, ...replies];
      
      // 更新时间显示
      comments.forEach(comment => {
        comment.timeAgo = sharedTools.formatTimeAgo(comment.createTime);
      });
      
      console.log(`评论排序 - 类型: ${sortType}, 主评论总数: ${mainComments.length}, 返回评论数: ${comments.length}`);
      
      setTimeout(() => {
        resolve(comments);
      }, 300);
    });
  }

  // 更新帖子评论数（包含回复）
  updatePostCommentsCount(postId) {
    const allComments = this.getCommentByPostId(postId);
    const commentCount = allComments.length; // 包含主评论和回复的总数
    
    // 更新帖子中的评论数
    const posts = this.getAllPosts();
    const updatedPosts = posts.map(post => {
      if (post.id == postId) {
        return { ...post, comments: commentCount };
      }
      return post;
    });
    
    this.savePosts(updatedPosts);
    return commentCount;
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

  // 点赞/取消点赞
  toggleLike(postId) {
    return new Promise((resolve, reject) => {
      const posts = this.getAllPosts();
      const updatedPosts = posts.map(post => {
        if (post.id === postId) {
          const newLikeState = !post.isLiked;
          return {
            ...post,
            isLiked: newLikeState,
            likes: newLikeState ? post.likes + 1 : post.likes - 1
          };
        }
        return post;
      });
      
      if (this.savePosts(updatedPosts)) {
        const updatedPost = updatedPosts.find(p => p.id === postId);
        resolve({
          isLiked: updatedPost.isLiked,
          likes: updatedPost.likes
        });
      } else {
        reject({ message: '操作失败' });
      }
    });
  }

  // 获得所有评论
  getAllComment() {
    try {
      return wx.getStorageSync(this.COMMENTS_KEY) || [];
    } catch (error) {
      console.error('获取所有评论失败:', error);
      return [];
    }
  }

  // 评论点赞/取消点赞（支持主评论和回复）
  toggleCommentLike(commentId) {
    return new Promise((resolve, reject) => {
      const comments = this.getAllComment();
      const commentIndex = comments.findIndex(c => c.id == commentId);
      
      if (commentIndex === -1) {
        reject({ message: '评论不存在' });
        return;
      }

      const comment = comments[commentIndex];
      if (comment.isLiked) {
        comment.likes = Math.max(0, (comment.likes || 0) - 1);
        comment.isLiked = false;
      } else {
        comment.likes = (comment.likes || 0) + 1;
        comment.isLiked = true;
      }

      if (this.saveComments(comments)) {
        resolve({
          isLiked: comment.isLiked,
          likes: comment.likes
        });
      } else {
        reject({ message: '操作失败' });
      }
    });
  }

  // 清空数据（调试用）
  clearAllPosts() {
    try {
      wx.removeStorageSync(this.POSTS_KEY);
      wx.removeStorageSync(this.COMMENTS_KEY);
      wx.removeStorageSync(this.REPLIES_KEY);
      return true;
    } catch (error) {
      return false;
    }
  }
}

const postManager = new PostManager();
module.exports = postManager;