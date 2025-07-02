class BaseManager {
  constructor(storageKey) {
    this.storageKey = storageKey;
  }

  // 获取所有数据
  getAll() {
    try {
      return wx.getStorageSync(this.storageKey) || [];
    } catch (error) {
      console.error(`获取${this.storageKey}数据失败:`, error);
      return [];
    }
  }

  // 保存数据
  save(data) {
    try {
      wx.setStorageSync(this.storageKey, data);
      return true;
    } catch (error) {
      console.error(`保存${this.storageKey}失败:`, error);
      return false;
    }
  }

  // 根据ID获取单条数据
  getById(id) {
    const allData = this.getAll();
    return allData.find(item => item.id == id);
  }

  // 添加新数据
  add(newData) {
    const allData = this.getAll();
    allData.unshift(newData);
    return this.save(allData);
  }

  // 更新数据
  update(id, updateData) {
    const allData = this.getAll();
    const index = allData.findIndex(item => item.id == id);
    
    if (index !== -1) {
      allData[index] = { ...allData[index], ...updateData };
      return this.save(allData) ? allData[index] : null;
    }
    return null;
  }

  // 删除数据
  delete(id) {
    const allData = this.getAll();
    const index = allData.findIndex(item => item.id == id);
    
    if (index !== -1) {
      allData.splice(index, 1);
      return this.save(allData);
    }
    return false;
  }

  // 清空数据
  clear() {
    try {
      wx.removeStorageSync(this.storageKey);
      return true;
    } catch (error) {
      console.error(`清空${this.storageKey}失败:`, error);
      return false;
    }
  }
}
module.exports = BaseManager;
