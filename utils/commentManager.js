const BaseManager = require('./baseManager');  
const sharedTools = require('./sharedTools');
const apiConfig = require('./apiConfig');

class CommentManager extends BaseManager {
  constructor() {
    super('campus_comments');
  }

  // 获取指定内容的评论
  getCommentsByContent(contentId, contentType) {
    return new Promise((resolve, reject) => {
      apiConfig.get(`/comments/${contentType}/${contentId}`)
        .then(data => {
          // 修正：根据后端返回结构提取评论数据
          const comments = data.data || data.comments || [];
          // 处理评论数据
          comments.forEach(comment => {
            comment.timeAgo = sharedTools.formatTimeAgo(comment.createTime);
            comment.avatar = apiConfig.getAvatarUrl(comment.avatar);
            comment.isLiked = Boolean(comment.isLiked);
          });
          resolve(comments);
        })
        .catch(error => {
          console.error('获取评论失败:', error);
          resolve([]); // 返回空数组而不是拒绝
        });
    });
  }

  // 添加主评论
  addComment(contentId, contentType, content) {
    return new Promise((resolve, reject) => {
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

      apiConfig.post('/comments', {
        content_id: contentId,
        content_type: contentType,
        content: content.trim()
      })
        .then(data => {
          const comment = data.comment;
          if (comment) {
            // 处理返回的评论数据
            comment.timeAgo = sharedTools.formatTimeAgo(comment.createTime);
            comment.avatar = apiConfig.getAvatarUrl(comment.avatar);
            comment.isLiked = Boolean(comment.isLiked);
            
            // 更新内容的评论数
            this.updateContentCommentsCount(contentId, contentType);
            
            resolve(comment);
          } else {
            reject({ message: '评论失败，请重试' });
          }
        })
        .catch(error => {
          console.error('添加评论失败:', error);
          reject({ message: error.message || '评论失败，请重试' });
        });
    });
  }

  // 添加回复
  addReply(contentId, contentType, parentCommentId, content, replyToUserId, replyToUserName) {
    return new Promise((resolve, reject) => {
      console.log('addReply 参数:', { contentId, contentType, parentCommentId, content, replyToUserId, replyToUserName });

      // 参数验证
      if (!content || typeof content !== 'string' || !content.trim()) {
        reject({ message: '回复内容不能为空' });
        return;
      }

      // 获取当前用户
      const userManager = require('./userManager');
      const currentUser = userManager.getCurrentUser();
      if (!currentUser) {
        reject({ message: '请先登录' });
        return;
      }

      apiConfig.post('/comments/reply', {
        content_id: contentId,
        content_type: contentType,
        parent_id: parentCommentId,
        content: content.trim(),
        reply_to_user_id: replyToUserId
      })
        .then(data => {
          const reply = data.comment;
          if (reply) {
            // 处理返回的回复数据
            reply.timeAgo = sharedTools.formatTimeAgo(reply.createTime);
            reply.avatar = apiConfig.getAvatarUrl(reply.avatar);
            reply.isLiked = Boolean(reply.isLiked);
            
            // 更新内容的评论数
            this.updateContentCommentsCount(contentId, contentType);
            
            resolve(reply);
          } else {
            reject({ message: '回复失败，请重试' });
          }
        })
        .catch(error => {
          console.error('添加回复失败:', error);
          reject({ message: error.message || '回复失败，请重试' });
        });
    });
  }

  // 获取评论列表（支持排序和分页）- 修正版本
  getComments(contentId, contentType, page = 1, limit = 20, sortType = 'time_desc') {
    return new Promise((resolve) => {
      const params = {
        page: page,
        limit: limit,
        sort: sortType
      };

      console.log('请求评论参数:', { contentId, contentType, params });

      apiConfig.get(`/comments/${contentType}/${contentId}`, params)
        .then(data => {
          console.log('API返回的原始数据:', data);
          
          // 修正：根据后端返回结构提取评论数据
          // 后端返回格式: { success: true, data: [...], pagination: {...} }
          let comments = data.data || data.comments || [];
          
          console.log('提取到的评论数据:', comments);
          
          // 展平回复数据 - 关键修复！
          // 后端返回的是嵌套结构，需要展平为单一数组供前端重新组织
          const flatComments = [];
          
          comments.forEach(comment => {
            // 处理主评论
            const mainComment = { ...comment };
            // 移除嵌套的replies，让前端重新组织
            delete mainComment.replies;
            
            mainComment.timeAgo = sharedTools.formatTimeAgo(mainComment.createTime);
            mainComment.avatar = apiConfig.getAvatarUrl(mainComment.avatar);
            mainComment.isLiked = Boolean(mainComment.isLiked);
            
            flatComments.push(mainComment);
            
            // 处理回复数据
            if (comment.replies && Array.isArray(comment.replies)) {
              comment.replies.forEach(reply => {
                reply.timeAgo = sharedTools.formatTimeAgo(reply.createTime);
                reply.avatar = apiConfig.getAvatarUrl(reply.avatar);
                reply.isLiked = Boolean(reply.isLiked);
                
                flatComments.push(reply);
              });
            }
          });

          console.log(`评论排序 - 类型: ${sortType}, 展平后评论数: ${flatComments.length}`);
          console.log('展平后的评论数据:', flatComments);
          
          // 模拟加载延迟，保持与原有体验一致
          setTimeout(() => {
            resolve(flatComments);
          }, 300);
        })
        .catch(error => {
          console.error('获取评论失败:', error);
          setTimeout(() => {
            resolve([]);
          }, 300);
        });
    });
  }

  // 评论点赞/取消点赞
  toggleCommentLike(commentId) {
    return new Promise((resolve, reject) => {
      // 获取当前用户信息
      const userManager = require('./userManager');
      const currentUser = userManager.getCurrentUser();

      if (!currentUser) {
        reject({ message: '请先登录' });
        return;
      }

      apiConfig.post(`/comments/${commentId}/like`)
        .then(data => {
          resolve({
            isLiked: Boolean(data.isLiked),
            likes: data.likes || 0
          });
        })
        .catch(error => {
          console.error('评论点赞操作失败:', error);
          reject({ message: error.message || '操作失败' });
        });
    });
  }

  // 删除评论
  deleteComment(commentId) {
    return new Promise((resolve, reject) => {
      const userManager = require('./userManager');
      const currentUser = userManager.getCurrentUser();

      if (!currentUser) {
        reject({ message: '请先登录' });
        return;
      }

      apiConfig.delete(`/comments/${commentId}`)
        .then(() => {
          resolve(true);
        })
        .catch(error => {
          console.error('删除评论失败:', error);
          reject({ message: error.message || '删除失败' });
        });
    });
  }

  // 更新内容的评论数（本地缓存用）
  updateContentCommentsCount(contentId, contentType) {
    // 这个方法现在主要用于本地缓存更新
    // 实际的数据库更新在后端自动处理
    console.log(`更新${contentType} ${contentId}的评论数`);
    
    // 可以通知其他模块更新评论数
    if (contentType === 'item') {
      const itemManager = require('./itemManager');
      // 可以在这里触发商品列表的刷新
    } else if (contentType === 'post') {
      const postManager = require('./postManager');
      // 可以在这里触发帖子列表的刷新
    }
  }
}

module.exports = new CommentManager();