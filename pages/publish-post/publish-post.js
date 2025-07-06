// pages/publish-post/publish-post.js - 修复后的发布动态页面
const userManager = require('../../utils/userManager');
const postManager = require('../../utils/postManager');
const apiConfig = require('../../utils/apiConfig');

Page({
  data: {
    userInfo: null,
    content: '',
    images: [],
    maxImages: 9,
    publishing: false
  },

  onLoad() {
    wx.setNavigationBarTitle({
      title: '发布动态'
    });

    if (!userManager.isLoggedIn()) {
      wx.redirectTo({
        url: '/pages/login/login'
      });
      return;
    }

    const userInfo = userManager.getCurrentUser();
    userInfo.avatar = apiConfig.getAvatarUrl(userInfo.avatar);
    this.setData({ userInfo });
  },

  onContentInput(e) {
    this.setData({
      content: e.detail.value
    });
  },

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

  previewImage(e) {
    const index = e.currentTarget.dataset.index;
    const urls = this.data.images.map(img => img.url);
    
    wx.previewImage({
      current: urls[index],
      urls: urls
    });
  },

  deleteImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = this.data.images;
    images.splice(index, 1);
    
    this.setData({ images });
  },

  async publishPost() {
    const content = this.data.content.trim();
    
    if (!content) {
      wx.showToast({
        title: '请输入内容',
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
      console.log('上传成功的图片URLs:', imageUrls);

      // 使用 postManager 发布动态
      await postManager.publishPost(content, imageUrls);

      wx.hideLoading();
      wx.showToast({
        title: '发布成功',
        icon: 'success'
      });

      setTimeout(() => {
        wx.switchTab({
          url: '/pages/index/index'
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

  // 🔧 修复上传图片方法
  async uploadImages() {
    if (this.data.images.length === 0) return [];
    
    wx.showLoading({ title: '图片上传中...', mask: true });
    
    try {
      const filePaths = this.data.images.map(img => img.url);
      console.log('准备上传的文件路径:', filePaths);
      
      // 🔧 修复：调用正确的上传方法
      const uploadResults = await apiConfig.uploadMultipleFiles(
        '/upload/single',
        filePaths,
        'image'
      );
      
      console.log('上传结果:', uploadResults);
      
      // 🔧 修复：确保返回正确的URL数组
      return uploadResults;
      
    } catch (error) {
      console.error('图片上传失败:', error);
      throw new Error('图片上传失败: ' + error.message);
    } finally {
      wx.hideLoading();
    }
  }
});