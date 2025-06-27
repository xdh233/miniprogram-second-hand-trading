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
    originalPrice: '',
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
    
    publishing: false
  },

  onLoad() {
    // 设置导航栏标题
    wx.setNavigationBarTitle({
      title: '发布商品'
    });

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
    // 保证只有一个小数点
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }
    // 小数点后最多两位
    if (parts[1] && parts[1].length > 2) {
      value = parts[0] + '.' + parts[1].substring(0, 2);
    }
    
    this.setData({
      price: value
    });
  },

  // 输入原价
  onOriginalPriceInput(e) {
    let value = e.detail.value;
    value = value.replace(/[^\d.]/g, '');
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }
    if (parts[1] && parts[1].length > 2) {
      value = parts[0] + '.' + parts[1].substring(0, 2);
    }
    
    this.setData({
      originalPrice: value
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

    if (!title.trim()) {
      wx.showToast({
        title: '请输入商品标题',
        icon: 'none'
      });
      return;
    }

    if (!price || parseFloat(price) <= 0) {
      wx.showToast({
        title: '请输入正确的价格',
        icon: 'none'
      });
      return;
    }

    if (!category) {
      wx.showToast({
        title: '请选择商品分类',
        icon: 'none'
      });
      return;
    }

    if (!description.trim()) {
      wx.showToast({
        title: '请输入商品描述',
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

    if (this.data.publishing) return;

    this.setData({ publishing: true });

    wx.showLoading({
      title: '发布中...',
      mask: true
    });

    try {
      // 上传图片
      const imageUrls = await this.uploadImages();
      // 找到对应的分类ID
      const selectedCategory = this.data.categories.find(cat => cat.value === this.data.category);
      const categoryId = selectedCategory ? this.getCategoryIdByValue(selectedCategory.value) : 1;

      // 创建商品数据
      const itemData = {
        title: title.trim(),
        description: description.trim(),
        price: parseFloat(price),
        originalPrice: this.data.originalPrice ? parseFloat(this.data.originalPrice) : null,
        categoryId: categoryId, 
        images: imageUrls,
        sellerName: this.data.userInfo.name,
        sellerNickname: this.data.userInfo.nickname,
        sellerAvatar: this.data.userInfo.avatar
      };

      // 使用 itemManager 发布商品
      await itemManager.publishItem(itemData, this.data.userInfo.id);

      wx.hideLoading();
      wx.showToast({
        title: '发布成功',
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