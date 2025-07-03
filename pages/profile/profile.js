const userManager = require('../../utils/userManager');
const postManager = require('../../utils/postManager');
const itemManager = require('../../utils/itemManager');

Page({
  data: {
    userInfo: null,
    balance: 0.00,  // 用户余额
    formattedBalance: '0.00', //格式化
    showFeedbackModal: false,
    showRechargeModal: false,  // 充值弹窗
    feedbackContent: '',
    rechargeAmount: '',        // 充值金额
    maxLength: 200
  },

  onLoad() {
    console.log('个人中心页面加载');
    this.initializePage();
  },

  onShow() {
    console.log('个人中心页面显示');
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

  // 优化1：删除不必要的 saveUserBalance 方法
  // 因为直接使用 userManager.updateUserBalance 就够了

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

  // 充值金额输入
  onRechargeInput(e) {
    let amount = e.detail.value;
    // 只允许输入数字和小数点
    amount = amount.replace(/[^\d.]/g, '');
    // 只允许一个小数点
    const dotIndex = amount.indexOf('.');
    if (dotIndex !== -1) {
      amount = amount.substring(0, dotIndex + 1) + amount.substring(dotIndex + 1).replace(/\./g, '');
    }
    // 最多两位小数
    if (dotIndex !== -1 && amount.length - dotIndex > 3) {
      amount = amount.substring(0, dotIndex + 3);
    }
    this.setData({ rechargeAmount: amount });
  },

  // 快速充值金额选择
  selectQuickAmount(e) {
    const amount = e.currentTarget.dataset.amount;
    this.setData({ rechargeAmount: amount });
  },

  // 优化2：简化充值逻辑
  async confirmRecharge() {
    const amount = parseFloat(this.data.rechargeAmount);
    
    if (!amount || amount <= 0) {
      wx.showToast({
        title: '请输入有效金额',
        icon: 'none'
      });
      return;
    }

    if (amount > 10000) {
      wx.showToast({
        title: '单次充值不能超过10000元',
        icon: 'none'
      });
      return;
    }

    // 模拟充值过程
    wx.showLoading({
      title: '充值中...',
      mask: true
    });

    setTimeout(async () => {
      wx.hideLoading();
      
      try {
        // 使用userManager的充值方法
        const result = await userManager.updateUserBalanceById(this.data.userInfo.id,amount, 'add', `充值 ¥${amount}`);
        console.log('充值结果:', result);
        
        const newBalance = result.data.newBalance;
        
        // 更新页面显示
        this.setData({ 
          balance: newBalance,
          formattedBalance: newBalance.toFixed(2),
          showRechargeModal: false,
          rechargeAmount: ''
        });
        
        // 刷新用户信息
        const updatedUserInfo = userManager.getCurrentUser();
        this.setData({ userInfo: updatedUserInfo });
        
        wx.showToast({
          title: `充值成功！`,
          icon: 'success',
          duration: 2000
        });
        
      } catch (error) {
        console.error('充值失败:', error);
        wx.showToast({
          title: error.message || '充值失败，请重试',
          icon: 'error'
        });
      }
    }, 1500);
  },

  // 优化3：可以删除调试方法（生产环境不需要）
  // debugBalance() {
  //   // 调试用，可以删除
  // },

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

  // 优化4：修正路径名称（如果页面路径是 sold-items）
  navigateToMySold() {
    console.log('查看我卖出的');
    wx.navigateTo({
      url: '/pages/sold-items/sold-items'  // 确认路径正确
    });
  },

  // 我买到的
  navigateToMyBought() {
    console.log('查看我买到的');
    wx.navigateTo({
      url: '/pages/bought-items/bought-items'  // 确认路径正确
    });
  },

  // 我的收藏
  // navigateToFavorites() {
  //   console.log('查看我的收藏');
  //   wx.navigateTo({
  //     url: '/pages/my-favorites/my-favorites'
  //   });
  // },

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

  navigateToAbout() {
    console.log('关于开发者');

    wx.showModal({
      title: '关于开发者',
      content: '开发者：牛大果\n 感谢您的使用！',
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
