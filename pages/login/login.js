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
      
      // 【修改这里】现在userManager.login成功时直接返回结果，不需要检查code
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

    } catch (error) {
      // 【修改这里】错误处理更加具体
      console.error('登录异常:', error);
      
      let errorMessage = '登录失败';
      
      // 根据错误类型显示不同的提示
      if (error.code === 401) {
        errorMessage = '学号或密码错误';
      } else if (error.code === 400) {
        errorMessage = error.message || '请填写完整信息';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      wx.showToast({
        title: errorMessage,
        icon: 'error',
        duration: 2000
      });
    }

    this.setData({ loading: false });
  },

  goToRegister() {
    wx.navigateTo({
      url: '/pages/register/register'
    });
  },

  // 【修改调试功能】现在测试后端API连接
  async debugTestAPI() {
    try {
      // 测试API连接
      wx.showLoading({ title: '测试连接中...' });
      
      const apiConfig = require('../../utils/apiConfig');
      const result = await apiConfig.get('/posts');
      
      wx.hideLoading();
      wx.showModal({
        title: '连接测试',
        content: `API连接正常！\n获取到 ${result.posts?.length || 0} 条动态`,
        showCancel: false
      });
    } catch (error) {
      wx.hideLoading();
      wx.showModal({
        title: '连接测试失败',
        content: `错误: ${error.message}\n请检查网络和后端服务器`,
        showCancel: false
      });
    }
  }
});