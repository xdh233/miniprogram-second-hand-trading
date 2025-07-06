const userManager = require('../../utils/userManager');
const postManager = require('../../utils/postManager');
const itemManager = require('../../utils/itemManager');
const apiConfig = require('../../utils/apiConfig');
const { priceProcess, PriceMixin, PRICE_CONFIG } = require('../../utils/priceProcess'); // 引入价格处理工具

Page({
  // 混入价格处理方法
  ...PriceMixin,

  data: {
    userInfo: null,
    balance: 0.00,  // 用户余额
    formattedBalance: '0.00', // 格式化
    showFeedbackModal: false,
    showRechargeModal: false,  // 充值弹窗
    feedbackContent: '',
    rechargeAmount: '',        // 充值金额
    maxLength: 200,
    
    // 充值配置
    rechargeConfig: {
      min: 0.01,      // 最小充值金额 1分钱
      max: 10000,     // 最大充值金额 1万元
      quickAmounts: [10, 20, 50, 100, 200, 500] // 快速充值金额选项
    }
  },

  onLoad() {
    console.log('个人中心页面加载');
    this.initializePage();
  },

  // 在 onShow() 方法中添加刷新用户信息的逻辑
  onShow() {
    console.log('个人中心页面显示');
    // 如果已登录，尝试从服务器刷新用户信息
    if (userManager.isLoggedIn()) {
      this.refreshUserInfo();
    } else {
      this.initializePage();
    }
  },

  // 刷新用户信息
  async refreshUserInfo() {
    try {
      const currentUser = userManager.getCurrentUser();
      if (currentUser && currentUser.id) {
        console.log('正在从服务器获取最新用户信息...');
        
        // 从服务器获取最新用户信息
        const apiConfig = require('../../utils/apiConfig');
        const response = await apiConfig.get(`/users/${currentUser.id}`);
        
        if (response.success) {
          const latestUserInfo = response.data;
          console.log('从服务器获取的最新用户信息:', latestUserInfo);
          
          // 更新本地缓存
          userManager.updateUserInfo(latestUserInfo);
          
          // 更新页面显示
          this.setData({ 
            userInfo: latestUserInfo,
            avatarUrl: apiConfig.getAvatarUrl(latestUserInfo.avatar)
          }, () => {
            // 在用户信息更新后重新加载余额
            this.loadUserBalance();
          });
          
          return;
        }
      }
    } catch (error) {
      console.error('从服务器刷新用户信息失败:', error);
    }
    
    // 如果服务器获取失败，使用本地缓存
    this.initializePage();
  },

  // 统一初始化方法
  initializePage() {
    if (!userManager.isLoggedIn()) {
      wx.redirectTo({
        url: '/pages/login/login'
      });
      return;
    }

    const userInfo = userManager.getCurrentUser();
    console.log('获取到的用户信息:', userInfo);
    
    this.setData({ userInfo }, () => {
      // 在用户信息设置完成后加载余额
      this.loadUserBalance();
    });
  },

  // 加载用户余额
  loadUserBalance() {
    try {
      const userInfo = this.data.userInfo;
      console.log('loadUserBalance - userInfo:', userInfo);
      
      if (!userInfo || !userInfo.id) {
        console.log('用户信息不完整，无法加载余额');
        this.setData({ balance: 0, formattedBalance: '0.00' });
        return;
      }
      
      // 确保余额是数字类型
      let userBalance = userInfo.balance || 0;
      
      // 类型转换确保是数字
      if (typeof userBalance === 'string') {
        userBalance = parseFloat(userBalance) || 0;
      }
      
      console.log('原始余额:', userInfo.balance, '类型:', typeof userInfo.balance);
      console.log('转换后余额:', userBalance, '类型:', typeof userBalance);
      
      this.setData({ 
        balance: userBalance,
        formattedBalance: userBalance.toFixed(2)
      }, () => {
        console.log('设置后的页面余额:', this.data.balance, '类型:', typeof this.data.balance);
      });
      
    } catch (error) {
      console.error('加载余额失败:', error);
      this.setData({ balance: 0, formattedBalance: '0.00' });
    }
  },

  // 显示余额详情和充值选项（直接进入充值弹窗）
  showBalanceDetail() {
    console.log('点击余额详情，当前余额:', this.data.balance);
    this.setData({ 
      showRechargeModal: true,
      rechargeAmount: ''
    });
  },

  // 显示充值弹窗
  showRechargeDialog() {
    this.setData({ 
      showRechargeModal: true,
      rechargeAmount: ''
    });
  },

  // 充值金额输入 - 使用统一的价格处理方法
  onRechargeInput(e) {
    const result = priceProcess.formatPriceInput(e.detail.value, this.data.rechargeConfig.max);
    
    if (!result.isValid && result.error) {
      wx.showToast({
        title: result.error.replace('价格', '充值金额'),
        icon: 'none',
        duration: 1000
      });
      return; // 保持原值不变
    }
    
    this.setData({
      rechargeAmount: result.value
    });
  },

  // 快速充值金额选择
  selectQuickAmount(e) {
    const amount = e.currentTarget.dataset.amount;
    this.setData({ rechargeAmount: amount.toString() });
  },

  // 验证充值金额
  validateRechargeAmount(amount) {
    const { rechargeConfig } = this.data;
    
    if (!amount || amount === '') {
      wx.showToast({
        title: '请输入充值金额',
        icon: 'none'
      });
      return false;
    }

    const numericAmount = parseFloat(amount);
    
    if (isNaN(numericAmount)) {
      wx.showToast({
        title: '请输入有效的充值金额',
        icon: 'none'
      });
      return false;
    }

    if (numericAmount < rechargeConfig.min) {
      wx.showToast({
        title: `充值金额不能低于¥${rechargeConfig.min}`,
        icon: 'none'
      });
      return false;
    }

    if (numericAmount > rechargeConfig.max) {
      wx.showToast({
        title: `单次充值不能超过¥${rechargeConfig.max.toLocaleString()}`,
        icon: 'none'
      });
      return false;
    }

    // 检查小数位数
    const decimalPlaces = (amount.split('.')[1] || '').length;
    if (decimalPlaces > 2) {
      wx.showToast({
        title: '充值金额最多支持两位小数',
        icon: 'none'
      });
      return false;
    }

    return true;
  },

  // 优化后的充值逻辑
  async confirmRecharge() {
    const { rechargeAmount } = this.data;
    
    // 使用统一的验证方法
    if (!this.validateRechargeAmount(rechargeAmount)) {
      return;
    }

    const amount = parseFloat(rechargeAmount);

    // 显示确认弹窗
    const confirmResult = await new Promise((resolve) => {
      wx.showModal({
        title: '确认充值',
        content: `确定要充值 ¥${amount.toFixed(2)} 吗？`,
        success: (res) => {
          resolve(res.confirm);
        },
        fail: () => {
          resolve(false);
        }
      });
    });

    if (!confirmResult) {
      return;
    }

    // 显示加载中
    wx.showLoading({
      title: '充值中...',
      mask: true
    });

    try {
      // 使用userManager的充值方法
      const result = await userManager.updateUserBalanceById(
        this.data.userInfo.id, 
        amount, 
        'add', 
        `充值 ¥${amount.toFixed(2)}`
      );
      
      console.log('充值结果:', result);
      
      // 从正确的字段获取余额
      let newBalance;
      if (result.data && typeof result.data.balance !== 'undefined') {
        newBalance = result.data.balance;
      } else if (result.data && typeof result.data.newBalance !== 'undefined') {
        newBalance = result.data.newBalance;
      } else {
        // 如果没有返回余额，从当前余额计算
        newBalance = this.data.balance + amount;
      }
      
      // 确保newBalance是数字类型
      newBalance = parseFloat(newBalance) || 0;
      
      console.log('新余额:', newBalance, '类型:', typeof newBalance);
      
      // 更新页面显示
      this.setData({ 
        balance: newBalance,
        formattedBalance: newBalance.toFixed(2),
        showRechargeModal: false,
        rechargeAmount: ''
      });
      
      // 更新本地存储的用户信息
      const currentUser = userManager.getCurrentUser();
      if (currentUser) {
        currentUser.balance = newBalance;
        wx.setStorageSync('current_user', currentUser);
        this.setData({ userInfo: currentUser });
      }
      
      wx.hideLoading();
      wx.showToast({
        title: `充值成功！余额：¥${newBalance.toFixed(2)}`,
        icon: 'success',
        duration: 2000
      });
      
    } catch (error) {
      wx.hideLoading();
      console.error('充值失败:', error);
      
      // 更详细的错误处理
      let errorMessage = '充值失败，请重试';
      if (error.message) {
        if (error.message.includes('404')) {
          errorMessage = '接口不存在，请联系管理员';
        } else if (error.message.includes('403')) {
          errorMessage = '权限不足';
        } else if (error.message.includes('401')) {
          errorMessage = '请重新登录';
        } else {
          errorMessage = error.message;
        }
      }
      
      wx.showToast({
        title: errorMessage,
        icon: 'error',
        duration: 3000
      });
    }
  },

  // 取消充值
  cancelRecharge() {
    this.setData({ 
      showRechargeModal: false,
      rechargeAmount: ''
    });
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 什么都不做，只是阻止事件冒泡
  },

  // 设置
  navigateToSettings() {
    console.log('打开设置');
    wx.navigateTo({
      url: '/pages/settings/settings'
    });
  },

  // 个人空间
  navigateToMyPublished() {
    console.log('查看个人空间');
    const currentUser = userManager.getCurrentUser();

    if (!currentUser) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    const userId = currentUser.id;
    wx.navigateTo({
      url: `/pages/user-profile/user-profile?userId=${userId}`
    });
  },

  // 我卖出的
  navigateToMySold() {
    console.log('查看我卖出的');
    wx.navigateTo({
      url: '/pages/sold-items/sold-items'  // 使用正确的路径
    });
  },

  // 我买到的
  navigateToMyBought() {
    console.log('查看我买到的');
    wx.navigateTo({
      url: '/pages/bought-items/bought-items'  // 使用正确的路径
    });
  },

  // 意见反馈方法
  navigateToFeedback() {
    console.log('意见反馈');
    this.setData({
      showFeedbackModal: true,
      feedbackContent: '' // 清空之前的内容
    });
  },

  // 隐藏反馈弹窗
  hideFeedbackModal() {
    this.setData({
      showFeedbackModal: false,
      feedbackContent: ''
    });
  },

  // 输入框内容变化
  onFeedbackInput(e) {
    this.setData({
      feedbackContent: e.detail.value
    });
  },

  // 提交反馈
  submitFeedback() {
    if (!this.data.feedbackContent.trim()) {
      wx.showToast({
        title: '请输入反馈内容',
        icon: 'none'
      });
      return;
    }

    console.log('反馈内容：', this.data.feedbackContent);

    wx.showToast({
      title: '提交成功，感谢您的反馈！',
      icon: 'success'
    });

    this.hideFeedbackModal();
  },

  // 关于开发者
  navigateToAbout() {
    console.log('关于开发者');

    wx.showModal({
      title: '关于开发者',
      content: '开发者：牛大果\n 感谢您的使用！',
      showCancel: false,
      confirmText: '知道了'
    });
  },

  // 获取充值金额显示文本
  getRechargeAmountDisplay() {
    const { rechargeAmount } = this.data;
    if (!rechargeAmount) return '';
    
    return priceProcess.formatPriceDisplay(rechargeAmount);
  },

  // 退出登录
  logout() {
    try {
      console.log('开始退出登录...');
      
      // 🔧 1. 停止所有轮询和定时器
      try {
        const chatManager = require('./chatManager');
        if (chatManager && typeof chatManager.cleanup === 'function') {
          console.log('清理聊天管理器');
          chatManager.cleanup();
        }
      } catch (e) {
        console.log('清理聊天管理器失败:', e);
      }
      
      // 🔧 2. 清理API配置状态 - 这会停止轮询并清理状态
      console.log('清理API配置');
      apiConfig.clearToken();
      
      // 🔧 3. 清理本地存储
      console.log('清理本地存储');
      wx.removeStorageSync(this.CURRENT_USER_KEY);
      wx.removeStorageSync('userToken');
      wx.removeStorageSync('currentUser');
      wx.removeStorageSync('userInfo');
      
      // 🔧 4. 清理TabBar角标
      console.log('清理TabBar角标');
      try {
        wx.removeTabBarBadge({ 
          index: 3,
          success: () => console.log('清理消息角标成功'),
          fail: (e) => console.log('清理消息角标失败:', e)
        });
      } catch (e) {
        console.log('清理角标异常:', e);
      }
      
      console.log('退出登录完成');
      return true;
      
    } catch (error) {
      console.error('退出登录失败:', error);
      
      // 即使出错也要清理基本状态
      try {
        apiConfig.clearToken();
        wx.removeStorageSync(this.CURRENT_USER_KEY);
        wx.removeStorageSync('userToken');
      } catch (e) {
        console.error('强制清理失败:', e);
      }
      
      return false;
    }
  }
});