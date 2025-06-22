// utils/api.js
const BASE_URL = 'http://49.234.193.54.com/api'

class ApiManager {
  request(url, options = {}) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: BASE_URL + url,
        method: options.method || 'GET',
        data: options.data,
        header: {
          'Authorization': 'Bearer ' + this.getToken(),
          ...options.header
        },
        success: resolve,
        fail: reject
      })
    })
  }
  
  getToken() {
    return wx.getStorageSync('access_token')
  }
}