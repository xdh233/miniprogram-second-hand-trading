// 用户管理工具类
const apiConfig = require('../utils/apiConfig');

class UserManager {
  constructor() {
    this.CURRENT_USER_KEY = 'current_user'; // 当前登录用户的key
    // 不再需要初始化假数据
  }

  // 用户注册
  register(userData) {
    return new Promise((resolve, reject) => {
      const { studentId, name, password} = userData;

      // 基本参数验证
      if (!studentId || !name || !password) {
        reject({ code: 400, message: '请填写必要信息' });
        return;
      }

      // 学号格式验证
      const isValidStudentId = /^[SB]\d{8}$/.test(studentId) || /^\d{8}$/.test(studentId);
    
      if (!isValidStudentId) {
        reject({ 
          code: 400, 
          message: '学号格式不正确，支持格式：S/B开头+8位数字 或 直接8位数字' 
        });
        return;
      }

      // 密码长度验证
      if (password.length < 6) {
        reject({ code: 400, message: '密码至少6位' });
        return;
      }

      // 调用后端API注册
      apiConfig.post('/auth/register', {
        studentId: studentId,
        name: name,
        password: password,
      })
      .then(result => {
        // 【关键】注册成功后设置token
        if (result.token) {
          apiConfig.setToken(result.token);
          wx.setStorageSync(this.CURRENT_USER_KEY, result.user);
        }
        
        resolve({
          code: 200,
          message: '注册成功',
          data: { userInfo: result.user }
        });
      })
      .catch(error => {
        console.error('注册失败:', error);
        reject({ code: 500, message: error.message || '注册失败，请重试' });
      });
    });
  }

  // 用户登录 - 使用studentId
  login(studentId, password) {
    return new Promise((resolve, reject) => {
      if (!studentId || !password) {
        reject({ code: 400, message: '请填写学号和密码' });
        return;
      }
  
      // 调用后端API登录
      apiConfig.post('/auth/login', {
        studentId: studentId,
        password: password
      })
      .then(result => {
        // 登录成功后设置token
        if (result.token) {
          apiConfig.setToken(result.token);
        }
        
        // 保存用户信息到本地存储
        const loginInfo = {
          id: result.user.id,
          studentId: result.user.studentId,
          name: result.user.name,
          nickname: result.user.nickname,
          avatar: result.user.avatar ? apiConfig.getAvatarUrl(result.user.avatar) : null,
          balance: result.user.balance || 0,
          loginTime: new Date().toISOString()
        };
  
        wx.setStorageSync(this.CURRENT_USER_KEY, loginInfo);
        
        // 🔧 关键修复：强制重新连接WebSocket
        try {
          const webSocketManager = require('./webSocketManager');
          console.log('用户切换，重新连接WebSocket...');
          
          // 先断开现有连接
          webSocketManager.disconnect();
          
          // 短暂延迟后重新连接，确保使用新的token
          setTimeout(() => {
            webSocketManager.connect().then(() => {
              console.log('WebSocket重新连接成功');
            }).catch(error => {
              console.error('WebSocket重新连接失败:', error);
            });
          }, 500);
          
        } catch (error) {
          console.error('WebSocket重连过程出错:', error);
        }
        
        resolve({
          code: 200,
          message: '登录成功',
          data: { userInfo: loginInfo }
        });
      })
      .catch(error => {
        console.error('登录失败:', error);
        reject({ code: 401, message: error.message || '学号或密码错误' });
      });
    });
  }

  // 获取当前登录用户
  getCurrentUser() {
    try {
      return wx.getStorageSync(this.CURRENT_USER_KEY) || null;
    } catch (error) {
      console.error('获取当前用户失败:', error);
      return null;
    }
  }

  // 获取指定用户信息
  async getUserInfo(userId) {
    try {
      // 参数验证
      if (!userId || userId === 'undefined' || userId === 'null') {
        throw new Error('无效的用户ID: ' + userId);
      }
      
      // 确保是数字
      const numericUserId = parseInt(userId);
      if (isNaN(numericUserId)) {
        throw new Error('用户ID不是有效数字: ' + userId);
      }
      
      console.log('获取用户信息, userId:', numericUserId);
      
      const response = await apiConfig.get(`/users/${numericUserId}`);
      
      if (response.success) {
        const userData = response.data;
        if (userData.avatar) {
          userData.avatar = apiConfig.getAvatarUrl(userData.avatar);
        }
        return userData;

      } else {
        throw new Error(response.message || '获取用户信息失败');
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
      throw error;
    }
  }

  // 更新用户信息
  updateUserInfo(updates) {
    return new Promise((resolve, reject) => {
      const currentUser = this.getCurrentUser();
      if (!currentUser) {
        reject({ code: 401, message: '请先登录' });
        return;
      }

      apiConfig.put(`/users/${currentUser.id}`, updates)
        .then(updatedUser => {
          // 🔧 修复：处理更新后的头像URL
          if (updatedUser.avatar) {
            updatedUser.avatar = apiConfig.getAvatarUrl(updatedUser.avatar);
          }
          
          // 更新本地存储的用户信息
          const loginInfo = {
            ...currentUser,
            ...updatedUser,
            updateTime: new Date().toISOString()
          };
          wx.setStorageSync(this.CURRENT_USER_KEY, loginInfo);
          
          resolve({
            code: 200,
            message: '更新成功',
            data: { userInfo: loginInfo }
          });
        })
        .catch(error => {
          console.error('更新用户信息失败:', error);
          reject({ code: 500, message: '更新失败' });
        });
    });
  }

  // 修改密码
  changePassword(oldPassword, newPassword) {
    return new Promise((resolve, reject) => {
      const currentUser = this.getCurrentUser();
      if (!currentUser) {
        reject({ code: 401, message: '请先登录' });
        return;
      }

      if (newPassword.length < 6) {
        reject({ code: 400, message: '新密码至少6位' });
        return;
      }

      apiConfig.put(`/users/${currentUser.id}/password`, {
        oldPassword: oldPassword,
        newPassword: newPassword
      })
        .then(result => {
          resolve({ code: 200, message: '密码修改成功' });
        })
        .catch(error => {
          console.error('修改密码失败:', error);
          reject({ code: 400, message: error.message || '密码修改失败' });
        });
    });
  }

  // 检查是否已登录
  isLoggedIn() {
    return this.getCurrentUser() !== null;
  }

  // 退出登录
  logout() {
    try {
      // 🔧 修复：退出时断开WebSocket
      try {
        const webSocketManager = require('./webSocketManager');
        console.log('用户退出，断开WebSocket连接');
        webSocketManager.disconnect();
      } catch (error) {
        console.error('断开WebSocket失败:', error);
      }
      
      // 清除token和用户信息
      apiConfig.clearToken();
      wx.removeStorageSync(this.CURRENT_USER_KEY);
      
      console.log('退出登录成功');
      return true;
    } catch (error) {
      console.error('退出登录失败:', error);
      return false;
    }
  }

  // 更新个人简介
  updateBio(newBio) {
    return new Promise((resolve, reject) => {
      // 简介验证
      if (newBio && newBio.length > 100) {
        reject({ code: 400, message: '个人简介不能超过100个字符' });
        return;
      }

      this.updateUserInfo({ bio: newBio ? newBio.trim() : '' })
        .then(result => {
          resolve({
            code: 200,
            message: '个人简介更新成功',
            data: { bio: newBio ? newBio.trim() : '' }
          });
        })
        .catch(error => {
          reject(error);
        });
    });
  }

  // 更新用户昵称
  updateNickname(newNickname) {
    return new Promise((resolve, reject) => {
      // 昵称验证
      if (!newNickname || !newNickname.trim()) {
        reject({ code: 400, message: '昵称不能为空' });
        return;
      }

      if (newNickname.length > 20) {
        reject({ code: 400, message: '昵称不能超过20个字符' });
        return;
      }

      this.updateUserInfo({ nickname: newNickname.trim() })
        .then(result => {
          resolve({
            code: 200,
            message: '昵称更新成功',
            data: { nickname: newNickname.trim() }
          });
        })
        .catch(error => {
          reject(error);
        });
    });
  }

  // 更新指定用户的余额
  getUserBalance(userId = null) {
    return new Promise((resolve, reject) => {
      let targetUserId = userId;
      
      if (!targetUserId) {
        const currentUser = this.getCurrentUser();
        if (!currentUser) {
          reject({ code: 401, message: '请先登录' });
          return;
        }
        targetUserId = currentUser.id;
      }
  
      apiConfig.get(`/users/${targetUserId}/balance`)
        .then(data => {
          // ✅ 直接返回后端数据，不要重复包装
          if (data && data.success && data.data && typeof data.data.balance === 'number') {
            resolve({
              code: 200,
              data: {
                balance: data.data.balance  // ✅ 直接提取 balance
              }
            });
          } else {
            throw new Error('后端返回的余额数据格式错误');
          }
        })
        .catch(error => {
          console.error('获取用户余额失败:', error);
          reject({ code: 404, message: error.message || '获取余额失败' });
        });
    });
  }

  // 更新指定用户的余额（充值）
  updateUserBalanceById(userId, amount, operation = 'add', description = '') {
    return new Promise((resolve, reject) => {
      let apiPath;
      let requestData;
      
      // ✅ 修改：使用现有的余额更新接口
      if (operation === 'add') {
        apiPath = `/users/${userId}/balance`;
        requestData = { amount: Math.abs(amount) }; // 确保是正数
      } else if (operation === 'deduct') {
        apiPath = `/users/${userId}/balance`;
        requestData = { amount: -Math.abs(amount) }; // 确保是负数
      } else {
        reject({ code: 400, message: '无效的操作类型' });
        return;
      }
  
      apiConfig.put(apiPath, requestData)  // ✅ 使用 PUT 方法
        .then(data => {
          console.log('余额更新成功:', data);
          resolve({
            code: 200,
            data: data.data,
            message: data.message
          });
        })
        .catch(error => {
          console.error('更新余额失败:', error);
          reject({ code: 500, message: error.message || '余额更新失败' });
        });
    });
  }

  // 充值余额（简化版本）
  rechargeBalance(amount, description = '充值') {
    return new Promise((resolve, reject) => {
      const currentUser = this.getCurrentUser();
      if (!currentUser) {
        reject({ code: 401, message: '请先登录' });
        return;
      }

      this.updateUserBalanceById(currentUser.id, amount, 'recharge', description)
        .then(result => {
          resolve(result);
        })
        .catch(error => {
          reject(error);
        });
    });
  }

  // 扣除余额（简化版本）
  deductBalance(amount, reason = '消费') {
    return new Promise((resolve, reject) => {
      const currentUser = this.getCurrentUser();
      if (!currentUser) {
        reject({ code: 401, message: '请先登录' });
        return;
      }

      this.updateUserBalanceById(currentUser.id, amount, 'deduct', reason)
        .then(result => {
          resolve(result);
        })
        .catch(error => {
          reject(error);
        });
    });
  }

  // 检查余额是否足够
  checkBalance(requiredAmount) {
    return new Promise((resolve, reject) => {
      this.getUserBalance()
        .then(result => {
          const currentBalance = result.data.balance || 0;
          if (currentBalance >= requiredAmount) {
            resolve({
              code: 200,
              sufficient: true,
              currentBalance: currentBalance,
              requiredAmount: requiredAmount
            });
          } else {
            resolve({
              code: 200,
              sufficient: false,
              currentBalance: currentBalance,
              requiredAmount: requiredAmount,
              shortfall: requiredAmount - currentBalance
            });
          }
        })
        .catch(error => {
          reject(error);
        });
    });
  }
}

// 创建单例
const userManager = new UserManager();

module.exports = userManager;