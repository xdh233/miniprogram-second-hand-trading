// pages/item-detail/item-detail.js
const userManager = require('../../utils/userManager');

Page({
  data: {
    itemId: null,
    item: null,
    seller: null,
    currentUser: null,
    isSeller: false,
    isLiked: false,
    currentImageIndex: 0,
    relatedItems: [],
    loading: true,
    error: null,
    showBuyModal: false,
    contactInfo: '',
    buyMessage: ''
  },

  onLoad(options) {
    console.log('商品详情页加载，参数:', options);
    
    if (options.id) {
      this.setData({ itemId: options.id });
      this.loadItemDetail();
    } else {
      this.setData({ 
        loading: false, 
        error: '商品ID不存在' 
      });
    }

    // 获取当前用户信息
    const currentUser = userManager.getCurrentUser();
    if (currentUser) {
      this.setData({ currentUser });
    }
  },

  onShow() {
    // 页面显示时刷新数据
    if (this.data.itemId) {
      this.loadItemDetail();
    }
  },

  // 加载商品详情
  loadItemDetail() {
    this.setData({ loading: true, error: null });

    // 模拟API调用
    setTimeout(() => {
      try {
        const item = this.getMockItemData(this.data.itemId);
        if (!item) {
          this.setData({ 
            loading: false, 
            error: '商品不存在或已下架' 
          });
          return;
        }

        const seller = this.getMockSellerData(item.sellerId);
        const isSeller = this.data.currentUser && this.data.currentUser.id === item.sellerId;
        const isLiked = this.checkIfLiked(this.data.itemId);
        const relatedItems = this.getMockRelatedItems(item.categoryId, this.data.itemId);

        // 增加浏览次数
        this.incrementViewCount(this.data.itemId);

        this.setData({
          item,
          seller,
          isSeller,
          isLiked,
          relatedItems,
          loading: false
        });

      } catch (error) {
        console.error('加载商品详情失败:', error);
        this.setData({ 
          loading: false, 
          error: '加载失败，请重试' 
        });
      }
    }, 800);
  },

  // 获取模拟商品数据
  getMockItemData(itemId) {
    const mockItems = [
      {
        id: '1',
        title: 'iPhone 13 Pro 128GB 深空灰色',
        price: '4500',
        images: [
          '/images/phone1.jpg',
          '/images/phone2.jpg',
          '/images/phone3.jpg'
        ],
        category: '数码电子',
        categoryId: 1,
        condition: '95成新',
        isNegotiable: true,
        description: '自用iPhone 13 Pro，购买不到一年，九成五新。功能完好，外观无明显划痕，一直贴膜使用。包装盒和配件齐全，支持当面验货。因为换了新机型所以出售，价格可小刀。',
        sellerId: 1,
        publishTime: '2天前',
        viewCount: 25,
        status: 'active'
      },
      {
        id: '2',
        title: '护眼台灯 全新未拆封',
        price: '80',
        images: [
          '/images/lamp1.jpg'
        ],
        category: '生活用品',
        categoryId: 2,
        condition: '全新',
        isNegotiable: false,
        description: '全新护眼台灯，买重了，原价120，现80出售。品牌是飞利浦，有护眼认证，适合学习使用。',
        sellerId: 2,
        publishTime: '1天前',
        viewCount: 12,
        status: 'active'
      }
    ];

    return mockItems.find(item => item.id === itemId);
  },

  // 获取模拟卖家数据
  getMockSellerData(sellerId) {
    const mockSellers = [
      {
        id: 1,
        name: '张三',
        studentId: '2021001001',
        avatar: '/images/avatar1.jpg',
        rating: '信用良好'
      },
      {
        id: 2,
        name: '李四',
        studentId: '2021001002',
        avatar: '/images/avatar2.jpg',
        rating: '信用优秀'
      }
    ];

    return mockSellers.find(seller => seller.id === sellerId);
  },

  // 获取相关商品
  getMockRelatedItems(categoryId, excludeItemId) {
    const mockRelated = [
      {
        id: '3',
        title: 'MacBook Air M1',
        price: '6800',
        images: ['/images/laptop.jpg']
      },
      {
        id: '4',
        title: '小米手环6',
        price: '180',
        images: ['/images/band.jpg']
      }
    ];

    return mockRelated.filter(item => item.id !== excludeItemId);
  },

  // 检查是否已收藏
  checkIfLiked(itemId) {
    try {
      const likedItems = wx.getStorageSync('liked_items') || [];
      return likedItems.includes(itemId);
    } catch (error) {
      return false;
    }
  },

  // 增加浏览次数
  incrementViewCount(itemId) {
    // 这里应该调用API增加浏览次数
    console.log(`商品 ${itemId} 浏览次数+1`);
  },

  // 图片预览
  previewImage(e) {
    const index = e.currentTarget.dataset.index;
    wx.previewImage({
      urls: this.data.item.images,
      current: this.data.item.images[index]
    });
  },

  // 轮播图切换
  onSwiperChange(e) {
    this.setData({
      currentImageIndex: e.detail.current
    });
  },

  // 切换收藏状态
  toggleLike() {
    if (!this.data.currentUser) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    const itemId = this.data.itemId;
    const isLiked = this.data.isLiked;

    try {
      let likedItems = wx.getStorageSync('liked_items') || [];
      
      if (isLiked) {
        // 取消收藏
        likedItems = likedItems.filter(id => id !== itemId);
        wx.showToast({
          title: '已取消收藏',
          icon: 'none'
        });
      } else {
        // 添加收藏
        likedItems.push(itemId);
        wx.showToast({
          title: '收藏成功',
          icon: 'success'
        });
      }

      wx.setStorageSync('liked_items', likedItems);
      this.setData({ isLiked: !isLiked });

    } catch (error) {
      wx.showToast({
        title: '操作失败',
        icon: 'error'
      });
    }
  },

  // 联系卖家
  contactSeller() {
    if (!this.data.currentUser) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    if (this.data.isSeller) {
      wx.showToast({
        title: '不能联系自己',
        icon: 'none'
      });
      return;
    }

    // 跳转到聊天页面
    wx.navigateTo({
      url: `/pages/chat/chat?sellerId=${this.data.item.sellerId}&itemId=${this.data.itemId}`
    });
  },

  // 显示购买弹窗
  showBuyModal() {
    if (!this.data.currentUser) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    if (this.data.isSeller) {
      wx.showToast({
        title: '不能购买自己的商品',
        icon: 'none'
      });
      return;
    }

    this.setData({ showBuyModal: true });
  },

  // 隐藏购买弹窗
  hideBuyModal() {
    this.setData({ 
      showBuyModal: false,
      contactInfo: '',
      buyMessage: ''
    });
  },

  // 输入联系方式
  onContactInput(e) {
    this.setData({
      contactInfo: e.detail.value
    });
  },

  // 输入留言
  onMessageInput(e) {
    this.setData({
      buyMessage: e.detail.value
    });
  },

  // 确认购买
  confirmBuy() {
    if (!this.data.contactInfo.trim()) {
      wx.showToast({
        title: '请输入联系方式',
        icon: 'none'
      });
      return;
    }

    // 这里应该调用API创建订单或发送消息给卖家
    wx.showLoading({
      title: '处理中...'
    });

    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({
        title: '购买意向已发送给卖家',
        icon: 'success',
        duration: 2000
      });

      this.hideBuyModal();

      // 跳转到聊天页面
      setTimeout(() => {
        wx.navigateTo({
          url: `/pages/chat/chat?sellerId=${this.data.item.sellerId}&itemId=${this.data.itemId}`
        });
      }, 2000);
    }, 1500);
  },

  // 编辑商品
  editItem() {
    wx.navigateTo({
      url: `/pages/publish-item/publish-item?mode=edit&id=${this.data.itemId}`
    });
  },

  // 跳转到相关商品
  goToItem(e) {
    const itemId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/item-detail/item-detail?id=${itemId}`
    });
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: this.data.item.title,
      desc: `¥${this.data.item.price} - ${this.data.item.condition}`,
      path: `/pages/item-detail/item-detail?id=${this.data.itemId}`,
      imageUrl: this.data.item.images[0]
    };
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: `${this.data.item.title} - ¥${this.data.item.price}`,
      imageUrl: this.data.item.images[0]
    };
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadItemDetail();
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  }
});