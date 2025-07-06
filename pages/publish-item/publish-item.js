// pages/publish-item/publish-item.js - 修复后的发布商品页面
const userManager = require('../../utils/userManager');
const itemManager = require('../../utils/itemManager');
const categoryConfig = require('../../utils/categoryConfig');
const apiConfig = require('../../utils/apiConfig');
const { priceProcess, PriceMixin, PRICE_CONFIG } = require('../../utils/priceProcess'); // 引入价格处理工具

Page({
  // 混入价格处理方法
  ...PriceMixin,

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
    categories: [],
    tradeType: 'sell', // 默认为出售，可能的值：'sell', 'buy'
    
    // 价格配置 - 使用统一的价格配置
    priceConfig: {
      min: PRICE_CONFIG.min,
      max: PRICE_CONFIG.max,
      maxDigits: PRICE_CONFIG.maxDigits,
      decimalPlaces: PRICE_CONFIG.decimalPlaces
    },
    
    publishing: false,
    showPicker: false
  },

  onLoad(options) {
    console.log('发布商品/求购页面加载', options);
    // 初始化分类数据
    this.setData({
      categories: categoryConfig.getAllCategoriesForPicker()
    });
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

  // 输入价格 - 使用统一的价格处理方法
  onPriceInput(e) {
    const result = priceProcess.formatPriceInput(e.detail.value, this.data.priceConfig.max);
    
    if (!result.isValid && result.error) {
      const priceLabel = this.data.tradeType === 'sell' ? '价格' : '预算';
      wx.showToast({
        title: result.error.replace('价格', priceLabel),
        icon: 'none',
        duration: 1000
      });
      return; // 保持原值不变
    }
    
    this.setData({
      price: result.value
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

  // 发布商品 - 使用统一的价格验证
  async publishItem() {
    const { title, price, category, description, images, tradeType } = this.data;
  
    if (!title.trim()) {
      wx.showToast({
        title: `请输入${tradeType === 'sell' ? '商品标题' : '求购标题'}`,
        icon: 'none'
      });
      return;
    }
  
    // 使用统一的价格验证方法
    const priceLabel = tradeType === 'sell' ? '价格' : '预算';
    if (!this.validatePrice(price, tradeType)) {
      return; // validatePrice 方法已经显示了错误提示
    }
  
    if (!category) {
      wx.showToast({
        title: `请选择${tradeType === 'sell' ? '商品' : '求购'}分类`,
        icon: 'none'
      });
      return;
    }
  
    if (!description.trim()) {
      wx.showToast({
        title: `请输入${tradeType === 'sell' ? '商品描述' : '需求描述'}`,
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
  
    this.setData({ publishing: true });
  
    wx.showLoading({
      title: tradeType === 'sell' ? '发布中...' : '求购发布中...',
      mask: true
    });
  
    try {
      // 上传图片并获取真实URL
      const imageUrls = await this.uploadImages();
      console.log('上传成功的图片URLs:', imageUrls);
      
      // 获取分类ID，确保与后端一致
      const categoryId = categoryConfig.getCategoryIdByValue ? 
        categoryConfig.getCategoryIdByValue(category) : 
        category; // 如果没有这个方法，直接使用category值
      
      console.log('选择的分类ID:', categoryId, '分类值:', category);
      
      // 创建符合后端期望的商品数据
      const itemData = {
        title: title.trim(),
        description: description.trim(),
        price: parseFloat(price), // 确保为数字类型
        images: imageUrls, // 已上传的图片URL数组
        categoryId: categoryId, // 确保字段名与后端一致
        status: tradeType === 'sell' ? 'selling' : 'seeking',
        tradeType: tradeType
      };
      
      console.log('发布商品数据:', itemData);
  
      // 调用 itemManager.publishItem
      const result = await itemManager.publishItem(itemData);
      console.log('发布结果:', result);
  
      wx.hideLoading();
      wx.showToast({
        title: tradeType === 'sell' ? '发布成功' : '求购发布成功',
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

  // 上传图片方法 - 与动态发布保持一致
  async uploadImages() {
    if (this.data.images.length === 0) return [];
    
    wx.showLoading({ title: '图片上传中...', mask: true });
  
    try {
      const filePaths = this.data.images.map(img => img.url);
      console.log('准备上传的文件路径:', filePaths);
      
      // 使用与动态发布相同的上传逻辑
      const uploadResults = await apiConfig.uploadMultipleFiles(
        '/upload/single',
        filePaths,
        'image'
      );
      
      console.log('上传结果:', uploadResults);
      
      // 直接返回URL数组，与动态发布保持一致
      return uploadResults;
      
    } catch (error) {
      console.error('图片上传失败:', error);
      throw new Error('图片上传失败: ' + error.message);
    } finally {
      wx.hideLoading();
    }
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

  // 获取价格显示文本（用于界面显示）
  getPriceDisplayText() {
    const { price, tradeType } = this.data;
    if (!price) return '';
    
    const formattedPrice = priceProcess.formatPriceDisplay(price);
    return formattedPrice;
  },

  // 获取价格范围提示文本
  getPriceRangeText() {
    const { min, max } = this.data.priceConfig;
    return `价格范围：¥${min} - ¥${max.toLocaleString()}`;
  }
});