const userManager = require('../../utils/userManager');

Page({
  data: {
    studentId: '',
    password: '',
    loading: false
  },

  onLoad() {
    // 检查是否已登录
    if (userManager.isLoggedIn()) {
      wx.switchTab({
        url: '/pages/index/index'
      });
    }
  },

  onStudentIdInput(e) {
    this.setData({
      studentId: e.detail.value
    });
  },

  onPasswordInput(e) {
    this.setData({
      password: e.detail.value
    });
  },

  async login() {
    const { studentId, password } = this.data;
    
    console.log('=== 开始登录 ===');
    console.log('输入的学号:', studentId);
    console.log('输入的密码:', password);
    
    if (!studentId || !password) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'error'
      });
      return;
    }
  
    this.setData({ loading: true });
  
    try {
      console.log('调用 userManager.login...');
      const result = await userManager.login(studentId, password);
      console.log('登录结果:', result);
      
      if (result.code === 200) {
        console.log('登录成功，准备跳转');
        wx.showToast({
          title: '登录成功',
          icon: 'success',
          duration: 1500
        });

        // 延迟跳转，确保toast显示
        setTimeout(() => {
          // 使用 switchTab 跳转到 tab 页面
          wx.switchTab({
            url: '/pages/index/index',
            success: () => {
              console.log('switchTab 成功');
            },
            fail: (error) => {
              console.log('switchTab 失败，尝试 reLaunch:', error);
              // 如果 switchTab 失败，使用 reLaunch
              wx.reLaunch({
                url: '/pages/index/index',
                success: () => {
                  console.log('reLaunch 成功');
                },
                fail: (error2) => {
                  console.log('reLaunch 也失败:', error2);
                }
              });
            }
          });
        }, 1500);

      } else {
        console.log('登录失败:', result.message);
        wx.showToast({
          title: result.message || '登录失败',
          icon: 'error'
        });
      }
      
    } catch (error) {
      console.error('登录异常:', error);
      wx.showToast({
        title: error.message || '登录失败',
        icon: 'error'
      });
    }
  
    this.setData({ loading: false });
  },

  goToRegister() {
    wx.navigateTo({
      url: '/pages/register/register'
    });
  },

  // 调试功能：查看所有用户
  debugShowUsers() {
    const users = userManager.debugGetAllUsers();
    console.log('所有用户:', users);
    wx.showModal({
      title: '调试信息',
      content: `共有 ${users.length} 个用户\n测试账号: 2021001001, 密码: 123456`,
      showCancel: false
    });
  }
});