// utils/apiConfig.js - 最终修复版API配置文件

class ApiConfig {
  constructor() {
    // API基础URL
    this.BASE_URL = 'http://49.234.193.54:3000/api';
    
    // 图片服务配置 
    this.IMAGE_BASE_URL = 'http://49.234.193.54:3000/uploads/';
    this.LOCAL_IMAGE_PATH = '/images/';
    
    // 请求超时时间
    this.TIMEOUT = 10000;
    
    // 通用请求头
    this.COMMON_HEADERS = {
      'Content-Type': 'application/json; charset=utf-8'
    };
    
    // 图片上传配置
    this.UPLOAD_CONFIG = {
      MAX_SIZE: 5 * 1024 * 1024, // 5MB
      ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif'],
      FIELD_NAME: 'images'
    };
  }
  
  // 🔧 修复获取完整图片URL的方法
  getImageUrl(imagePath) {
    if (!imagePath) {
      return this.IMAGE_BASE_URL + 'placeholder.png';
    }
    
    // 如果已经是完整URL，直接返回
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    // 如果是本地图片路径（以/images/开头），使用本地路径
    if (imagePath.startsWith('/images/')) {
      return imagePath;
    }
    
    // 🔧 修复：去掉可能的/uploads/前缀，避免重复
    let cleanPath = imagePath;
    if (cleanPath.startsWith('/uploads/')) {
      cleanPath = cleanPath.substring(9); // 去掉 '/uploads/' 前缀
    }
    
    // 返回完整的服务器图片URL
    return this.IMAGE_BASE_URL + cleanPath;
  }
  
  getAvatarUrl(avatarPath) {
    if (!avatarPath) {
      return this.IMAGE_BASE_URL + 'default-avatar.png';
    }
    return this.getImageUrl(avatarPath);
  }
  
  processItemImages(items) {
    if (Array.isArray(items)) {
      return items.map(item => ({
        ...item,
        images: item.images ? item.images.map(img => this.getImageUrl(img)) : [],
        sellerAvatar: this.getAvatarUrl(item.sellerAvatar)
      }));
    } else if (items && items.images) {
      return {
        ...items,
        images: items.images.map(img => this.getImageUrl(img)),
        sellerAvatar: this.getAvatarUrl(items.sellerAvatar)
      };
    }
    return items;
  }

  processPostImages(posts) {
    if (Array.isArray(posts)) {
      return posts.map(post => ({
        ...post,
        images: post.images ? post.images.map(img => this.getImageUrl(img)) : [],
        userAvatar: this.getAvatarUrl(post.userAvatar)
      }));
    } else if (posts && posts.images) {
      return {
        ...posts,
        images: posts.images.map(img => this.getImageUrl(img)),
        userAvatar: this.getAvatarUrl(posts.userAvatar)
      };
    }
    return posts;
  }
  
  request(url, options = {}) {
    return new Promise((resolve, reject) => {
      const token = wx.getStorageSync('userToken');
      
      // 🔧 修复：确保URL拼接正确，避免重复/api/
      let fullUrl;
      if (url.startsWith('http')) {
        fullUrl = url;
      } else {
        // 确保url以/开头
        const cleanUrl = url.startsWith('/') ? url : '/' + url;
        fullUrl = this.BASE_URL + cleanUrl;
      }
      
      console.log('请求URL:', fullUrl);
      
      const requestOptions = {
        url: fullUrl,
        method: options.method || 'GET',
        data: options.data || {},
        timeout: this.TIMEOUT,
        header: {
          ...this.COMMON_HEADERS,
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          ...options.header
        },
        success: (res) => {
          console.log('API请求成功:', fullUrl, res);
          
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data);
          } else if (res.statusCode === 401) {
            wx.removeStorageSync('userToken');
            wx.removeStorageSync('currentUser');
            wx.showToast({
              title: '登录已过期，请重新登录',
              icon: 'none'
            });
            reject(new Error('登录已过期'));
          } else {
            reject(new Error(res.data?.message || `请求失败: ${res.statusCode}`));
          }
        },
        fail: (error) => {
          console.error('API请求失败:', fullUrl, error);
          
          if (error.errMsg && error.errMsg.includes('timeout')) {
            wx.showToast({
              title: '请求超时，请检查网络',
              icon: 'none'
            });
          } else {
            wx.showToast({
              title: '网络请求失败',
              icon: 'none'
            });
          }
          
          reject(error);
        }
      };

      wx.request(requestOptions);
    });
  }

  get(url, params = {}) {
    let queryString = '';
    if (Object.keys(params).length > 0) {
      const queryArray = [];
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          queryArray.push(`${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`);
        }
      });
      queryString = '?' + queryArray.join('&');
    }
    
    return this.request(url + queryString, { method: 'GET' });
  }

  post(url, data = {}) {
    return this.request(url, { 
      method: 'POST', 
      data 
    });
  }

  put(url, data = {}) {
    return this.request(url, { 
      method: 'PUT', 
      data 
    });
  }

  delete(url) {
    return this.request(url, { method: 'DELETE' });
  }

  uploadFile(url, filePath, name = 'file', formData = {}) {
    return new Promise((resolve, reject) => {
      if (!filePath) {
        reject(new Error('文件路径不能为空'));
        return;
      }

      const token = wx.getStorageSync('userToken');
      
      // 🔧 修复：确保上传URL拼接正确
      let fullUrl;
      if (url.startsWith('http')) {
        fullUrl = url;
      } else {
        const cleanUrl = url.startsWith('/') ? url : '/' + url;
        fullUrl = this.BASE_URL + cleanUrl;
      }
      
      console.log('上传URL:', fullUrl);
      
      wx.uploadFile({
        url: fullUrl,
        filePath: filePath,
        name: name,
        formData: {
          ...formData,
          timestamp: Date.now()
        },
        header: {
          'Content-Type': 'multipart/form-data',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        success: (res) => {
          console.log('文件上传响应:', res);
          try {
            const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
            
            if (data.success === false) {
              reject(new Error(data.message || '上传失败'));
            } else {
              if (data.success && data.data) {
                resolve(data.data);
              } else {
                resolve(data);
              }
            }
          } catch (e) {
            console.error('解析上传响应失败:', e, res.data);
            reject(new Error('解析响应数据失败'));
          }
        },
        fail: (error) => {
          console.error('文件上传失败:', error);
          let errMsg = '上传失败';
          if (error.errMsg.includes('timeout')) {
            errMsg = '上传超时，请检查网络';
          } else if (error.errMsg.includes('fail')) {
            errMsg = '文件读取失败';
          }
          reject(new Error(errMsg));
        }
      });
    });
  }

  async uploadMultipleFiles(url, filePaths, fieldName = this.UPLOAD_CONFIG.FIELD_NAME) {
    if (!Array.isArray(filePaths)) {
      throw new Error('filePaths必须是数组');
    }

    if (filePaths.length === 0) {
      return [];
    }

    if (filePaths.length > 9) {
      throw new Error('最多上传9张图片');
    }

    console.log("开始批量上传:", url, filePaths, fieldName);
    
    try {
      const uploadTasks = filePaths.map(async (filePath, index) => {
        console.log(`上传第${index + 1}个文件:`, filePath);
        const result = await this.uploadFile(url, filePath, fieldName);
        console.log(`第${index + 1}个文件上传结果:`, result);
        return result;
      });

      const results = await Promise.all(uploadTasks);
      console.log('所有文件上传完成:', results);
      
      // 🔧 修复：提取URL并统一格式
      const urls = results.map(result => {
        if (typeof result === 'string') {
          return result;
        } else if (result && result.url) {
          return result.url;
        } else if (Array.isArray(result) && result.length > 0) {
          return result[0].url || result[0];
        } else {
          console.warn('未知的上传结果格式:', result);
          return null;
        }
      }).filter(url => url !== null);
      
      console.log('提取的URL数组:', urls);
      return urls;
      
    } catch (error) {
      console.error('批量上传失败:', error);
      throw new Error(`图片上传失败: ${error.message}`);
    }
  }

  setToken(token) {
    wx.setStorageSync('userToken', token);
  }

  clearToken() {
    wx.removeStorageSync('userToken');
    wx.removeStorageSync('currentUser');
  }

  getFullUrl(path) {
    return `${this.BASE_URL}${path}`;
  }
  
  getImageServiceUrl(path) {
    return `${this.IMAGE_BASE_URL}${path}`;
  }
}

module.exports = new ApiConfig();