// utils/idGenerator.js - 统一ID生成器

class idGenerator {
  /**
   * 基础ID生成方法
   * @param {string} prefix - ID前缀
   * @returns {string} 生成的ID
   */
  static generateBaseId(prefix = '') {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substr(2, 9);
    return `${prefix}${timestamp}_${randomStr}`;
  }

  // ========== 用户相关ID ==========
  
  /**
   * 生成用户ID
   * @returns {string} 用户ID，格式：user_时间戳_随机字符
   */
  static generateUserId() {
    return this.generateBaseId('user_');
  }

  // ========== 内容相关ID ==========
  
  /**
   * 生成动态/帖子ID
   * @returns {string} 动态ID，格式：post_时间戳_随机字符
   */
  static generatePostId() {
    return this.generateBaseId('post_');
  }

  /**
   * 生成商品ID
   * @returns {string} 商品ID，格式：item_时间戳_随机字符
   */
  static generateItemId() {
    return this.generateBaseId('item_');
  }

  /**
   * 生成评论ID
   * @returns {string} 评论ID，格式：comment_时间戳_随机字符
   */
  static generateCommentId() {
    return this.generateBaseId('comment_');
  }

  // ========== 聊天相关ID ==========
  
  /**
   * 生成消息ID
   * @returns {string} 消息ID，格式：msg_时间戳_随机字符
   */
  static generateMessageId() {
    return this.generateBaseId('msg_');
  }

  /**
   * 生成聊天会话ID（基于两个用户ID）
   * @param {string|number} userId1 - 用户1的ID
   * @param {string|number} userId2 - 用户2的ID
   * @returns {string} 聊天ID，格式：chat_hash值
   */
  static generateChatId(userId1, userId2) {
    // 方案1：使用完整ID的hash（推荐）
    const sortedIds = [userId1, userId2].sort();
    const combined = sortedIds.join('|');
    const hash = this.generateStableHash(combined);
    return `chat_${hash}`;
  }

  /**
   * 生成稳定的hash值（相同输入始终得到相同输出）
   * @param {string} str - 输入字符串
   * @returns {string} 10位字符的hash
   */
  static generateStableHash(str) {
    let hash = 0;
    let hash2 = 0;
    
    // 使用两个不同的hash算法增加复杂度
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32位整数
      
      hash2 = ((hash2 << 3) + hash2) + char;
      hash2 = hash2 & hash2;
    }
    
    // 组合两个hash值并转为36进制
    const combined = Math.abs(hash) + Math.abs(hash2);
    return combined.toString(36).substr(0, 10);
  }

  /**
   * 生成聊天会话ID（备用方案 - 基于数字ID）
   * 仅在userId都是纯数字时使用
   * @param {number} userId1 - 用户1的数字ID
   * @param {number} userId2 - 用户2的数字ID
   * @returns {string} 聊天ID，格式：chat_小ID_大ID
   */
  static generateSimpleChatId(userId1, userId2) {
    const id1 = parseInt(userId1);
    const id2 = parseInt(userId2);
    if (isNaN(id1) || isNaN(id2)) {
      throw new Error('Simple chat ID requires numeric user IDs');
    }
    const [smallerId, largerId] = [id1, id2].sort((a, b) => a - b);
    return `chat_${smallerId}_${largerId}`;
  }

  // ========== 订单/交易相关ID ==========
  
  /**
   * 生成订单ID
   * @returns {string} 订单ID，格式：order_时间戳_随机字符
   */
  static generateOrderId() {
    return this.generateBaseId('order_');
  }

  /**
   * 生成交易ID
   * @returns {string} 交易ID，格式：trade_时间戳_随机字符
   */
  static generateTradeId() {
    return this.generateBaseId('trade_');
  }

  // ========== 系统相关ID ==========
  
  /**
   * 生成通知ID
   * @returns {string} 通知ID，格式：notif_时间戳_随机字符
   */
  static generateNotificationId() {
    return this.generateBaseId('notif_');
  }

  /**
   * 生成请求ID（用于API请求去重）
   * @returns {string} 请求ID，格式：req_时间戳_随机字符
   */
  static generateRequestId() {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substr(2, 6); // 请求ID用短一点的随机字符
    return `req_${timestamp}_${randomStr}`;
  }

  /**
   * 生成临时ID（用于乐观更新）
   * @param {string} type - 类型前缀
   * @returns {string} 临时ID，格式：temp_类型_时间戳_随机字符
   */
  static generateTempId(type) {
    return this.generateBaseId(`temp_${type}_`);
  }

  // ========== 工具方法 ==========
  
  /**
   * 从ID中提取数字部分（用于排序和比较）
   * @param {string|number} id - 原始ID
   * @returns {number} 提取的数字
   */
  static extractIdNumber(id) {
    if (typeof id === 'number') return id;
    
    // 如果是字符串ID，提取时间戳部分
    const match = id.toString().match(/(\d+)/);
    return match ? parseInt(match[1]) : Date.now();
  }

  /**
   * 验证ID格式是否正确
   * @param {string} id - 要验证的ID
   * @param {string} expectedPrefix - 期望的前缀
   * @returns {boolean} 是否有效
   */
  static validateId(id, expectedPrefix) {
    if (!id || typeof id !== 'string') return false;
    return id.startsWith(expectedPrefix);
  }

  /**
   * 检查ID是否为临时ID
   * @param {string} id - 要检查的ID
   * @returns {boolean} 是否为临时ID
   */
  static isTempId(id) {
    return id && id.startsWith('temp_');
  }

  /**
   * 从临时ID生成对应的真实ID类型
   * @param {string} tempId - 临时ID
   * @returns {string|null} 真实ID类型前缀
   */
  static getRealIdTypeFromTemp(tempId) {
    if (!this.isTempId(tempId)) return null;
    
    // temp_post_1703123456789_abc123 -> post_
    const match = tempId.match(/^temp_([^_]+)_/);
    return match ? `${match[1]}_` : null;
  }

  // ========== 批量生成方法 ==========
  
  /**
   * 批量生成指定类型的ID
   * @param {string} type - ID类型
   * @param {number} count - 生成数量
   * @returns {string[]} ID数组
   */
  static generateBatch(type, count = 1) {
    const ids = [];
    const methodName = `generate${type.charAt(0).toUpperCase() + type.slice(1)}Id`;
    
    if (typeof this[methodName] === 'function') {
      for (let i = 0; i < count; i++) {
        ids.push(this[methodName]());
        // 确保时间戳不同
        if (i < count - 1) {
          this.sleep(1);
        }
      }
    }
    
    return ids;
  }

  /**
   * 简单的延迟方法
   * @param {number} ms - 延迟毫秒数
   */
  static sleep(ms) {
    const start = Date.now();
    while (Date.now() - start < ms) {
      // 忙等待
    }
  }

  // ========== 调试方法 ==========
  
  /**
   * 解析ID信息（调试用）
   * @param {string} id - 要解析的ID
   * @returns {object} 解析结果
   */
  static parseId(id) {
    if (!id || typeof id !== 'string') {
      return { valid: false, error: 'Invalid ID' };
    }

    const parts = id.split('_');
    if (parts.length < 3) {
      return { valid: false, error: 'Invalid ID format' };
    }

    const [prefix, timestamp, ...randomParts] = parts;
    const randomStr = randomParts.join('_');

    return {
      valid: true,
      prefix: prefix + '_',
      timestamp: parseInt(timestamp),
      timeString: new Date(parseInt(timestamp)).toLocaleString(),
      randomPart: randomStr,
      isTemp: prefix === 'temp'
    };
  }

  /**
   * 打印ID统计信息（调试用）
   */
  static printStats() {
    const methods = Object.getOwnPropertyNames(this)
      .filter(name => name.startsWith('generate') && name.endsWith('Id'))
      .filter(name => name !== 'generateBaseId');
    
    console.log('=== ID Generator 可用方法 ===');
    methods.forEach(method => {
      const example = this[method]();
      console.log(`${method}(): ${example}`);
    });
  }
}

module.exports = idGenerator;