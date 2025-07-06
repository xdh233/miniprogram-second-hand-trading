// message.js - 修复重复方法定义
const userManager = require('../../utils/userManager');
const chatManager = require('../../utils/chatManager');
const sharedTools = require('../../utils/sharedTools');
const apiConfig = require('../../utils/apiConfig');

Page({
  data: {
    userInfo: null,
    commentCount: 0,
    likeCount: 0,
    chatList: [],
    searchText: '',
    refreshing: false
  },

  onLoad() {
    console.log('消息页面加载');
    this.checkLoginStatus();
  },

  onShow() {
    console.log('消息页面显示');
    this.checkLoginStatus();
    
    // 🔧 修复：每次显示页面都重新加载，确保未读数是最新的
    this.loadMessages();
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

  // 🔧 修复：重新设计加载消息数据的方法
  async loadMessages() {
    console.log('加载消息数据');
    
    if (!this.data.userInfo) return;

    try {
      wx.showLoading({ title: '加载中...' });

      // 获取聊天列表
      const response = await apiConfig.get(`/chats/user/${this.data.userInfo.id}`);
      
      if (!response.success) {
        throw new Error(response.message || '获取聊天列表失败');
      }

      console.log('API返回的聊天列表:', response.data.chats);

      // 格式化聊天列表数据
      const formattedChatList = response.data.chats.map(chat => {
        console.log('处理聊天项:', chat);
        
        return {
          id: chat.id,
          chatId: chat.id,
          userId: chat.otherUser.id,
          name: chat.otherUser.nickname,
          avatar: apiConfig.getAvatarUrl(chat.otherUser.avatar),
          lastMessage: chat.lastMessage || '暂无消息',
          time: sharedTools.formatTimeAgo(chat.lastMessageTime),
          unreadCount: chat.unreadCount || 0, // 🔧 确保使用后端返回的未读数
          relatedItem: chat.relatedItem,
          isPinned: false,
          isMuted: false
        };
      });

      console.log('格式化后的聊天列表:', formattedChatList);

      // 🔧 计算总未读数并更新tabbar角标
      const totalUnreadCount = formattedChatList.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);
      this.updateTabBarBadge(totalUnreadCount);

      // 获取未读通知数
      await this.loadNotificationCounts();

      this.setData({
        chatList: formattedChatList
      });

      wx.hideLoading();

    } catch (error) {
      wx.hideLoading();
      console.error('加载消息失败:', error);
      
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
      
      this.setData({
        chatList: []
      });
    }
  },

  // 加载通知未读数 - 使用新的API
  async loadNotificationCounts() {
    try {
      const response = await apiConfig.get('/notifications/unread-count');

      if (response.success) {
        this.setData({
          commentCount: response.data.comment || 0,
          likeCount: response.data.like || 0
        });
        
        // 直接使用后端计算的总数（已根据设置过滤）
        const totalCount = response.data.total || 0;
        console.log('未读通知数:', response.data);
      } else {
        throw new Error(response.message || '获取未读数失败');
      }
    } catch (error) {
      console.error('获取通知数失败:', error);
      // 设置默认值
      this.setData({
        commentCount: 0,
        likeCount: 0
      });
    }
  },

  // 🔧 修复：合并并完善进入聊天页面的方法
  navigateToChat(e) {
    const item = e.currentTarget.dataset.item;
    if (!item) {
      console.error('没有聊天项数据');
      return;
    }
  
    console.log('点击聊天项:', item);
    
    if (!item.userId) {
      console.error('缺少用户ID，聊天项数据:', item);
      wx.showToast({
        title: '用户信息错误',
        icon: 'none'
      });
      return;
    }
    
    // 构建跳转URL
    let url = `/pages/chat/chat?userId=${item.userId}`;
    
    if (item.relatedItem && item.relatedItem.id) {
      url += `&itemId=${item.relatedItem.id}`;
      console.log('包含商品信息:', item.relatedItem);
    }
    
    console.log('跳转URL:', url);
    
    // 🔧 修复：立即标记为已读并更新本地未读数
    if (item.unreadCount > 0) {
      this.markChatAsRead(item.chatId);
      
      // 🔧 立即更新本地未读数，提供即时反馈
      const updatedChatList = this.data.chatList.map(chat => {
        if (chat.chatId === item.chatId) {
          return { ...chat, unreadCount: 0 };
        }
        return chat;
      });
      
      // 重新计算总未读数并更新角标
      const newTotalUnreadCount = updatedChatList.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);
      this.updateTabBarBadge(newTotalUnreadCount);
      
      this.setData({
        chatList: updatedChatList
      });
    }
    
    // 跳转到聊天页面
    wx.navigateTo({
      url: url,
      success: () => {
        console.log('跳转聊天页面成功');
      },
      fail: (error) => {
        console.error('跳转聊天页面失败:', error);
        wx.showToast({
          title: '打开聊天失败',
          icon: 'none'
        });
      }
    });
  },

  // 🔧 修复：标记聊天为已读的方法
  async markChatAsRead(chatId) {
    try {
      console.log('标记聊天已读:', chatId);
      const response = await apiConfig.put(`/chats/${chatId}/read`);
      
      if (response.success) {
        console.log('标记聊天已读成功:', chatId, response.data);
      } else {
        console.error('标记聊天已读失败:', response.message);
      }
    } catch (error) {
      console.error('标记聊天已读失败:', error);
      
      // 🔧 如果是数据库字段缺失错误，给出明确提示
      if (error.message && error.message.includes('is_read')) {
        console.error('数据库缺少is_read字段');
        wx.showToast({
          title: '系统需要更新，请联系管理员',
          icon: 'none'
        });
      }
    }
  },

  // 🔧 修复：合并tabbar角标更新方法
  updateTabBarBadge(count) {
    console.log('更新tabbar角标:', count);
    
    if (count > 0) {
      wx.setTabBarBadge({
        index: 3, // 消息页面在 app.json tabBar 中的索引
        text: count > 99 ? '99+' : count.toString(),
        success: () => {
          console.log('设置角标成功:', count);
        },
        fail: (error) => {
          console.error('设置角标失败:', error);
        }
      });
    } else {
      wx.removeTabBarBadge({
        index: 3,
        success: () => {
          console.log('移除角标成功');
        },
        fail: (error) => {
          console.error('移除角标失败:', error);
        }
      });
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.setData({ refreshing: true });
    this.loadMessages();
    setTimeout(() => {
      this.setData({ refreshing: false });
      wx.stopPullDownRefresh();
    }, 1000);
  },

  // 搜索输入
  onSearchInput(e) {
    const searchText = e.detail.value;
    this.setData({ searchText });
    
    if (searchText.trim()) {
      this.searchChats(searchText);
    } else {
      this.loadMessages();
    }
  },

  // 搜索聊天
  async searchChats(keyword) {
    if (!this.data.userInfo) return;

    try {
      // 在本地聊天列表中搜索
      const allChats = this.data.chatList;
      const filteredChats = allChats.filter(chat => 
        chat.name.toLowerCase().includes(keyword.toLowerCase()) ||
        chat.lastMessage.toLowerCase().includes(keyword.toLowerCase())
      );

      this.setData({ chatList: filteredChats });
    } catch (error) {
      console.error('搜索失败:', error);
      this.setData({ chatList: [] });
    }
  },

  // 查看评论消息 - 进入时自动标记已读
  navigateToComments() {
    console.log('查看评论消息');
    wx.navigateTo({
      url: '/pages/comments/comments',
      success: () => {
        // 跳转成功后，延迟更新未读数（给评论页面时间标记已读）
        setTimeout(() => {
          this.loadNotificationCounts();
        }, 500);
      }
    });
  },

  // 查看点赞消息 - 进入时自动标记已读
  navigateToLikes() {
    console.log('查看点赞消息');
    wx.navigateTo({
      url: '/pages/likes/likes',
      success: () => {
        // 跳转成功后，延迟更新未读数
        setTimeout(() => {
          this.loadNotificationCounts();
        }, 500);
      }
    });
  },

  // 长按聊天项
  onLongPressChat(e) {
    const item = e.currentTarget.dataset.item;
    if (!item) return;

    const actionList = [];
    
    // 置顶/取消置顶
    actionList.push(item.isPinned ? '取消置顶' : '置顶聊天');
    
    // 免打扰/取消免打扰
    actionList.push(item.isMuted ? '取消免打扰' : '消息免打扰');
    
    // 删除聊天
    actionList.push('删除聊天');

    wx.showActionSheet({
      itemList: actionList,
      success: async (res) => {
        try {
          switch (res.tapIndex) {
            case 0: // 置顶/取消置顶
              // TODO: 实现置顶功能
              wx.showToast({
                title: '功能开发中',
                icon: 'none'
              });
              break;
              
            case 1: // 免打扰/取消免打扰
              // TODO: 实现免打扰功能
              wx.showToast({
                title: '功能开发中',
                icon: 'none'
              });
              break;
              
            case 2: // 删除聊天
              wx.showModal({
                title: '确认删除',
                content: '删除后聊天记录将无法恢复',
                confirmColor: '#ff4d4f',
                success: async (modalRes) => {
                  if (modalRes.confirm) {
                    await this.deleteChat(item.chatId);
                  }
                }
              });
              break;
          }
        } catch (error) {
          console.error('操作失败:', error);
          wx.showToast({
            title: '操作失败',
            icon: 'none'
          });
        }
      }
    });
  },

  // 🔧 删除聊天的方法
  async deleteChat(chatId) {
    try {
      wx.showLoading({ title: '删除中...' });
      
      const response = await apiConfig.delete(`/chats/${chatId}`);
      
      if (response.success) {
        wx.hideLoading();
        wx.showToast({
          title: '删除成功',
          icon: 'success'
        });
        
        // 重新加载聊天列表
        this.loadMessages();
      } else {
        throw new Error(response.message || '删除失败');
      }
    } catch (error) {
      wx.hideLoading();
      console.error('删除聊天失败:', error);
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      });
    }
  },

  // 全部标记为已读
  async markAllAsRead() {
    wx.showModal({
      title: '确认操作',
      content: '将所有聊天标记为已读？',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '处理中...' });
            
            // 逐个标记所有聊天为已读
            const promises = this.data.chatList.map(chat => 
              this.markChatAsRead(chat.chatId)
            );
            
            await Promise.all(promises);
            
            wx.hideLoading();
            wx.showToast({
              title: '已全部标记为已读',
              icon: 'success'
            });
            
            // 重新加载聊天列表
            this.loadMessages();
          } catch (error) {
            wx.hideLoading();
            console.error('标记已读失败:', error);
            wx.showToast({
              title: '操作失败',
              icon: 'none'
            });
          }
        }
      }
    });
  }
});