const BaseManager = require('./baseManager');  
const sharedTools = require('./sharedTools');

class CommentManager extends BaseManager {
  constructor() {
    super('campus_comments');
    this.init();
  }

  init() {
    const comments = this.getAll();
    if (comments.length === 0) {
      this.initTestComments();
    }
  }

  // 初始化测试评论数据
  initTestComments() {
    const testComments = [
      // 商品评论
      {
        id: 1,
        contentId: 1,
        contentType: 'item',
        userId: 3,
        userNickname: '蛋黄',
        avatar: '/images/default-avatar.png',
        content: '这个商品看起来不错，还有货吗？',
        parentId: null,
        isAuthor: false,
        likes: 5,
        isLiked: false,
        createTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        timeAgo: '2小时前'
      },
      {
        id: 2,
        contentId: 1,
        contentType: 'item',
        userId: 1,
        userNickname: '三张',
        avatar: '/images/default-avatar.png',
        content: '主播我也想玩。',
        parentId: null,
        isAuthor: false,
        likes: 3,
        isLiked: true,
        createTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        timeAgo: '2小时前'
      },
      // 动态评论
      {
        id: 3,
        contentId: 1,
        contentType: 'post',
        userId: 2,
        userNickname: '四李',
        avatar: '/images/default-avatar.png',
        content: '确实很好吃！我上次也去了',
        parentId: null,
        isAuthor: false,
        likes: 5,
        isLiked: false,
        createTime: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        timeAgo: '1小时前'
      },
      {
        id: 4,
        contentId: 1,
        contentType: 'post',
        userId: 3,
        userNickname: '蛋黄',
        avatar: '/images/default-avatar.png',
        content: '在哪里啊？求地址',
        parentId: null,
        isAuthor: false,
        likes: 3,
        isLiked: false,
        createTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        timeAgo: '30分钟前'
      },
      // 回复示例
      {
        id: 5,
        contentId: 1,
        contentType: 'post',
        userId: 1,
        userNickname: '三张',
        avatar: '/images/default-avatar.png',
        content: '在学校食堂二楼',
        parentId: 4,
        replyToUserId: 3,
        replyToUserName: '蛋黄',
        isAuthor: true,
        likes: 2,
        isLiked: false,
        createTime: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
        timeAgo: '25分钟前'
      }
    ];
    this.save(testComments);
  }

  // 获取指定内容的评论
  getCommentsByContent(contentId, contentType) {
    const allComments = this.getAll();
    return allComments
      .filter(comment => comment.contentId == contentId && comment.contentType === contentType)
      .sort((a, b) => new Date(a.createTime) - new Date(b.createTime));
  }

  // 添加主评论
  addComment(contentId, contentType, content) {
    return new Promise(async (resolve, reject) => {
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

        // 获取内容信息，判断是否为作者
        let content_item, isAuthor;
        if (contentType === 'item') {
          const itemManager = require('./itemManager');
          content_item = itemManager.getItemById(contentId);
          isAuthor = content_item?.sellerId === currentUser.id;
        } else if (contentType === 'post') {
          const postManager = require('./postManager');
          content_item = postManager.getPostById(contentId);
          isAuthor = content_item?.userId === currentUser.id;
        }

        if (!content_item) {
          reject({ message: `${contentType === 'item' ? '商品' : '帖子'}不存在` });
          return;
        }

        const newComment = {
          id: Date.now(),
          contentId: parseInt(contentId),
          contentType: contentType,
          userId: currentUser.id,
          userName: currentUser.name,
          userNickname: currentUser.nickname || currentUser.name,
          avatar: '/images/default-avatar.png',
          content: content.trim(),
          parentId: null,
          likes: 0,
          isLiked: false,
          isAuthor: isAuthor,
          createTime: new Date().toISOString(),
          timeAgo: '刚刚'
        };

        if (this.add(newComment)) {
          // 更新内容的评论数
          this.updateContentCommentsCount(contentId, contentType);

          // 创建通知
          const notifyManager = require('./notifyManager');
          if (contentType === 'item') {
            await notifyManager.createItemCommentNotification(
              currentUser.id,
              currentUser.nickname || currentUser.name,
              currentUser.avatar || '/images/default-avatar.png',
              contentId,
              content_item.title,
              content_item.sellerId,
              content.trim()
            );
          } else {
            await notifyManager.createPostCommentNotification(
              currentUser.id,
              currentUser.nickname || currentUser.name,
              currentUser.avatar || '/images/default-avatar.png',
              contentId,
              content_item.content,
              content_item.userId,
              content.trim()
            );
          }

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
  addReply(contentId, contentType, parentCommentId, content, replyToUserId, replyToUserName) {
    return new Promise(async (resolve, reject) => {
      try {
        console.log('addReply 参数:', { contentId, contentType, parentCommentId, content, replyToUserId, replyToUserName });

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

        // 3. 查找被回复的评论
        const allComments = this.getAll();
        const targetComment = allComments.find(c => c.id == parentCommentId);
        if (!targetComment) {
          reject({ message: '评论不存在' });
          return;
        }

        // 4. 确定真正的主评论ID
        const mainCommentId = targetComment.parentId || targetComment.id;

        // 5. 查找内容信息
        let content_item, isAuthor;
        if (contentType === 'item') {
          const itemManager = require('./itemManager');
          content_item = itemManager.getItemById(contentId);
          isAuthor = content_item?.sellerId === currentUser.id;
        } else if (contentType === 'post') {
          const postManager = require('./postManager');
          content_item = postManager.getPostById(contentId);
          isAuthor = content_item?.userId === currentUser.id;
        }

        if (!content_item) {
          reject({ message: `${contentType === 'item' ? '商品' : '帖子'}不存在` });
          return;
        }

        // 6. 创建回复对象
        const newReply = {
          id: Date.now(),
          contentId: parseInt(contentId),
          contentType: contentType,
          parentId: mainCommentId,
          userId: currentUser.id,
          userName: currentUser.name,
          userNickname: currentUser.nickname || currentUser.name,
          avatar: '/images/default-avatar.png',
          content: content.trim(),
          replyToUserId: replyToUserId || null,
          replyToUserName: replyToUserName || null,
          likes: 0,
          isLiked: false,
          isAuthor: isAuthor,
          createTime: new Date().toISOString(),
          timeAgo: '刚刚'
        };

        console.log('创建的回复对象:', newReply);

        // 7. 保存回复
        if (this.add(newReply)) {
          // 8. 更新内容的评论数
          this.updateContentCommentsCount(contentId, contentType);

          // 9. 创建通知
          const notifyManager = require('./notifyManager');
          await notifyManager.createReplyCommentNotification(
            currentUser.id,
            currentUser.nickname || currentUser.name,
            currentUser.avatar || '/images/default-avatar.png',
            parentCommentId,
            targetComment.content,
            targetComment.userId,
            content.trim(),
            contentType === 'post' ? contentId : null,
            contentType === 'item' ? contentId : null
          );

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

  // 获取评论列表（支持排序和分页）
  getComments(contentId, contentType, page = 1, limit = 20, sortType = 'time_desc') {
    return new Promise((resolve) => {
      const contentComments = this.getCommentsByContent(contentId, contentType);

      // 根据排序类型进行排序
      switch (sortType) {
        case 'hot':
          contentComments.sort((a, b) => {
            const likesA = a.likes || 0;
            const likesB = b.likes || 0;
            if (likesB !== likesA) {
              return likesB - likesA;
            }
            return new Date(b.createTime) - new Date(a.createTime);
          });
          break;
        case 'time_asc':
          contentComments.sort((a, b) => new Date(a.createTime) - new Date(b.createTime));
          break;
        case 'time_desc':
        default:
          contentComments.sort((a, b) => new Date(b.createTime) - new Date(a.createTime));
          break;
      }

      // 分页逻辑：只对主评论分页，然后带上对应的回复
      const mainComments = contentComments.filter(c => !c.parentId);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedMainComments = mainComments.slice(startIndex, endIndex);

      // 获取这些主评论的所有回复
      const mainCommentIds = paginatedMainComments.map(c => c.id);
      const replies = contentComments.filter(c => c.parentId && mainCommentIds.includes(c.parentId));

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

  // 评论点赞/取消点赞
  toggleCommentLike(commentId) {
    return new Promise(async (resolve, reject) => {
      try {
        // 获取当前用户信息
        const userManager = require('./userManager');
        const currentUser = userManager.getCurrentUser();

        if (!currentUser) {
          reject({ message: '请先登录' });
          return;
        }

        const comment = this.getById(commentId);
        if (!comment) {
          reject({ message: '评论不存在' });
          return;
        }

        const wasLiked = comment.isLiked;
        const updatedComment = {
          ...comment,
          isLiked: !comment.isLiked,
          likes: comment.isLiked ? Math.max(0, (comment.likes || 0) - 1) : (comment.likes || 0) + 1
        };

        const result = this.update(commentId, updatedComment);
        if (result) {
          // 如果是点赞操作，创建通知
          if (!wasLiked && updatedComment.isLiked) {
            const notifyManager = require('./notifyManager');
            await notifyManager.createCommentLikeNotification(
              currentUser.id,
              currentUser.nickname || currentUser.name,
              currentUser.avatar || '/images/default-avatar.png',
              commentId,
              comment.content,
              comment.userId,
              comment.contentType === 'post' ? comment.contentId : null
            );
          }

          resolve({
            isLiked: updatedComment.isLiked,
            likes: updatedComment.likes
          });
        } else {
          reject({ message: '操作失败' });
        }
      } catch (error) {
        console.error('评论点赞操作失败:', error);
        reject({ message: '操作失败' });
      }
    });
  }

  // 更新内容的评论数
  updateContentCommentsCount(contentId, contentType) {
    const allComments = this.getCommentsByContent(contentId, contentType);
    const commentCount = allComments.length;

    // 根据内容类型更新对应的评论数
    if (contentType === 'item') {
      const itemManager = require('./itemManager');
      itemManager.updateCommentsCount(contentId, commentCount);
    } else if (contentType === 'post') {
      const postManager = require('./postManager');
      postManager.updateCommentsCount(contentId, commentCount);
    }

    return commentCount;
  }
}

module.exports = new CommentManager();