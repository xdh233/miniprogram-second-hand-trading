// pages/publish-post/publish-post.js - 发布动态页面
const userManager = require('../../utils/userManager');
const postManager = require('../../utils/postManager');

Page({
  data: {
    userInfo: null,
    content: '',
    images: [],
    maxImages: 9,
    publishing: false
  },

  onLoad() {
    // 设置导航栏标题
    wx.setNavigationBarTitle({
      title: '发布动态'
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

  // 输入内容变化
  onContentInput(e) {
    this.setData({
      content: e.detail.value
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
      sourceType: ['album'], // 只保留相册选择，删除拍照功能
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

  // 发布动态
  async publishPost() {
    const content = this.data.content.trim();
    
    if (!content) {
      wx.showToast({
        title: '请输入内容或选择图片',
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

      // 使用 postManager 发布动态
      await postManager.publishPost(content, imageUrls);

      wx.hideLoading();
      wx.showToast({
        title: '发布成功',
        icon: 'success'
      });

      // 延迟返回，让用户看到成功提示
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/index/index'
        });
      }, 1500);

// 改为
setTimeout(() => {
  wx.switchTab({
    url: '/pages/moments/moments'  // 替换为你的动态页面路径
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

  // 上传图片
  async uploadImages() {
    if (this.data.images.length === 0) return [];

    // 模拟上传过程
    return new Promise((resolve) => {
      setTimeout(() => {
        // 实际项目中这里应该调用上传API
        const urls = this.data.images.map(img => img.url);
        resolve(urls);
      }, 1000);
    });
  }
});