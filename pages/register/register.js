const userManager = require('../../utils/userManager');

Page({
  data: {
    studentId: '',
    name: '',
    password: '',
    confirmPassword: '',
    loading: false,
    // 添加输入验证状态
    errors: {
      studentId: '',
      name: '',
      password: '',
      confirmPassword: ''
    }
  },

  onLoad() {
    console.log('注册页面加载');
  },

  onStudentIdInput(e) {
    const studentId = e.detail.value;
    this.setData({
      studentId: studentId,
      'errors.studentId': '' // 清除错误信息
    });
    
    // 实时验证学号格式
    this.validateStudentId(studentId);
  },

  onNameInput(e) {
    const name = e.detail.value;
    this.setData({
      name: name,
      'errors.name': ''
    });
    
    // 实时验证姓名
    this.validateName(name);
  },

  onPasswordInput(e) {
    const password = e.detail.value;
    this.setData({
      password: password,
      'errors.password': ''
    });
    
    // 实时验证密码
    this.validatePassword(password);
  },

  onConfirmPasswordInput(e) {
    const confirmPassword = e.detail.value;
    this.setData({
      confirmPassword: confirmPassword,
      'errors.confirmPassword': ''
    });
    
    // 实时验证确认密码
    this.validateConfirmPassword(confirmPassword);
  },

  // 验证学号格式
  validateStudentId(studentId) {
    if (!studentId) {
      this.setData({ 'errors.studentId': '请输入学号' });
      return false;
    }
    
    // 假设学号是8-12位数字
    const studentIdPattern = /^\d{8,12}$/;
    if (!studentIdPattern.test(studentId)) {
      this.setData({ 'errors.studentId': '学号格式不正确（8-12位数字）' });
      return false;
    }
    
    this.setData({ 'errors.studentId': '' });
    return true;
  },

  // 验证姓名
  validateName(name) {
    if (!name) {
      this.setData({ 'errors.name': '请输入姓名' });
      return false;
    }
    
    if (name.length < 2 || name.length > 10) {
      this.setData({ 'errors.name': '姓名长度应为2-10个字符' });
      return false;
    }
    
    // 检查是否包含特殊字符
    const namePattern = /^[\u4e00-\u9fa5a-zA-Z\s]+$/;
    if (!namePattern.test(name)) {
      this.setData({ 'errors.name': '姓名只能包含中文、英文和空格' });
      return false;
    }
    
    this.setData({ 'errors.name': '' });
    return true;
  },

  // 验证密码
  validatePassword(password) {
    if (!password) {
      this.setData({ 'errors.password': '请输入密码' });
      return false;
    }
    
    if (password.length < 6) {
      this.setData({ 'errors.password': '密码长度至少6位' });
      return false;
    }
    
    if (password.length > 20) {
      this.setData({ 'errors.password': '密码长度不能超过20位' });
      return false;
    }
    
    this.setData({ 'errors.password': '' });
    return true;
  },

  // 验证确认密码
  validateConfirmPassword(confirmPassword) {
    if (!confirmPassword) {
      this.setData({ 'errors.confirmPassword': '请确认密码' });
      return false;
    }
    
    if (confirmPassword !== this.data.password) {
      this.setData({ 'errors.confirmPassword': '两次密码输入不一致' });
      return false;
    }
    
    this.setData({ 'errors.confirmPassword': '' });
    return true;
  },

  // 验证所有字段
  validateAllFields() {
    const { studentId, name, password, confirmPassword } = this.data;
    
    const isStudentIdValid = this.validateStudentId(studentId);
    const isNameValid = this.validateName(name);
    const isPasswordValid = this.validatePassword(password);
    const isConfirmPasswordValid = this.validateConfirmPassword(confirmPassword);
    
    return isStudentIdValid && isNameValid && isPasswordValid && isConfirmPasswordValid;
  },

  // 修复 register.js 中的注册方法
  async register() {
    const { studentId, name, password, confirmPassword } = this.data;
    
    console.log('=== 注册调试信息 ===');
    console.log('studentId:', studentId);
    console.log('name:', name);
    console.log('password length:', password.length);
    
    // 防止重复提交
    if (this.data.loading) {
      return;
    }
    
    // 基础验证
    if (!studentId || !name || !password || !confirmPassword) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      });
      return;
    }
    
    // 去除前后空格
    const trimmedStudentId = studentId.trim();
    const trimmedName = name.trim();
    const trimmedPassword = password.trim();
    
    if (!trimmedStudentId || !trimmedName || !trimmedPassword) {
      wx.showToast({
        title: '请填写有效信息',
        icon: 'none'
      });
      return;
    }
    
    if (trimmedPassword !== confirmPassword.trim()) {
      wx.showToast({
        title: '两次密码不一致',
        icon: 'none'
      });
      return;
    }
    
    this.setData({ loading: true });
    
    try {
      console.log('开始调用注册接口...');
      
      // 传递整象
      const userData = {
        studentId: trimmedStudentId,
        name: trimmedName,
        password: trimmedPassword
      };
      
      console.log('传递给 userManager.register 的数据:', userData);
      
      const result = await userManager.register(userData);
      
      console.log('注册成功，结果:', result);
      
      wx.showToast({
        title: result.message || '注册成功',
        icon: 'success',
        duration: 2000
      });
      
      // 注册成功后返回登录页
      setTimeout(() => {
        wx.navigateBack();
      }, 2000);
      
    } catch (error) {
      console.error('注册失败:', error);
      
      // 根据不同错误类型显示不同提示
      let errorMessage = '注册失败';
      if (error.message) {
        errorMessage = error.message;
      }
      
      wx.showToast({
        title: errorMessage,
        icon: 'none',
        duration: 3000
      });
    } finally {
      this.setData({ loading: false });
    }
  },
  // 清空所有输入
  clearForm() {
    this.setData({
      studentId: '',
      name: '',
      password: '',
      confirmPassword: '',
      errors: {
        studentId: '',
        name: '',
        password: '',
        confirmPassword: ''
      }
    });
  },

  goToLogin() {
    wx.navigateBack();
  }
});