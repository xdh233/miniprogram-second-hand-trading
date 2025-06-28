// pages/settings/settings.js - 设置页面
const userManager = require('../../utils/userManager');

Page({
  data: {
    userInfo: null,
    settings: {
      commentNotify: true,  // 评论通知
      likeNotify: true,     // 点赞通知
    },
    tempNickname: '',      // 临时存储昵称
    tempBio: '',           // 临时存储简介
    tempGender: '',        // 临时存储性别
    showNicknameModal: false,
    showBioModal: false,
    showGenderModal: false
  },

  onLoad() {
    console.log('设置页面加载');
    this.checkLoginStatus();
    this.loadUserSettings();
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
    this.setData({ 
      userInfo,
      tempNickname: userInfo.nickname || userInfo.name,
      tempBio: userInfo.bio || '',
      tempGender: userInfo.gender || '未设置'
    });
  },

  // 加载用户设置
  loadUserSettings() {
    try {
      const settings = wx.getStorageSync('user_settings') || {
        commentNotify: true,
        likeNotify: true
      };
      this.setData({ settings });
    } catch (error) {
      console.error('加载设置失败:', error);
    }
  },

  // 保存设置
  saveSettings() {
    try {
      wx.setStorageSync('user_settings', this.data.settings);
      return true;
    } catch (error) {
      console.error('保存设置失败:', error);
      return false;
    }
  },

  // 修改头像
  changeAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      camera: 'back',
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        
        // 这里应该上传到服务器，现在先用本地路径
        const updatedUser = {
          ...this.data.userInfo,
          avatar: tempFilePath
        };
        
        if (userManager.updateUserInfo(updatedUser)) {
          this.setData({ userInfo: updatedUser });
          wx.showToast({
            title: '头像修改成功',
            icon: 'success'
          });
        } else {
          wx.showToast({
            title: '头像修改失败',
            icon: 'error'
          });
        }
      },
      fail: (error) => {
        console.error('选择图片失败:', error);
      }
    });
  },

  // 显示昵称修改弹窗
  showNicknameEdit() {
    this.setData({ 
      showNicknameModal: true,
      tempNickname: this.data.userInfo.nickname || this.data.userInfo.name
    });
  },

  // 昵称输入
  onNicknameInput(e) {
    this.setData({ tempNickname: e.detail.value });
  },

  // 确认修改昵称
  confirmNickname() {
    const nickname = this.data.tempNickname.trim();
    
    if (!nickname) {
      wx.showToast({
        title: '昵称不能为空',
        icon: 'none'
      });
      return;
    }

    if (nickname.length > 20) {
      wx.showToast({
        title: '昵称不能超过20个字符',
        icon: 'none'
      });
      return;
    }

    const updatedUser = {
      ...this.data.userInfo,
      nickname: nickname
    };

    if (userManager.updateUserInfo(updatedUser)) {
      this.setData({ 
        userInfo: updatedUser,
        showNicknameModal: false
      });
      wx.showToast({
        title: '昵称修改成功',
        icon: 'success'
      });
    } else {
      wx.showToast({
        title: '昵称修改失败',
        icon: 'error'
      });
    }
  },

  // 取消修改昵称
  cancelNickname() {
    this.setData({ showNicknameModal: false });
  },

  // 显示简介修改弹窗
  showBioEdit() {
    this.setData({ 
      showBioModal: true,
      tempBio: this.data.userInfo.bio || ''
    });
  },

  // 简介输入
  onBioInput(e) {
    this.setData({ tempBio: e.detail.value });
  },

  // 确认修改简介
  confirmBio() {
    const bio = this.data.tempBio.trim();
    
    if (bio.length > 100) {
      wx.showToast({
        title: '简介不能超过100个字符',
        icon: 'none'
      });
      return;
    }

    const updatedUser = {
      ...this.data.userInfo,
      bio: bio
    };

    if (userManager.updateUserInfo(updatedUser)) {
      this.setData({ 
        userInfo: updatedUser,
        showBioModal: false
      });
      wx.showToast({
        title: '简介修改成功',
        icon: 'success'
      });
    } else {
      wx.showToast({
        title: '简介修改失败',
        icon: 'error'
      });
    }
  },

  // 取消修改简介
  cancelBio() {
    this.setData({ showBioModal: false });
  },

  // 显示性别选择
  showGenderSelect() {
    this.setData({ showGenderModal: true });
  },

  // 选择性别
  selectGender(e) {
    const gender = e.currentTarget.dataset.gender;
    this.setData({ tempGender: gender });
  },

  // 确认修改性别
  confirmGender() {
    const updatedUser = {
      ...this.data.userInfo,
      gender: this.data.tempGender
    };

    if (userManager.updateUserInfo(updatedUser)) {
      this.setData({ 
        userInfo: updatedUser,
        showGenderModal: false
      });
      wx.showToast({
        title: '性别修改成功',
        icon: 'success'
      });
    } else {
      wx.showToast({
        title: '性别修改失败',
        icon: 'error'
      });
    }
  },

  // 取消修改性别
  cancelGender() {
    this.setData({ showGenderModal: false });
  },

  // 切换评论通知
  toggleCommentNotify(e) {
    const commentNotify = e.detail.value;
    this.setData({
      'settings.commentNotify': commentNotify
    });
    
    if (this.saveSettings()) {
      wx.showToast({
        title: commentNotify ? '已开启评论通知' : '已关闭评论通知',
        icon: 'success'
      });
    }
  },

  // 切换点赞通知
  toggleLikeNotify(e) {
    const likeNotify = e.detail.value;
    this.setData({
      'settings.likeNotify': likeNotify
    });
    
    if (this.saveSettings()) {
      wx.showToast({
        title: likeNotify ? '已开启点赞通知' : '已关闭点赞通知',
        icon: 'success'
      });
    }
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          if (userManager.logout()) {
            wx.showToast({
              title: '已退出登录',
              icon: 'success'
            });
            
            // 跳转到登录页面
            setTimeout(() => {
              wx.reLaunch({
                url: '/pages/login/login'
              });
            }, 1500);
          } else {
            wx.showToast({
              title: '退出失败',
              icon: 'error'
            });
          }
        }
      }
    });
  }
});