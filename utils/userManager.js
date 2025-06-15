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
          password: '123456',
          createdAt: new Date().toISOString()
        },
        {
          id: 2,
          studentId: '21001002',
          name: '李四',
          password: '123456',
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
  register(studentId, name, password) {
    return new Promise((resolve, reject) => {
      // 参数验证
      if (!studentId || !name || !password) {
        reject({ code: 400, message: '请填写完整信息' });
        return;
      }

      // 学号格式验证
      if (!/^\d{8,12}$/.test(studentId)) {
        reject({ code: 400, message: '学号格式不正确，应为10-12位数字' });
        return;
      }

      // 密码长度验证
      if (password.length < 6) {
        reject({ code: 400, message: '密码至少6位' });
        return;
      }

      const users = this.getAllUsers();
      
      // 检查学号是否已存在
      const existUser = users.find(user => user.studentId === studentId);
      if (existUser) {
        reject({ code: 400, message: '该学号已注册' });
        return;
      }

      // 创建新用户
      const newUser = {
        id: Date.now(), // 用时间戳作为ID
        studentId: studentId,
        name: name,
        password: password, // 真实项目中应该加密
        createdAt: new Date().toISOString()
      };

      users.push(newUser);
      
      if (this.saveUsers(users)) {
        resolve({
          code: 200,
          message: '注册成功',
          data: {
            id: newUser.id,
            studentId: newUser.studentId,
            name: newUser.name
          }
        });
      } else {
        reject({ code: 500, message: '注册失败，请重试' });
      }
    });
  }

  // 用户登录
  login(studentId, password) {
    return new Promise((resolve, reject) => {
      // 参数验证
      if (!studentId || !password) {
        reject({ code: 400, message: '请填写学号和密码' });
        return;
      }

      const users = this.getAllUsers();
      
      // 查找用户
      const user = users.find(u => u.studentId === studentId);
      if (!user) {
        reject({ code: 401, message: '学号或密码错误' });
        return;
      }

      // 验证密码
      if (user.password !== password) {
        reject({ code: 401, message: '学号或密码错误' });
        return;
      }

      // 保存登录状态
      const loginInfo = {
        id: user.id,
        studentId: user.studentId,
        name: user.name,
        loginTime: new Date().toISOString()
      };

      try {
        wx.setStorageSync(this.CURRENT_USER_KEY, loginInfo);
        resolve({
          code: 200,
          message: '登录成功',
          data: {
            userInfo: loginInfo
          }
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

      // 验证旧密码
      if (users[userIndex].password !== oldPassword) {
        reject({ code: 400, message: '原密码错误' });
        return;
      }

      // 新密码验证
      if (newPassword.length < 6) {
        reject({ code: 400, message: '新密码至少6位' });
        return;
      }

      // 修改密码
      users[userIndex].password = newPassword;
      users[userIndex].updatedAt = new Date().toISOString();

      if (this.saveUsers(users)) {
        resolve({ code: 200, message: '密码修改成功' });
      } else {
        reject({ code: 500, message: '密码修改失败' });
      }
    });
  }

  // 获取所有用户（仅用于调试）
  debugGetAllUsers() {
    return this.getAllUsers();
  }

  // 清空所有数据（仅用于调试）
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