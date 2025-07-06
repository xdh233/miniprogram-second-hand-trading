// utils/priceProcess.js - 统一的价格处理工具
class PriceProcess {
  constructor() {
    this.config = {
      max: 99999,        // 最大价格限制
      maxDigits: 5,      // 整数部分最大位数
      decimalPlaces: 2   // 小数部分最大位数
    };
  }

  /**
   * 格式化价格输入
   * @param {string} value - 输入的价格字符串
   * @param {number} maxValue - 最大价格限制（可选）
   * @returns {object} { value: 格式化后的值, isValid: 是否有效, error: 错误信息 }
   */
  formatPriceInput(value, maxValue = this.config.max) {
    if (!value) {
      return { value: '', isValid: true, error: null };
    }

    // 只允许数字和小数点
    let cleanValue = value.replace(/[^\d.]/g, '');
    
    // 防止以小数点开头
    if (cleanValue.startsWith('.')) {
      cleanValue = '0' + cleanValue;
    }

    // 处理小数点
    const dotIndex = cleanValue.indexOf('.');
    if (dotIndex !== -1) {
      // 有小数点的情况
      const beforeDot = cleanValue.substring(0, dotIndex);
      const afterDot = cleanValue.substring(dotIndex + 1);
      
      // 移除后面部分的所有小数点
      const cleanAfterDot = afterDot.replace(/\./g, '');
      
      // 限制整数部分位数
      const limitedBeforeDot = beforeDot.substring(0, this.config.maxDigits);
      
      // 限制小数部分位数
      const limitedAfterDot = cleanAfterDot.substring(0, this.config.decimalPlaces);
      
      cleanValue = limitedBeforeDot + '.' + limitedAfterDot;
    } else {
      // 没有小数点的情况，限制整数部分位数
      cleanValue = cleanValue.substring(0, this.config.maxDigits);
    }

    // 检查数值是否超过上限
    const numericValue = parseFloat(cleanValue);
    if (!isNaN(numericValue) && numericValue > maxValue) {
      return {
        value: cleanValue,
        isValid: false,
        error: `价格不能超过${maxValue}元`
      };
    }

    return {
      value: cleanValue,
      isValid: true,
      error: null
    };
  }

  /**
   * 验证价格有效性
   * @param {string|number} price - 价格
   * @param {number} maxValue - 最大价格限制（可选）
   * @returns {object} { isValid: 是否有效, error: 错误信息 }
   */
  validatePrice(price, maxValue = this.config.max) {
    if (!price || price === '') {
      return { isValid: false, error: '请输入价格' };
    }

    const numericPrice = parseFloat(price);
    
    if (isNaN(numericPrice)) {
      return { isValid: false, error: '请输入有效的价格' };
    }

    if (numericPrice <= 0) {
      return { isValid: false, error: '价格必须大于0' };
    }

    if (numericPrice > maxValue) {
      return { isValid: false, error: `价格不能超过${maxValue}元` };
    }

    return { isValid: true, error: null };
  }

  /**
   * 格式化价格显示
   * @param {string|number} price - 价格
   * @returns {string} 格式化后的价格字符串
   */
  formatPriceDisplay(price) {
    if (!price || price === '') return '0.00';
    
    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice)) return '0.00';
    
    return numericPrice.toFixed(2);
  }

  /**
   * 比较两个价格是否相等
   * @param {string|number} price1 - 价格1
   * @param {string|number} price2 - 价格2
   * @returns {boolean} 是否相等
   */
  comparePrices(price1, price2) {
    const num1 = parseFloat(price1);
    const num2 = parseFloat(price2);
    
    if (isNaN(num1) || isNaN(num2)) return false;
    
    return Math.abs(num1 - num2) < 0.01; // 允许0.01的误差
  }
}

// 导出单例实例
const priceProcess = new PriceProcess();

// 在小程序中使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = priceProcess;
}

// 在页面中使用的通用方法
const PriceMixin = {
  /**
   * 价格输入处理
   * @param {object} e - 事件对象
   * @param {string} dataKey - 数据键名，默认为'price'
   * @param {string} tradeType - 交易类型，用于错误提示
   */
  handlePriceInput(e, dataKey = 'price', tradeType = 'sell') {
    const inputValue = e.detail.value;
    const currentData = this.data[dataKey] || '';
    
    // 使用统一的格式化方法
    const result = priceProcess.formatPriceInput(inputValue, this.data.priceConfig?.max);
    
    if (!result.isValid && result.error) {
      // 显示错误提示
      const priceLabel = tradeType === 'sell' ? '价格' : '预算';
      wx.showToast({
        title: result.error.replace('价格', priceLabel),
        icon: 'none',
        duration: 1000
      });
      return; // 保持原值不变
    }
    
    // 更新数据
    this.setData({
      [dataKey]: result.value
    });
  },

  /**
   * 价格验证
   * @param {string|number} price - 价格
   * @param {string} tradeType - 交易类型
   * @returns {boolean} 是否有效
   */
  validatePrice(price, tradeType = 'sell') {
    const result = priceProcess.validatePrice(price, this.data.priceConfig?.max);
    
    if (!result.isValid) {
      const priceLabel = tradeType === 'sell' ? '价格' : '预算';
      wx.showToast({
        title: result.error.replace('价格', priceLabel),
        icon: 'none'
      });
      return false;
    }
    
    return true;
  },

  /**
   * 价格编辑确认
   * @param {string} newPrice - 新价格
   * @param {string} originalPrice - 原价格
   * @param {string} itemId - 商品ID
   * @param {function} updateCallback - 更新回调函数
   */
  async confirmPriceEdit(newPrice, originalPrice, itemId, updateCallback) {
    // 验证价格
    if (!this.validatePrice(newPrice)) {
      return;
    }

    // 如果价格没有变化，直接关闭
    if (priceProcess.comparePrices(newPrice, originalPrice)) {
      this.hidePriceModal();
      return;
    }

    try {
      // 执行更新
      await updateCallback(itemId, parseFloat(newPrice));
      
      wx.showToast({
        title: '价格修改成功',
        icon: 'success'
      });
      
      // 关闭弹窗
      this.hidePriceModal();
      
      // 重新加载数据
      if (this.loadSoldItems) {
        this.loadSoldItems();
      } else if (this.loadBoughtItems) {
        this.loadBoughtItems();
      }
      
    } catch (error) {
      console.error('修改价格失败:', error);
      wx.showToast({
        title: error.message || '修改失败，请重试',
        icon: 'none'
      });
    }
  }
};

// 统一的价格配置
const PRICE_CONFIG = {
  max: 99999,
  min: 0.01,
  maxDigits: 5,
  decimalPlaces: 2
};

// 导出配置和工具
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    priceProcess,
    PriceMixin,
    PRICE_CONFIG
  };
}