import { useState, useEffect } from 'react';

function CashManagement() {
  // 初始化時從 localStorage 讀取數據
  const [cashData, setCashData] = useState(() => {
    const savedData = localStorage.getItem('cashManagementData');
    return savedData ? JSON.parse(savedData) : {
      openingCash: '',
      closingCash: '',
      creditCard: '',
      linePay: '',
      jkoPay: '',
      expenses: [],
      sales: {
        cash: '',
        card: '',
        linePay: '',
        jkoPay: ''
      }
    };
  });

  // 當數據變更時保存到 localStorage
  useEffect(() => {
    localStorage.setItem('cashManagementData', JSON.stringify(cashData));
  }, [cashData]);

  // 重置功能
  const handleReset = () => {
    const confirmReset = window.confirm('確定要重置所有數據嗎？');
    if (confirmReset) {
      setCashData({
        openingCash: '',
        closingCash: '',
        creditCard: '',
        linePay: '',
        jkoPay: '',
        expenses: [],
        sales: {
          cash: '',
          card: '',
          linePay: '',
          jkoPay: ''
        }
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4">
      <div className="bg-surface rounded-2xl p-6 shadow-xl">
        {/* 標題和重置按鈕 */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">收銀管理</h2>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            重置數據
          </button>
        </div>

        {/* 原有的表單內容 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ... 其他表單內容 ... */}
        </div>
      </div>
    </div>
  );
}

export default CashManagement; 