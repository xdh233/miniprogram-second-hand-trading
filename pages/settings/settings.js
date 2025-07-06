// pages/settings/settings.js - 设置页面 (数据库版本)
const userManager = require('../../utils/userManager');
const apiConfig = require('../../utils/apiConfig');

Page({
  data: {
    userInfo: null,
    avatarUrl: '',
    settings: {
      commentNotify: true,  // 评论通知
      likeNotify: true,     // 点赞通知
    },
    tempNickname: '',      // 临时存储昵称
    tempBio: '',           // 临时存储简介
    tempGender: '',        // 临时存储性别
    showNicknameModal: false,
    showBioModal: false,
    showGenderModal: false,
    nicknameError: '',     // 昵称错误提示
    isLoading: false,      // 加载状态
    isSettingsLoading: false // 设置加载状态
  },

  onLoad() {
    console.log('设置页面加载');
    this.checkLoginStatus();
    this.loadUserSettings();
    this.refreshUserInfo(); // 刷新
  },
  
  // 刷新
  async refreshUserInfo() {
    if (!this.data.userInfo) return;
    
    try {
      const response = await apiConfig.get(`/users/${this.data.userInfo.id}`);
      
      if (response.success) {
        const latestUserInfo = response.data;
        
        console.log('从服务器获取的最新用户信息:', latestUserInfo);
        
        // 更新本地缓存
        userManager.updateUserInfo(latestUserInfo);
        
        // 更新页面显示
        this.setData({
          userInfo: latestUserInfo,
          avatarUrl: apiConfig.getAvatarUrl(latestUserInfo.avatar),
          tempNickname: latestUserInfo.nickname || latestUserInfo.name,
          tempBio: latestUserInfo.bio || '',
          tempGender: latestUserInfo.gender || '未设置'
        });
      }
    } catch (error) {
      console.error('获取最新用户信息失败:', error);
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
    this.setData({ 
      userInfo,
      avatarUrl: apiConfig.getAvatarUrl(userInfo.avatar),
      tempNickname: userInfo.nickname || userInfo.name,
      tempBio: userInfo.bio || '',
      tempGender: userInfo.gender || '未设置'
    });
  },

  // 从服务器加载用户设置
  async loadUserSettings() {
    if (!this.data.userInfo) return;
    
    this.setData({ isSettingsLoading: true });
    
    try {
      const response = await apiConfig.get(`/users/${this.data.userInfo.id}/settings`);
      
      if (response.success) {
        this.setData({ 
          settings: response.data,
          isSettingsLoading: false
        });
      } else {
        throw new Error(response.message || '获取设置失败');
      }
    } catch (error) {
      console.error('加载用户设置失败:', error);
      this.setData({ isSettingsLoading: false });
      
      // 如果网络失败，尝试使用本地缓存
      this.loadLocalSettings();
      
      wx.showToast({
        title: '设置加载失败，使用本地缓存',
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 从本地存储加载设置 (作为备用方案)
  loadLocalSettings() {
    try {
      const settings = wx.getStorageSync('user_settings') || {
        commentNotify: true,
        likeNotify: true,
      };
      this.setData({ settings });
    } catch (error) {
      console.error('加载本地设置失败:', error);
    }
  },

  // 保存设置到服务器
  async saveSettingsToServer(newSettings) {
    if (!this.data.userInfo) return false;
    
    try {
      const response = await apiConfig.put(`/users/${this.data.userInfo.id}/settings`, newSettings);
      
      if (response.success) {
        // 同时保存到本地作为缓存
        wx.setStorageSync('user_settings', newSettings);
        return true;
      } else {
        throw new Error(response.message || '保存设置失败');
      }
    } catch (error) {
      console.error('保存设置到服务器失败:', error);
      
      // 如果服务器失败，至少保存到本地
      try {
        wx.setStorageSync('user_settings', newSettings);
        wx.showToast({
          title: '网络异常，已保存到本地',
          icon: 'none',
          duration: 2000
        });
      } catch (localError) {
        console.error('保存到本地也失败:', localError);
        return false;
      }
      
      return false;
    }
  },

  // 更新单个设置项 (优化网络请求)
  async updateSingleSetting(settingType, value) {
    if (!this.data.userInfo) return false;
    
    try {
      // 转换前端字段名到后端字段名
      const fieldMapping = {
        'commentNotify': 'comment_notify',
        'likeNotify': 'like_notify', 
      };
      
      const dbFieldName = fieldMapping[settingType];
      if (!dbFieldName) {
        throw new Error('无效的设置类型');
      }
      
      const response = await apiConfig.request(`/users/${this.data.userInfo.id}/settings/${dbFieldName}`, {
        method: 'PATCH',
        data: { value }
      });
      
      if (response.success) {
        // 更新本地状态
        const newSettings = {
          ...this.data.settings,
          [settingType]: value
        };
        
        this.setData({ settings: newSettings });
        
        // 同时保存到本地缓存
        wx.setStorageSync('user_settings', newSettings);
        return true;
      } else {
        throw new Error(response.message || '更新设置失败');
      }
    } catch (error) {
      console.error('更新单个设置失败:', error);
      return false;
    }
  },

  // 修改头像
  async changeAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      camera: 'back',
      success: async (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        
        // 显示上传进度
        wx.showLoading({
          title: '上传中...',
          mask: true
        });
        
        try {
          // 使用现有的上传接口
          const uploadResult = await apiConfig.uploadFile('/upload/single', tempFilePath, 'image');
          
          if (uploadResult && uploadResult.url) {
            // 更新用户头像信息到数据库
            const updateResult = await apiConfig.put(`/users/${this.data.userInfo.id}`, {
              avatar: uploadResult.url
            });
            
            if (updateResult.success) {
              // 更新本地用户信息
              const updatedUser = {
                ...this.data.userInfo,
                avatar: uploadResult.url
              };
              
              userManager.updateUserInfo(updatedUser);
              this.setData({ userInfo: updatedUser });
              
              wx.hideLoading();
              wx.showToast({
                title: '头像修改成功',
                icon: 'success'
              });
            } else {
              throw new Error(updateResult.message || '更新头像失败');
            }
          } else {
            throw new Error('上传失败');
          }
        } catch (error) {
          console.error('上传头像失败:', error);
          wx.hideLoading();
          wx.showToast({
            title: error.message || '头像修改失败',
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
      tempNickname: this.data.userInfo.nickname || this.data.userInfo.name,
      nicknameError: ''
    });
  },

  // 昵称输入
  onNicknameInput(e) {
    const nickname = e.detail.value.trim();
    this.setData({ tempNickname: nickname });
    
    // 实时检查昵称 (这里需要根据你的userManager实现调整)
    if (nickname && nickname !== (this.data.userInfo.nickname || this.data.userInfo.name)) {
      // TODO: 调用后端API检查昵称是否存在
      // 暂时使用本地检查
      if (userManager.isNicknameExist && userManager.isNicknameExist(nickname, this.data.userInfo.id)) {
        this.setData({ nicknameError: '昵称已被使用' });
      } else {
        this.setData({ nicknameError: '' });
      }
    } else {
      this.setData({ nicknameError: '' });
    }
  },

  // 确认修改昵称
  async confirmNickname() {
    const nickname = this.data.tempNickname.trim();
    
    // 如果有错误提示，不允许提交
    if (this.data.nicknameError) {
      return;
    }
    
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

    this.setData({ isLoading: true });

    try {
      const result = await userManager.updateNickname(nickname);
      
      if (result.code === 200) {
        const updatedUser = {
          ...this.data.userInfo,
          nickname: nickname
        };
        
        this.setData({ 
          userInfo: updatedUser,
          showNicknameModal: false,
          nicknameError: '',
          isLoading: false
        });
        userManager.updateUserInfo(updatedUser);
        wx.showToast({
          title: '昵称修改成功',
          icon: 'success'
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('修改昵称失败:', error);
      this.setData({ isLoading: false });
      
      wx.showToast({
        title: error.message || '昵称修改失败',
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 取消修改昵称
  cancelNickname() {
    this.setData({ 
      showNicknameModal: false,
      nicknameError: ''
    });
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
  async confirmBio() {
    const bio = this.data.tempBio.trim();
    
    if (bio.length > 50) {
      wx.showToast({
        title: '简介不能超过50个字符',
        icon: 'none'
      });
      return;
    }

    this.setData({ isLoading: true });

    try {
      const result = await userManager.updateBio(bio);
      
      if (result.code === 200) {
        const updatedUser = {
          ...this.data.userInfo,
          bio: bio
        };
        userManager.updateUserInfo(updatedUser);
        this.setData({ 
          userInfo: updatedUser,
          showBioModal: false,
          isLoading: false
        });
        
        wx.showToast({
          title: '简介修改成功',
          icon: 'success'
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('修改简介失败:', error);
      this.setData({ isLoading: false });
      
      wx.showToast({
        title: error.message || '简介修改失败',
        icon: 'none',
        duration: 2000
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
    console.log('选择性别:', gender);
    this.setData({ tempGender: gender });
  },

  // 确认修改性别
  async confirmGender() {
    this.setData({ isLoading: true });

    try {
      const result = await userManager.updateUserInfo({ gender: this.data.tempGender });
      
      if (result.code === 200) {
        const updatedUser = {
          ...this.data.userInfo,
          gender: this.data.tempGender
        };
        userManager.updateUserInfo(updatedUser);
        this.setData({ 
          userInfo: updatedUser,
          showGenderModal: false,
          isLoading: false
        });
        
        wx.showToast({
          title: '性别修改成功',
          icon: 'success'
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('修改性别失败:', error);
      this.setData({ isLoading: false });
      
      wx.showToast({
        title: error.message || '性别修改失败',
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 取消修改性别
  cancelGender() {
    this.setData({ showGenderModal: false });
  },

  // 切换评论通知
  async toggleCommentNotify(e) {
    const commentNotify = e.detail.value;
    
    const success = await this.updateSingleSetting('commentNotify', commentNotify);
    
    if (success) {
      wx.showToast({
        title: commentNotify ? '已开启评论通知' : '已关闭评论通知',
        icon: 'success'
      });
    } else {
      // 恢复开关状态
      this.setData({
        'settings.commentNotify': !commentNotify
      });
      
      wx.showToast({
        title: '设置失败，请重试',
        icon: 'error'
      });
    }
  },

  // 切换点赞通知
  async toggleLikeNotify(e) {
    const likeNotify = e.detail.value;
    
    const success = await this.updateSingleSetting('likeNotify', likeNotify);
    
    if (success) {
      wx.showToast({
        title: likeNotify ? '已开启点赞通知' : '已关闭点赞通知',
        icon: 'success'
      });
    } else {
      // 恢复开关状态
      this.setData({
        'settings.likeNotify': !likeNotify
      });
      
      wx.showToast({
        title: '设置失败，请重试',
        icon: 'error'
      });
    }
  },
  
  // 阻止事件冒泡
  stopPropagation() {
    // 什么都不做，只是阻止事件冒泡
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