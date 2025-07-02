// pages/publish-item/publish-item.js - 发布商品页面
const userManager = require('../../utils/userManager');
const itemManager = require('../../utils/itemManager');

Page({
  data: {
    userInfo: null,
    // 商品信息
    title: '',
    description: '',
    price: '',
    category: '',
    categoryName: '',
    categoryIndex: 0,
    tempCategoryIndex: 0,
    images: [],
    maxImages: 9,
    
    // 分类选项
    categories: [
      { value: 'books', name: '教材书籍' },
      { value: 'electronics', name: '数码电子' },
      { value: 'clothing', name: '服装配饰' },
      { value: 'sports', name: '运动用品' },
      { value: 'daily', name: '生活用品' },
      { value: 'furniture', name: '家具家电' },
      { value: 'other', name: '其他' }
    ],
    tradeType: 'sell', // 默认为出售，可能的值：'sell', 'buy'
    // 价格限制
    priceConfig: {
      min: 0.01,    // 最低价格 1分钱
      max: 50000,   // 最高价格 5万元
      maxLength: 8  // 最大输入长度（包含小数点）
    },
    publishing: false
  },

  onLoad(options) {
    console.log('发布商品/求购页面加载', options);
    
    // 检查传入的类型参数
    if (options.type) {
      this.setData({
        tradeType: options.type
      });
      
      // 根据类型设置页面标题
      wx.setNavigationBarTitle({
        title: options.type === 'sell' ? '发布闲置' : '发布求购'
      });
    }

    // 检查登录状态
    if (!userManager.isLoggedIn()) {
      wx.redirectTo({
        url: '/pages/login/login'
      });
      return;
    }

    const userInfo = userManager.getCurrentUser();
    this.setData({ userInfo });
  },

  // 输入标题
  onTitleInput(e) {
    this.setData({
      title: e.detail.value
    });
  },

  // 输入描述
  onDescriptionInput(e) {
    this.setData({
      description: e.detail.value
    });
  },

  // 输入价格
  onPriceInput(e) {
    let value = e.detail.value;
    
    // 只允许数字和小数点
    value = value.replace(/[^\d.]/g, '');
    
    // 如果为空，直接设置
    if (!value) {
      this.setData({ price: '' });
      return;
    }
    
    // 防止以小数点开头
    if (value.startsWith('.')) {
      value = '0' + value;
    }
    
    // 防止多个小数点
    const dotIndex = value.indexOf('.');
    if (dotIndex !== -1) {
      // 有小数点的情况
      const beforeDot = value.substring(0, dotIndex);
      const afterDot = value.substring(dotIndex + 1);
      
      // 移除后面部分的所有小数点
      const cleanAfterDot = afterDot.replace(/\./g, '');
      
      // 限制整数部分不超过5位
      const limitedBeforeDot = beforeDot.substring(0, 5);
      
      // 限制小数部分不超过2位
      const limitedAfterDot = cleanAfterDot.substring(0, 2);
      
      value = limitedBeforeDot + '.' + limitedAfterDot;
    } else {
      // 没有小数点的情况，限制整数部分不超过5位
      value = value.substring(0, 5);
    }
    
    // 检查数值是否超过上限
    const numericValue = parseFloat(value);
    if (!isNaN(numericValue) && numericValue > this.data.priceConfig.max) {
      wx.showToast({
        title: `${this.data.tradeType === 'sell' ? '价格' : '预算'}不能超过${this.data.priceConfig.max}元`,
        icon: 'none',
        duration: 1000
      });
      // 保持原值不变
      return;
    }
    
    // 更新价格
    this.setData({
      price: value
    });
  },
  // 选择图片
  chooseImages() {
    const currentCount = this.data.images.length;
    const remainCount = this.data.maxImages - currentCount;

    if (remainCount <= 0) {
      wx.showToast({
        title: `最多只能选择${this.data.maxImages}张图片`,
        icon: 'none'
      });
      return;
    }

    wx.chooseMedia({
      count: remainCount,
      mediaType: ['image'],
      sourceType: ['album'],
      sizeType: ['compressed'],
      success: (res) => {
        const newImages = res.tempFiles.map(file => ({
          url: file.tempFilePath,
          size: file.size
        }));

        this.setData({
          images: [...this.data.images, ...newImages]
        });
      }
    });
  },

  // 预览图片
  previewImage(e) {
    const index = e.currentTarget.dataset.index;
    const urls = this.data.images.map(img => img.url);
    
    wx.previewImage({
      current: urls[index],
      urls: urls
    });
  },

  // 删除图片
  deleteImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = this.data.images;
    images.splice(index, 1);
    
    this.setData({ images });
  },

  // 发布商品
  async publishItem() {
    const { title, price, category, description, images } = this.data;
    const { priceConfig } = this.data;
  
    if (!title.trim()) {
      wx.showToast({
        title: `请输入${this.data.tradeType === 'sell' ? '商品标题' : '求购标题'}`,
        icon: 'none'
      });
      return;
    }
  
    // 价格验证 - 更严格的检查
    if (!price) {
      wx.showToast({
        title: `请输入${this.data.tradeType === 'sell' ? '价格' : '预算'}`,
        icon: 'none'
      });
      return;
    }
  
    const numericPrice = parseFloat(price);
    
    // 检查价格是否为有效数字
    if (isNaN(numericPrice)) {
      wx.showToast({
        title: `请输入有效的${this.data.tradeType === 'sell' ? '价格' : '预算'}`,
        icon: 'none'
      });
      return;
    }
  
    // 检查价格下限
    if (numericPrice < priceConfig.min) {
      wx.showToast({
        title: `${this.data.tradeType === 'sell' ? '价格' : '预算'}不能低于${priceConfig.min}元`,
        icon: 'none'
      });
      return;
    }
  
    // 检查价格上限
    if (numericPrice > priceConfig.max) {
      wx.showToast({
        title: `${this.data.tradeType === 'sell' ? '价格' : '预算'}不能超过${priceConfig.max}元`,
        icon: 'none'
      });
      return;
    }
  
    // 检查小数位数
    const decimalPlaces = (price.split('.')[1] || '').length;
    if (decimalPlaces > 2) {
      wx.showToast({
        title: '价格最多支持两位小数',
        icon: 'none'
      });
      return;
    }
  
    if (!category) {
      wx.showToast({
        title: `请选择${this.data.tradeType === 'sell' ? '商品' : '求购'}分类`,
        icon: 'none'
      });
      return;
    }
  
    if (!description.trim()) {
      wx.showToast({
        title: `请输入${this.data.tradeType === 'sell' ? '商品描述' : '需求描述'}`,
        icon: 'none'
      });
      return;
    }
  
    if (images.length === 0) {
      wx.showToast({
        title: '请至少上传一张图片',
        icon: 'none'
      });
      return;
    }
  
    // 防止重复提交
    if (this.data.publishing) {
      return;
    }
  
    // 继续发布流程...
    this.setData({ publishing: true });
  
    wx.showLoading({
      title: this.data.tradeType === 'sell' ? '发布中...' : '求购发布中...',
      mask: true
    });
  
    try {
      // 上传图片
      const imageUrls = await this.uploadImages();
      // 找到对应的分类ID
      const selectedCategory = this.data.categories.find(cat => cat.value === this.data.category);
      const categoryId = selectedCategory ? this.getCategoryIdByValue(selectedCategory.value) : 8;
      const status = this.data.tradeType === 'sell' ? 'selling' : 'seeking';
      
      // 创建商品数据
      const itemData = {
        title: title.trim(),
        description: description.trim(),
        price: numericPrice, // 使用验证过的数字
        categoryId: categoryId, 
        images: imageUrls,
        status: status,
        tradeType: this.data.tradeType,
        sellerName: this.data.userInfo.name,
        sellerNickname: this.data.userInfo.nickname,
        sellerAvatar: this.data.userInfo.avatar
      };
  
      // 使用 itemManager 发布商品
      await itemManager.publishItem(itemData, this.data.userInfo.id);
  
      wx.hideLoading();
      wx.showToast({
        title: this.data.tradeType === 'sell' ? '发布成功' : '求购发布成功',
        icon: 'success'
      });
  
      // 延迟返回，让用户看到成功提示
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/market/market'
        });
      }, 1500);
      
    } catch (error) {
      console.error('发布失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: error.message || '发布失败，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({ publishing: false });
    }
  },

  // 根据分类值获取分类ID的映射
  getCategoryIdByValue(value) {
    const categoryMap = {
      'electronics': 1,
      'daily': 2, 
      'books': 3,
      'clothing': 4,
      'sports': 5,
      'makeup': 6,
      'snacks': 7,
      'other': 8
    };
    return categoryMap[value] || 8; // 默认为"其他商品"
  },
  // 上传图片
  async uploadImages() {
    if (this.data.images.length === 0) return [];

    return new Promise((resolve) => {
      setTimeout(() => {
        const urls = this.data.images.map(img => img.url);
        resolve(urls);
      }, 1000);
    });
  },
  // 选择分类
  onCategoryChange(e) {
    const index = e.detail.value;
    const selectedCategory = this.data.categories[index];
    this.setData({
      category: selectedCategory.value,
      categoryName: selectedCategory.name,
      categoryIndex: index
    });
  },
    // 显示自定义选择器
  showCustomPicker() {
    this.setData({
      showPicker: true,
      tempCategoryIndex: this.data.categoryIndex
    });
  },

  // 隐藏选择器
  hidePicker() {
    this.setData({
      showPicker: false
    });
  },

  // 选择器值改变
  onPickerChange(e) {
    this.setData({
      tempCategoryIndex: e.detail.value[0]
    });
  },

  // 确认选择
  confirmPicker() {
    const selectedCategory = this.data.categories[this.data.tempCategoryIndex];
    this.setData({
      category: selectedCategory.value,
      categoryName: selectedCategory.name,
      categoryIndex: this.data.tempCategoryIndex,
      showPicker: false
    });
  },
});