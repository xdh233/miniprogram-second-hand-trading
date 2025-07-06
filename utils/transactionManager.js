// utils/transactionManager.js
const apiConfig = require('./apiConfig'); // 确保这里引入了 apiConfig

class TransactionManager {
  constructor() {
  }

  // 处理完整购买流程（余额转移 + 交易记录创建 + 商品状态更新）
  async processPurchase(buyerId, sellerId, itemId, amount, itemTitle) {
    try {
      const response = await apiConfig.post('/transactions/purchase', {
        buyerId,
        sellerId,
        itemId,
        amount,
        itemTitle
      });

      console.log('后端购买流程成功响应:', response);
      return { success: true, message: response.message };

    } catch (error) {
      console.error('前端调用购买接口失败:', error);
      throw new Error(error.message || '购买失败');
    }
  }

  async getTransactionsByBuyer(buyerId) {
    try {
      // 从 apiConfig.get 获取到的 response 变量，它本身就是后端返回的交易记录数组
      const response = await apiConfig.get(`/transactions/buyer/${buyerId}`);

      console.log(`从后端获取买家 ${buyerId} 的交易记录:`, response); 

      return Array.isArray(response) ? response : []; 
    } catch (error) {
      console.error(`获取买家 ${buyerId} 交易记录失败:`, error);
      throw new Error(error.message || '获取购买记录失败');
    }
  }

  // 获取用户作为卖家的交易记录 - 现在从后端API获取
  async getTransactionsBySeller(sellerId) {
    try {
      const response = await apiConfig.get(`/transactions/seller/${sellerId}`);

      console.log(`从后端获取卖家 ${sellerId} 的交易记录:`, response); 
      
      return Array.isArray(response) ? response : []; 
    } catch (error) {
      console.error(`获取卖家 ${sellerId} 交易记录失败:`, error);
      throw new Error(error.message || '获取销售记录失败');
    }
  }

  // 获取特定商品的交易记录 - 现在从后端API获取
  async getTransactionsByItem(itemId) {
    try {
      const response = await apiConfig.get(`/transactions/item/${itemId}`);

      console.log(`从后端获取商品 ${itemId} 的交易记录:`, response);
      
      return Array.isArray(response) ? response : []; 
    } catch (error) {
      console.error(`获取商品 ${itemId} 交易记录失败:`, error);
      throw new Error(error.message || '获取商品交易记录失败');
    }
  }
}

const transactionManager = new TransactionManager();
module.exports = transactionManager;