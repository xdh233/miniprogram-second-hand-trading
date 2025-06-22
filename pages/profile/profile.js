// profile.js - 个人中心页面
const userManager = require('../../utils/userManager');
const postManager = require('../../utils/postManager');
const itemManager = require('../../utils/itemManager');

Page({
  data: {
    userInfo: null,
    userStats: {
      posts: 0,
      items: 0,
      likes: 0
    },
    tradeStats: {
      published: 0,
      sold: 0,
      bought: 5
    }
  },

  onLoad() {
    console.log('个人中心页面加载');
    this.checkLoginStatus();
  },

  onShow() {
    console.log('个人中心页面显示');
    this.checkLoginStatus();
    if (this.data.userInfo) {
      this.loadUserStats();
    }
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

  // 加载用户统计数据
  async loadUserStats() {
    try {
      const userId = this.data.userInfo.id;
      
      // 获取用户发布的商品
      const userItems = await itemManager.getUserItems(userId);
      
      // 统计数据
      const published = userItems.length;
      const sold = userItems.filter(item => item.status === 'sold').length;
      
      // 模拟其他统计数据
      const stats = {
        userStats: {
          posts: 5, // 模拟动态数量
          items: published,
          likes: 20 // 模拟获赞数
        },
        tradeStats: {
          published: published,
          sold: sold,
          bought: 5 // 模拟购买数量
        }
      };
      
      this.setData(stats);
      
    } catch (error) {
      console.error('加载用户统计失败:', error);
    }
  },

  // 设置
  navigateToSettings() {
    console.log('打开设置');
    wx.showToast({
      title: '设置功能开发中',
      icon: 'none'
    });
    // wx.navigateTo({
    //   url: '/pages/settings/settings'
    // });
  },



  // 我发布的
  navigateToMyPublished() {
    console.log('查看我发布的');
    wx.showToast({
      title: '我发布的功能开发中',
      icon: 'none'
    });
    // wx.navigateTo({
    //   url: '/pages/my-published/my-published'
    // });
  },

  // 我卖出的
  navigateToMySold() {
    console.log('查看我卖出的');
    wx.showToast({
      title: '我卖出的功能开发中',
      icon: 'none'
    });
    // wx.navigateTo({
    //   url: '/pages/my-sold/my-sold'
    // });
  },

  // 我买到的
  navigateToMyBought() {
    console.log('查看我买到的');
    wx.showToast({
      title: '我买到的功能开发中',
      icon: 'none'
    });
    // wx.navigateTo({
    //   url: '/pages/my-bought/my-bought'
    // });
  },

  // 我的收藏
  navigateToFavorites() {
    console.log('查看我的收藏');
    wx.showToast({
      title: '我的收藏功能开发中',
      icon: 'none'
    });
    // wx.navigateTo({
    //   url: '/pages/favorites/favorites'
    // });
  },

  // 收货地址
  navigateToDeliveryAddress() {
    console.log('管理收货地址');
    wx.showToast({
      title: '收货地址功能开发中',
      icon: 'none'
    });
    // wx.navigateTo({
    //   url: '/pages/address/address'
    // });
  },



  // 意见反馈
  navigateToFeedback() {
    console.log('意见反馈');
    wx.showToast({
      title: '意见反馈功能开发中',
      icon: 'none'
    });
    // wx.navigateTo({
    //   url: '/pages/feedback/feedback'
    // });
  },

  // 关于开发者
  navigateToAbout() {
    console.log('关于开发者');
    
    wx.showModal({
      title: '关于开发者',
      content: '校园二手物品交易系统\r\n开发者：牛大果\n版本：1.0.0\n\n感谢您的使用！',
      showCancel: false,
      confirmText: '知道了'
    });
  },



  // 退出登录
  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          userManager.logout();
          wx.reLaunch({
            url: '/pages/login/login'
          });
        }
      }
    });
  }
});