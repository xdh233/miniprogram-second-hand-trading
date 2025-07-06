const BaseManager = require('./baseManager');  
const sharedTools = require('./sharedTools');
const apiConfig = require('../utils/apiConfig'); // 引入API配置

class PostManager extends BaseManager {
  constructor() {
    super('campus_posts');
  }

  // 获取单个动态详情
  getPostDetail(postId) {
    return new Promise((resolve, reject) => {
      console.log('getPostDetail 被调用，postId:', postId);
      
      apiConfig.get(`/posts/${postId}`)
        .then(post => {
          if (post) {
            post.timeAgo = sharedTools.formatTimeAgo(post.createTime);
            // 🔧 使用 apiConfig 的方法处理图片URL
            post = apiConfig.processPostImages(post);
            resolve(post);
          } else {
            reject({ message: '动态不存在' });
          }
        })
        .catch(error => {
          console.error('获取动态详情失败:', error);
          reject({ message: '获取动态详情失败' });
        });
    });
  }

  // 通过id获取
  getPostById(postId) {
    return new Promise((resolve, reject) => {
      apiConfig.get(`/posts/${postId}`)
        .then(post => {
          if (post) {
            // 🔧 使用 apiConfig 的方法处理图片URL
            post = apiConfig.processPostImages(post);
          }
          resolve(post);
        })
        .catch(error => {
          reject(error);
        });
    });
  }

  // 获取动态列表（分页）
  getPosts(page = 1, limit = 10) {
    return new Promise((resolve, reject) => {
      apiConfig.get('/posts', { page, limit })
        .then(data => {
          // 处理时间显示
          if (data.posts && Array.isArray(data.posts)) {
            data.posts.forEach(post => {
              post.timeAgo = sharedTools.formatTimeAgo(post.createTime);
            });
            
            // 🔧 使用 apiConfig 的方法批量处理图片URL
            data.posts = apiConfig.processPostImages(data.posts);
          }
          
          resolve({
            posts: data.posts || data,
            hasMore: data.hasMore || false,
            total: data.total || 0
          });
        })
        .catch(error => {
          console.error('获取动态列表失败:', error);
          reject(error);
        });
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

      const postData = {
        userId: currentUser.id,
        content: content.trim(),
        images: images
      };

      apiConfig.post('/posts', postData)
        .then(newPost => {
          // 添加时间显示
          newPost.timeAgo = '刚刚';
          // 🔧 使用 apiConfig 的方法处理图片URL
          newPost = apiConfig.processPostImages(newPost);
          resolve(newPost);
        })
        .catch(error => {
          console.error('发布动态失败:', error);
          reject({ message: '发布失败，请重试' });
        });
    });
  }

  // 搜索动态
  searchPosts(keyword) {
    return new Promise((resolve, reject) => {
      if (!keyword || !keyword.trim()) {
        resolve([]);
        return;
      }

      apiConfig.get('/posts/search', { keyword: keyword.trim() })
        .then(posts => {
          // 处理时间显示
          if (Array.isArray(posts)) {
            posts.forEach(post => {
              post.timeAgo = sharedTools.formatTimeAgo(post.createTime);
            });
            
            // 🔧 使用 apiConfig 的方法批量处理图片URL
            posts = apiConfig.processPostImages(posts);
          }
          resolve(posts);
        })
        .catch(error => {
          console.error('搜索动态失败:', error);
          reject(error);
        });
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

        apiConfig.post(`/posts/${postId}/like`, { userId: currentUser.id })
          .then(result => {
            resolve({
              isLiked: result.isLiked,
              likes: result.likes
            });
          })
          .catch(error => {
            console.error('点赞操作失败:', error);
            reject({ message: '操作失败' });
          });

      } catch (error) {
        console.error('点赞操作失败:', error);
        reject({ message: '操作失败' });
      }
    });
  }

  // 更新动态评论数（供commentManager调用）
  updateCommentsCount(postId, count) {
    return apiConfig.put(`/posts/${postId}/comments-count`, { count });
  }

  // 删除动态
  deletePost(postId) {
    return new Promise((resolve, reject) => {
      const userManager = require('./userManager');
      const currentUser = userManager.getCurrentUser();
      
      if (!currentUser) {
        reject({ message: '请先登录' });
        return;
      }

      console.log('发送删除请求，postId:', postId);

      apiConfig.delete(`/posts/${postId}`)
        .then(result => {
          console.log('删除动态成功:', result);
          // 后端返回的数据结构：{ message: '删除成功', deletedPost: postId, cascadeInfo: {...} }
          resolve({
            success: true,
            message: result.message || '删除成功',
            data: result
          });
        })
        .catch(error => {
          console.error('删除动态失败:', error);
          reject({ 
            success: false,
            message: error.message || '删除失败'
          });
        });
    });
  }

  // 获取用户发布的动态
  getUserPosts(userId, page = 1, limit = 10) {
    return new Promise((resolve, reject) => {
      apiConfig.get(`/posts/users/${userId}`, { page, limit })
        .then(data => {
          // 处理时间显示
          if (data.posts && Array.isArray(data.posts)) {
            data.posts.forEach(post => {
              post.timeAgo = sharedTools.formatTimeAgo(post.createTime);
            });
            
            // 🔧 使用 apiConfig 的方法批量处理图片URL
            data.posts = apiConfig.processPostImages(data.posts);
          }
          
          resolve({
            posts: data.posts || data,
            hasMore: data.hasMore || false,
            total: data.total || 0
          });
        })
        .catch(error => {
          console.error('获取用户动态失败:', error);
          reject(error);
        });
    });
  }
}

module.exports = new PostManager();