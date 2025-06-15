const userManager = require('../../utils/userManager');

Page({
  data: {
    studentId: '',
    name: '',
    password: '',
    confirmPassword: '',
    loading: false
  },

  onLoad() {
    console.log('注册页面加载');
  },

  onStudentIdInput(e) {
    this.setData({ 
      studentId: e.detail.value 
    });
  },

  onNameInput(e) {
    this.setData({ 
      name: e.detail.value 
    });
  },

  onPasswordInput(e) {
    this.setData({ 
      password: e.detail.value 
    });
  },

  onConfirmPasswordInput(e) {
    this.setData({ 
      confirmPassword: e.detail.value 
    });
  },

  async register() {
    const { studentId, name, password, confirmPassword } = this.data;
    
    console.log('开始注册:', { studentId, name });
    
    // 前端验证
    if (!studentId || !name || !password || !confirmPassword) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'error'
      });
      return;
    }

    if (password !== confirmPassword) {
      wx.showToast({
        title: '两次密码不一致',
        icon: 'error'
      });
      return;
    }

    this.setData({ loading: true });

    try {
      const result = await userManager.register(studentId, name, password);
      console.log('注册结果:', result);
      
      wx.showToast({
        title: result.message || '注册成功',
        icon: 'success',
        duration: 2000,
        success: () => {
          // 注册成功后返回登录页
          setTimeout(() => {
            wx.navigateBack();
          }, 2000);
        }
      });
      
    } catch (error) {
      console.error('注册失败:', error);
      wx.showToast({
        title: error.message || '注册失败',
        icon: 'error'
      });
    }

    this.setData({ loading: false });
  },

  goToLogin() {
    wx.navigateBack();
  }
});