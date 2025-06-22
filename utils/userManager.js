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
          rating: '信用优秀',
          createdAt: new Date().toISOString()
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
          rating: '信用良好',
          createdAt: new Date().toISOString()
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
          rating: '信用优秀',
          createdAt: new Date().toISOString()
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
      if (!/^[SB]\d{8}$/.test(studentId)) {
        reject({ code: 400, message: '学号格式不正确，应为8位数字' });
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
        rating: '信用良好',
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
        rating: user.rating,
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

  // 更新用户信用评级
  updateUserRating(userId, rating) {
    return new Promise((resolve, reject) => {
      const users = this.getAllUsers();
      const userIndex = users.findIndex(u => u.id === userId);
      
      if (userIndex === -1) {
        reject({ code: 404, message: '用户不存在' });
        return;
      }

      users[userIndex].rating = rating;
      users[userIndex].updatedAt = new Date().toISOString();

      if (this.saveUsers(users)) {
        resolve({ 
          code: 200, 
          message: '信用评级更新成功',
          data: { rating }
        });
      } else {
        reject({ code: 500, message: '更新失败' });
      }
    });
  }

  // 更新昵称
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
}

// 创建单例
const userManager = new UserManager();

module.exports = userManager;