// utils/notifyManager.js - 通知管理器

class NotifyManager {
  constructor() {
    this.NOTIFICATIONS_KEY = 'campus_notifications';
    this.init();
  }

  // 通知类型
  static TYPES = {
    LIKE_POST: 'like_post',           // 点赞帖子
    LIKE_COMMENT: 'like_comment',     // 点赞评论
    LIKE_ITEM: 'like_item',           // 点赞商品
    COMMENT_POST: 'comment_post',     // 评论帖子
    COMMENT_ITEM: 'comment_item',     // 评论商品
    REPLY_COMMENT: 'reply_comment',   // 回复评论
    SYSTEM: 'system'                  // 系统通知
  };

  init() {
    // 确保通知存储结构存在
    const notifications = this.getAllNotifications();
    if (!Array.isArray(notifications)) {
      this.saveNotifications([]);
    }
  }

  // 创建通知的通用方法
  createNotification(type, data) {
    const notification = {
      id: this.generateId(),
      type: type,
      fromUserId: data.fromUserId,
      fromUserName: data.fromUserName,
      fromUserAvatar: data.fromUserAvatar || '/images/default-avatar.png',
      toUserId: data.toUserId,
      targetId: data.targetId,           // 被操作的对象ID（帖子、评论、商品）
      targetType: data.targetType,       // 被操作的对象类型
      targetContent: data.targetContent, // 被操作的内容预览
      postId: data.postId,              // 相关帖子ID（用于跳转）
      itemId: data.itemId,              // 相关商品ID（用于跳转）
      originalContent: data.originalContent, // 原始内容（回复时使用）
      isRead: false,
      createTime: new Date().toISOString()
    };

    const notifications = this.getAllNotifications();
    notifications.unshift(notification);
    this.saveNotifications(notifications);

    console.log(`创建通知: ${type}`, notification);
    return notification;
  }

  // 创建点赞帖子通知
  createPostLikeNotification(fromUserId, fromUserName, fromUserAvatar, postId, postContent, postAuthorId) {
    // 不给自己发通知
    if (fromUserId === postAuthorId) return null;

    return this.createNotification(NotifyManager.TYPES.LIKE_POST, {
      fromUserId,
      fromUserName,
      fromUserAvatar,
      toUserId: postAuthorId,
      targetId: postId,
      targetType: 'post',
      targetContent: postContent,
      postId: postId
    });
  }

  // 创建点赞评论通知
  createCommentLikeNotification(fromUserId, fromUserName, fromUserAvatar, commentId, commentContent, commentAuthorId, postId) {
    // 不给自己发通知
    if (fromUserId === commentAuthorId) return null;

    return this.createNotification(NotifyManager.TYPES.LIKE_COMMENT, {
      fromUserId,
      fromUserName,
      fromUserAvatar,
      toUserId: commentAuthorId,
      targetId: commentId,
      targetType: 'comment',
      targetContent: commentContent,
      postId: postId
    });
  }

  // 创建点赞商品通知
  createItemLikeNotification(fromUserId, fromUserName, fromUserAvatar, itemId, itemTitle, itemAuthorId) {
    // 不给自己发通知
    if (fromUserId === itemAuthorId) return null;

    return this.createNotification(NotifyManager.TYPES.LIKE_ITEM, {
      fromUserId,
      fromUserName,
      fromUserAvatar,
      toUserId: itemAuthorId,
      targetId: itemId,
      targetType: 'item',
      targetContent: itemTitle,
      itemId: itemId
    });
  }

  // 创建评论帖子通知
  createPostCommentNotification(fromUserId, fromUserName, fromUserAvatar, postId, postContent, postAuthorId, commentContent) {
    // 不给自己发通知
    if (fromUserId === postAuthorId) return null;

    return this.createNotification(NotifyManager.TYPES.COMMENT_POST, {
      fromUserId,
      fromUserName,
      fromUserAvatar,
      toUserId: postAuthorId,
      targetId: postId,
      targetType: 'post',
      targetContent: postContent,
      postId: postId,
      originalContent: commentContent
    });
  }

  // 创建评论商品通知
  createItemCommentNotification(fromUserId, fromUserName, fromUserAvatar, itemId, itemTitle, itemAuthorId, commentContent) {
    // 不给自己发通知
    if (fromUserId === itemAuthorId) return null;

    return this.createNotification(NotifyManager.TYPES.COMMENT_ITEM, {
      fromUserId,
      fromUserName,
      fromUserAvatar,
      toUserId: itemAuthorId,
      targetId: itemId,
      targetType: 'item',
      targetContent: itemTitle,
      itemId: itemId,
      originalContent: commentContent
    });
  }

  // 创建回复评论通知
  createReplyCommentNotification(fromUserId, fromUserName, fromUserAvatar, originalCommentId, originalCommentContent, originalAuthorId, replyContent, postId, itemId) {
    // 不给自己发通知
    if (fromUserId === originalAuthorId) return null;

    return this.createNotification(NotifyManager.TYPES.REPLY_COMMENT, {
      fromUserId,
      fromUserName,
      fromUserAvatar,
      toUserId: originalAuthorId,
      targetId: originalCommentId,
      targetType: 'comment',
      targetContent: replyContent,
      originalContent: originalCommentContent,
      postId: postId,
      itemId: itemId
    });
  }

  // 获取用户的评论通知
  getCommentNotifications(userId) {
    const notifications = this.getAllNotifications();
    return notifications.filter(notif => 
      notif.toUserId === userId && 
      (notif.type === NotifyManager.TYPES.COMMENT_POST || 
       notif.type === NotifyManager.TYPES.COMMENT_ITEM ||
       notif.type === NotifyManager.TYPES.REPLY_COMMENT)
    ).sort((a, b) => new Date(b.createTime) - new Date(a.createTime));
  }

  // 获取用户的点赞通知
  getLikeNotifications(userId) {
    const notifications = this.getAllNotifications();
    return notifications.filter(notif => 
      notif.toUserId === userId && 
      (notif.type === NotifyManager.TYPES.LIKE_POST || 
       notif.type === NotifyManager.TYPES.LIKE_COMMENT ||
       notif.type === NotifyManager.TYPES.LIKE_ITEM)
    ).sort((a, b) => new Date(b.createTime) - new Date(a.createTime));
  }

  // 获取用户所有通知
  getUserNotifications(userId) {
    const notifications = this.getAllNotifications();
    return notifications.filter(notif => notif.toUserId === userId)
      .sort((a, b) => new Date(b.createTime) - new Date(a.createTime));
  }

  // 获取未读通知数量
  getUnreadCount(userId, type = null) {
    const notifications = this.getUserNotifications(userId);
    let filtered = notifications.filter(notif => !notif.isRead);
    
    if (type) {
      if (type === 'comment') {
        filtered = filtered.filter(notif => 
          notif.type === NotifyManager.TYPES.COMMENT_POST || 
          notif.type === NotifyManager.TYPES.COMMENT_ITEM ||
          notif.type === NotifyManager.TYPES.REPLY_COMMENT
        );
      } else if (type === 'like') {
        filtered = filtered.filter(notif => 
          notif.type === NotifyManager.TYPES.LIKE_POST || 
          notif.type === NotifyManager.TYPES.LIKE_COMMENT ||
          notif.type === NotifyManager.TYPES.LIKE_ITEM
        );
      }
    }
    
    return filtered.length;
  }

  // 标记通知为已读
  markAsRead(notificationId) {
    const notifications = this.getAllNotifications();
    const notification = notifications.find(notif => notif.id === notificationId);
    
    if (notification) {
      notification.isRead = true;
      this.saveNotifications(notifications);
      return true;
    }
    return false;
  }

  // 批量标记为已读
  markAllAsRead(userId, type = null) {
    const notifications = this.getAllNotifications();
    let updated = false;

    notifications.forEach(notif => {
      if (notif.toUserId === userId && !notif.isRead) {
        let shouldMark = false;
        
        if (!type) {
          shouldMark = true;
        } else if (type === 'comment') {
          shouldMark = notif.type === NotifyManager.TYPES.COMMENT_POST || 
                      notif.type === NotifyManager.TYPES.COMMENT_ITEM ||
                      notif.type === NotifyManager.TYPES.REPLY_COMMENT;
        } else if (type === 'like') {
          shouldMark = notif.type === NotifyManager.TYPES.LIKE_POST || 
                      notif.type === NotifyManager.TYPES.LIKE_COMMENT ||
                      notif.type === NotifyManager.TYPES.LIKE_ITEM;
        }
        
        if (shouldMark) {
          notif.isRead = true;
          updated = true;
        }
      }
    });

    if (updated) {
      this.saveNotifications(notifications);
    }
    return updated;
  }

  // 删除通知
  deleteNotification(notificationId) {
    const notifications = this.getAllNotifications();
    const filteredNotifications = notifications.filter(notif => notif.id !== notificationId);
    
    if (filteredNotifications.length !== notifications.length) {
      this.saveNotifications(filteredNotifications);
      return true;
    }
    return false;
  }

  // 清理过期通知（保留最近30天的）
  cleanupOldNotifications() {
    const notifications = this.getAllNotifications();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const filteredNotifications = notifications.filter(notif => 
      new Date(notif.createTime) > thirtyDaysAgo
    );
    
    if (filteredNotifications.length !== notifications.length) {
      this.saveNotifications(filteredNotifications);
      console.log(`清理了 ${notifications.length - filteredNotifications.length} 条过期通知`);
    }
  }

  // 格式化通知用于显示
  formatNotificationForDisplay(notification) {
    const time = this.formatTime(notification.createTime);
    
    let displayData = {
      id: notification.id,
      userId: notification.fromUserId,
      userName: notification.fromUserName,
      userAvatar: notification.fromUserAvatar,
      time: time,
      isRead: notification.isRead,
      postId: notification.postId,
      itemId: notification.itemId
    };

    switch (notification.type) {
      case NotifyManager.TYPES.LIKE_POST:
        displayData.likeType = 'post';
        displayData.targetContent = notification.targetContent;
        break;
      
      case NotifyManager.TYPES.LIKE_COMMENT:
        displayData.likeType = 'comment';
        displayData.targetContent = notification.targetContent;
        break;
      
      case NotifyManager.TYPES.LIKE_ITEM:
        displayData.likeType = 'item';
        displayData.targetContent = notification.targetContent;
        break;
      
      case NotifyManager.TYPES.COMMENT_POST:
        displayData.commentType = 'post_comment';
        displayData.content = notification.originalContent;
        displayData.postContent = notification.targetContent;
        break;
      
      case NotifyManager.TYPES.COMMENT_ITEM:
        displayData.commentType = 'item_comment';
        displayData.content = notification.originalContent;
        displayData.itemContent = notification.targetContent;
        break;
      
      case NotifyManager.TYPES.REPLY_COMMENT:
        displayData.commentType = 'comment_reply';
        displayData.content = notification.targetContent;
        displayData.originalContent = notification.originalContent;
        displayData.postContent = notification.postId ? '查看帖子' : null;
        displayData.itemContent = notification.itemId ? '查看商品' : null;
        break;
    }

    return displayData;
  }

  // 工具方法
  generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  formatTime(timestamp) {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diff < minute) {
      return '刚刚';
    } else if (diff < hour) {
      return `${Math.floor(diff / minute)}分钟前`;
    } else if (diff < day) {
      return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
    } else if (diff < 7 * day) {
      return `${Math.floor(diff / day)}天前`;
    } else {
      return `${date.getMonth() + 1}月${date.getDate()}日`;
    }
  }

  // 存储操作
  getAllNotifications() {
    try {
      return wx.getStorageSync(this.NOTIFICATIONS_KEY) || [];
    } catch (error) {
      console.error('获取通知失败:', error);
      return [];
    }
  }

  saveNotifications(notifications) {
    try {
      wx.setStorageSync(this.NOTIFICATIONS_KEY, notifications);
      return true;
    } catch (error) {
      console.error('保存通知失败:', error);
      return false;
    }
  }

  // 调试方法
  debugClearAll() {
    try {
      wx.removeStorageSync(this.NOTIFICATIONS_KEY);
      console.log('已清空所有通知数据');
      return true;
    } catch (error) {
      console.error('清空通知数据失败:', error);
      return false;
    }
  }

  // 获取统计信息
  getStats(userId) {
    const notifications = this.getUserNotifications(userId);
    const unreadNotifications = notifications.filter(notif => !notif.isRead);
    
    return {
      total: notifications.length,
      unread: unreadNotifications.length,
      commentUnread: this.getUnreadCount(userId, 'comment'),
      likeUnread: this.getUnreadCount(userId, 'like')
    };
  }
}

// 创建单例
const notifyManager = new NotifyManager();

module.exports = notifyManager;