// 用户管理工具类
class UserManager {
  constructor() {
    this.USERS_KEY = 'campus_users'; // 存储所有用户的key
    this.CURRENT_USER_KEY = 'current_user'; // 当前登录用户的key
    this.init();
  }

  // 初始化，创建一些测试用户
  init() {
    const users = this.getAllUsers();
    if (users.length === 0) {
      // 添加一些测试用户
      const testUsers = [
        {
          id: 1,
          studentId: '21001001',
          name: '张三',
          nickname: '三张',
          password: '123456',
          avatar: '/images/default-avatar.png',
          phone: '13800138000',
          email: 'zhangsan@example.com',
          bio: '我是狗。',
          createdAt: new Date().toISOString(),
          balance: 50.00
        },
        {
          id: 2,
          studentId: '21001002',
          name: '李四',
          nickname: '四李',
          password: '123456',
          avatar: '/images/default-avatar.png',
          phone: '13800138001',
          email: 'lisi@example.com',
          bio: '我不是狗也不累',
          createdAt: new Date().toISOString(),
          balance: 50.00
        },
        {
          id: 3,
          studentId: '22074304',
          name: '牛大果',
          nickname: '蛋黄',
          password: '123456',
          avatar: '/images/default-avatar.png',
          phone: '13800138002',
          email: 'niudaguo@example.com',
          bio: '累。',
          createdAt: new Date().toISOString(),
          balance: 300.00
        }
      ];
      
      wx.setStorageSync(this.USERS_KEY, testUsers);
      console.log('初始化测试用户数据');
    }
  }

  // 获取所有用户
  getAllUsers() {
    try {
      return wx.getStorageSync(this.USERS_KEY) || [];
    } catch (error) {
      console.error('获取用户数据失败:', error);
      return [];
    }
  }

  // 保存用户数据
  saveUsers(users) {
    try {
      wx.setStorageSync(this.USERS_KEY, users);
      return true;
    } catch (error) {
      console.error('保存用户数据失败:', error);
      return false;
    }
  }

  // 用户注册
  register(userData) {
    return new Promise((resolve, reject) => {
      const { studentId, name, password, phone, email } = userData;

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

      // 手机号格式验证
      if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
        reject({ code: 400, message: '手机号格式不正确' });
        return;
      }

      // 邮箱格式验证
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        reject({ code: 400, message: '邮箱格式不正确' });
        return;
      }

      const users = this.getAllUsers();
      
      // 检查学号是否已存在
      if (users.find(user => user.studentId === studentId)) {
        reject({ code: 400, message: '该学号已注册' });
        return;
      }

      // 创建新用户
      const newUser = {
        id: Date.now(),
        studentId,
        name,
        password,
        avatar: '/images/default-avatar.png',
        phone: phone || '',
        email: email || '',
        balance: 0, // 新用户初始余额为0
        createdAt: new Date().toISOString()
      };

      users.push(newUser);
      
      if (this.saveUsers(users)) {
        // 返回安全的用户信息（不包含密码）
        const safeUserInfo = { ...newUser };
        delete safeUserInfo.password;
        
        resolve({
          code: 200,
          message: '注册成功',
          data: { userInfo: safeUserInfo }
        });
      } else {
        reject({ code: 500, message: '注册失败，请重试' });
      }
    });
  }

  // 用户登录
  login(studentId, password) {
    return new Promise((resolve, reject) => {
      if (!studentId || !password) {
        reject({ code: 400, message: '请填写学号和密码' });
        return;
      }

      const users = this.getAllUsers();
      const user = users.find(u => u.studentId === studentId);
      
      if (!user || user.password !== password) {
        reject({ code: 401, message: '学号或密码错误' });
        return;
      }

      // 构建登录信息（不包含密码）
      const loginInfo = {
        id: user.id,
        studentId: user.studentId,
        name: user.name,
        nickname: user.nickname,
        avatar: user.avatar,
        balance: user.balance || 0, // 添加余额信息
        loginTime: new Date().toISOString()
      };

      try {
        wx.setStorageSync(this.CURRENT_USER_KEY, loginInfo);
        resolve({
          code: 200,
          message: '登录成功',
          data: { userInfo: loginInfo }
        });
      } catch (error) {
        reject({ code: 500, message: '登录失败，请重试' });
      }
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
  getUserInfo(userId) {
    return new Promise((resolve, reject) => {
      const users = this.getAllUsers();
      const user = users.find(u => u.id === userId);
      
      if (!user) {
        reject({ code: 404, message: '用户不存在' });
        return;
      }

      // 返回安全的用户信息（不包含密码等敏感信息）
      const safeUserInfo = { ...user };
      delete safeUserInfo.password;
      
      resolve({
        code: 200,
        data: { userInfo: safeUserInfo }
      });
    });
  }

  // 更新用户信息
  updateUserInfo(updates) {
    return new Promise((resolve, reject) => {
      const currentUser = this.getCurrentUser();
      if (!currentUser) {
        reject({ code: 401, message: '请先登录' });
        return;
      }

      const users = this.getAllUsers();
      const userIndex = users.findIndex(u => u.id === currentUser.id);
      
      if (userIndex === -1) {
        reject({ code: 404, message: '用户不存在' });
        return;
      }

      // 更新用户信息
      const updatedUser = {
        ...users[userIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      users[userIndex] = updatedUser;

      if (this.saveUsers(users)) {
        // 更新登录状态
        const loginInfo = {
          ...currentUser,
          ...updates,
          updateTime: new Date().toISOString()
        };
        wx.setStorageSync(this.CURRENT_USER_KEY, loginInfo);
        
        resolve({
          code: 200,
          message: '更新成功',
          data: { userInfo: loginInfo }
        });
      } else {
        reject({ code: 500, message: '更新失败' });
      }
    });
  }

  // 获取用户余额
  getUserBalance(userId = null) {
    return new Promise((resolve, reject) => {
      let targetUserId = userId;
      
      // 如果没有指定用户ID，使用当前登录用户
      if (!targetUserId) {
        const currentUser = this.getCurrentUser();
        if (!currentUser) {
          reject({ code: 401, message: '请先登录' });
          return;
        }
        targetUserId = currentUser.id;
      }

      const users = this.getAllUsers();
      const user = users.find(u => u.id === targetUserId);
      
      if (!user) {
        reject({ code: 404, message: '用户不存在' });
        return;
      }

      resolve({
        code: 200,
        data: { 
          balance: user.balance || 0,
          userId: user.id,
          studentId: user.studentId,
          name: user.name
        }
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

      const users = this.getAllUsers();
      const userIndex = users.findIndex(u => u.id === currentUser.id);
      
      if (userIndex === -1) {
        reject({ code: 404, message: '用户不存在' });
        return;
      }

      if (users[userIndex].password !== oldPassword) {
        reject({ code: 400, message: '原密码错误' });
        return;
      }

      if (newPassword.length < 6) {
        reject({ code: 400, message: '新密码至少6位' });
        return;
      }

      users[userIndex].password = newPassword;
      users[userIndex].updatedAt = new Date().toISOString();

      if (this.saveUsers(users)) {
        resolve({ code: 200, message: '密码修改成功' });
      } else {
        reject({ code: 500, message: '密码修改失败' });
      }
    });
  }

  // 检查是否已登录
  isLoggedIn() {
    return this.getCurrentUser() !== null;
  }

  // 退出登录
  logout() {
    try {
      wx.removeStorageSync(this.CURRENT_USER_KEY);
      return true;
    } catch (error) {
      console.error('退出登录失败:', error);
      return false;
    }
  }

  // 检查昵称是否已存在
  isNicknameExist(nickname, excludeUserId = null) {
    const users = this.getAllUsers();
    return users.some(user => 
      user.nickname === nickname && 
      (excludeUserId === null || user.id !== excludeUserId)
    );
  }

  updateBio(newBio) {
    return new Promise((resolve, reject) => {
      const currentUser = this.getCurrentUser();
      if (!currentUser) {
        reject({ code: 401, message: '请先登录' });
        return;
      }
  
      // 简介验证
      if (newBio && newBio.length > 100) {
        reject({ code: 400, message: '个人简介不能超过100个字符' });
        return;
      }
  
      const users = this.getAllUsers();
      const userIndex = users.findIndex(u => u.id === currentUser.id);
      
      if (userIndex === -1) {
        reject({ code: 404, message: '用户不存在' });
        return;
      }
  
      // 更新简介
      users[userIndex].bio = newBio ? newBio.trim() : '';
      users[userIndex].updatedAt = new Date().toISOString();
  
      if (this.saveUsers(users)) {
        // 更新登录状态中的简介
        const updatedLoginInfo = {
          ...currentUser,
          bio: newBio ? newBio.trim() : '',
          updateTime: new Date().toISOString()
        };
        wx.setStorageSync(this.CURRENT_USER_KEY, updatedLoginInfo);
        
        resolve({
          code: 200,
          message: '个人简介更新成功',
          data: { bio: newBio ? newBio.trim() : '' }
        });
      } else {
        reject({ code: 500, message: '个人简介更新失败' });
      }
    });
  }

  // 更新用户昵称
  updateNickname(newNickname) {
    return new Promise((resolve, reject) => {
      const currentUser = this.getCurrentUser();
      if (!currentUser) {
        reject({ code: 401, message: '请先登录' });
        return;
      }

      // 昵称验证
      if (!newNickname || !newNickname.trim()) {
        reject({ code: 400, message: '昵称不能为空' });
        return;
      }

      if (newNickname.length > 20) {
        reject({ code: 400, message: '昵称不能超过20个字符' });
        return;
      }

      const users = this.getAllUsers();
      const userIndex = users.findIndex(u => u.id === currentUser.id);
      
      if (userIndex === -1) {
        reject({ code: 404, message: '用户不存在' });
        return;
      }

      // 更新昵称
      users[userIndex].nickname = newNickname.trim();
      users[userIndex].updatedAt = new Date().toISOString();

      if (this.saveUsers(users)) {
        // 更新登录状态中的昵称
        const updatedLoginInfo = {
          ...currentUser,
          nickname: newNickname.trim(),
          updateTime: new Date().toISOString()
        };
        wx.setStorageSync(this.CURRENT_USER_KEY, updatedLoginInfo);
        
        resolve({
          code: 200,
          message: '昵称更新成功',
          data: { nickname: newNickname.trim() }
        });
      } else {
        reject({ code: 500, message: '昵称更新失败' });
      }
    });
  }

  // 调试方法：获取所有用户
  debugGetAllUsers() {
    return this.getAllUsers();
  }

  // 调试方法：清空所有数据
  debugClearAll() {
    try {
      wx.removeStorageSync(this.USERS_KEY);
      wx.removeStorageSync(this.CURRENT_USER_KEY);
      console.log('已清空所有用户数据');
      return true;
    } catch (error) {
      console.error('清空数据失败:', error);
      return false;
    }
  } 

  // 更新指定用户的余额（用于购买流程中的转账）
  updateUserBalanceById(userId, amount, operation = 'add', description = '') {
    return new Promise((resolve, reject) => {
      // 参数验证
      if (!userId) {
        reject({ code: 400, message: '用户ID不能为空' });
        return;
      }

      if (typeof amount !== 'number' || amount < 0) {
        reject({ code: 400, message: '金额必须为非负数' });
        return;
      }

      // 精确到分的处理
      const amountInCents = Math.round(amount * 100);
      const finalAmount = amountInCents / 100;

      const users = this.getAllUsers();
      const userIndex = users.findIndex(u => u.id === userId);
      
      if (userIndex === -1) {
        reject({ code: 404, message: '用户不存在' });
        return;
      }

      const currentBalance = users[userIndex].balance || 0;
      let newBalance;

      // 根据操作类型计算新余额
      switch (operation) {
        case 'add': // 增加余额
          newBalance = currentBalance + finalAmount;
          break;
        case 'subtract': // 减少余额
          if (currentBalance < finalAmount) {
            reject({ code: 400, message: '余额不足' });
            return;
          }
          newBalance = currentBalance - finalAmount;
          break;
        case 'set': // 直接设置余额
          newBalance = finalAmount;
          break;
        default:
          reject({ code: 400, message: '操作类型无效' });
          return;
      }

      // 确保余额不为负数
      if (newBalance < 0) {
        reject({ code: 400, message: '余额不能为负数' });
        return;
      }

      // 更新用户余额
      users[userIndex].balance = Math.round(newBalance * 100) / 100; // 精确到分
      users[userIndex].updatedAt = new Date().toISOString();

      if (this.saveUsers(users)) {
        // 如果更新的是当前登录用户，同时更新登录状态
        const currentUser = this.getCurrentUser();
        if (currentUser && currentUser.id === userId) {
          const updatedLoginInfo = {
            ...currentUser,
            balance: users[userIndex].balance,
            updateTime: new Date().toISOString()
          };
          wx.setStorageSync(this.CURRENT_USER_KEY, updatedLoginInfo);
        }
        
        resolve({
          code: 200,
          message: '余额更新成功',
          data: { 
            userId: userId,
            previousBalance: currentBalance,
            newBalance: users[userIndex].balance,
            amount: finalAmount,
            operation
          }
        });
      } else {
        reject({ code: 500, message: '余额更新失败' });
      }
    });
  }

  // 获取指定用户的余额（支持传入用户ID）
  getUserBalance(userId = null) {
    return new Promise((resolve, reject) => {
      let targetUserId = userId;
      
      // 如果没有指定用户ID，使用当前登录用户
      if (!targetUserId) {
        const currentUser = this.getCurrentUser();
        if (!currentUser) {
          reject({ code: 401, message: '请先登录' });
          return;
        }
        targetUserId = currentUser.id;
      }

      const users = this.getAllUsers();
      const user = users.find(u => u.id === targetUserId);
      
      if (!user) {
        reject({ code: 404, message: '用户不存在' });
        return;
      }

      resolve({
        code: 200,
        data: { 
          balance: user.balance || 0,
          userId: user.id,
          studentId: user.studentId,
          name: user.name
        }
      });
    });
  }
}

// 创建单例
const userManager = new UserManager();

module.exports = userManager;