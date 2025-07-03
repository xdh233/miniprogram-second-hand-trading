class TransactionManager {
  constructor() {
    this.TRANSACTIONS_KEY = 'campus_transactions';
  }

  // ===== 核心交易方法 =====

  // 创建交易记录（仅用于直接购买）
  async createTransaction(transactionData) {
    try {
      const { buyer_id, seller_id, item_id, amount, item_title } = transactionData;
      
      // 参数验证
      if (!buyer_id || !seller_id || !item_id || !amount) {
        throw new Error('交易参数不完整');
      }

      if (buyer_id === seller_id) {
        throw new Error('买家和卖家不能是同一人');
      }

      // 生成交易记录
      const transaction = {
        id: Date.now(),
        buyer_id,
        seller_id,
        item_id,
        amount: parseFloat(amount),
        type: 'direct_buy',
        status: 'completed',
        item_title: item_title || '',
        created_at: new Date().toISOString()
      };

      // 保存交易记录
      const transactions = this.getAllTransactions();
      transactions.push(transaction);
      this.saveTransactions(transactions);

      console.log('交易记录已创建:', transaction);
      return transaction;

    } catch (error) {
      console.error('创建交易记录失败:', error);
      throw error;
    }
  }

  // 处理完整购买流程（余额转移 + 交易记录）
  async processPurchase(buyerId, sellerId, itemId, amount, itemTitle) {
    try {
      // 1. 余额转移
      await this.transferBalance(buyerId, sellerId, amount, itemTitle);

      // 2. 创建交易记录  
      const transaction = await this.createTransaction({
        buyer_id: buyerId,
        seller_id: sellerId,
        item_id: itemId,
        amount: amount,
        item_title: itemTitle
      });

      return {
        success: true,
        transaction: transaction
      };

    } catch (error) {
      console.error('购买流程失败:', error);
      throw error;
    }
  }

  // 余额转移（原子操作）
  async transferBalance(buyerId, sellerId, amount, description) {
    const userManager = require('./userManager');
    
    try {
      // 扣除买家余额
      await userManager.updateUserBalanceById(
        buyerId, 
        amount, 
        'subtract', 
        `购买商品：${description}`
      );

      // 增加卖家余额  
      await userManager.updateUserBalanceById(
        sellerId, 
        amount, 
        'add', 
        `销售商品：${description}`
      );

      console.log('余额转移成功:', { buyerId, sellerId, amount });

    } catch (error) {
      console.error('余额转移失败:', error);
      
      // 如果是卖家余额增加失败，尝试回滚买家扣款
      if (error.message.includes('seller') || error.step === 'seller_update_failed') {
        try {
          await userManager.updateUserBalanceById(
            buyerId, 
            amount, 
            'add', 
            `退款：购买${description}失败`
          );
        } catch (rollbackError) {
          console.error('回滚失败:', rollbackError);
        }
      }
      
      throw error;
    }
  }

  // ===== 查询方法 =====

  // 获取用户作为买家的交易记录
  getTransactionsByBuyer(buyerId) {
    const transactions = this.getAllTransactions();
    return transactions
      .filter(t => t.buyer_id === buyerId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  // 获取用户作为卖家的交易记录
  getTransactionsBySeller(sellerId) {
    const transactions = this.getAllTransactions();
    return transactions
      .filter(t => t.seller_id === sellerId)  
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  // 获取特定商品的交易记录
  getTransactionsByItem(itemId) {
    const transactions = this.getAllTransactions();
    return transactions.filter(t => t.item_id === itemId);
  }

  // ===== 数据存储方法 =====

  getAllTransactions() {
    try {
      return wx.getStorageSync(this.TRANSACTIONS_KEY) || [];
    } catch (error) {
      console.error('获取交易记录失败:', error);
      return [];
    }
  }

  saveTransactions(transactions) {
    try {
      // 只保留最近500条记录
      if (transactions.length > 500) {
        transactions = transactions.slice(-500);
      }
      
      wx.setStorageSync(this.TRANSACTIONS_KEY, transactions);
      return true;
    } catch (error) {
      console.error('保存交易记录失败:', error);
      return false;
    }
  }

  // ===== 调试方法 =====

  // 清空所有交易记录
  clearAllTransactions() {
    try {
      wx.removeStorageSync(this.TRANSACTIONS_KEY);
      console.log('已清空所有交易记录');
      return true;
    } catch (error) {
      console.error('清空交易记录失败:', error);
      return false;
    }
  }

  // 获取交易记录总数
  getTransactionCount() {
    return this.getAllTransactions().length;
  }
}

const transactionManager = new TransactionManager();
module.exports = transactionManager;