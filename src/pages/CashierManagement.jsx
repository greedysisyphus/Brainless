import { useState, useEffect } from 'react'
import DenominationCounter from '../components/cashier/DenominationCounter'
import ForeignCurrency from '../components/cashier/ForeignCurrency'
import Summary from '../components/cashier/Summary'

function CashierManagement() {
  // 從 localStorage 讀取初始值
  const [cashierTotal, setCashierTotal] = useState(() => {
    const saved = localStorage.getItem('cashierTotal')
    return saved ? parseFloat(saved) : 0
  })
  
  const [drawerTotal, setDrawerTotal] = useState(() => {
    const saved = localStorage.getItem('drawerTotal')
    return saved ? parseFloat(saved) : 0
  })
  
  const [foreignTotal, setForeignTotal] = useState(() => {
    const saved = localStorage.getItem('foreignTotal')
    return saved ? parseFloat(saved) : 0
  })
  
  const [posAmount, setPosAmount] = useState(() => {
    const saved = localStorage.getItem('posAmount')
    return saved ? parseFloat(saved) : 0
  })

  // 當數值改變時保存到 localStorage
  useEffect(() => {
    localStorage.setItem('cashierTotal', cashierTotal)
    localStorage.setItem('drawerTotal', drawerTotal)
    localStorage.setItem('foreignTotal', foreignTotal)
    localStorage.setItem('posAmount', posAmount)
  }, [cashierTotal, drawerTotal, foreignTotal, posAmount])

  // 重置所有數據
  const resetAll = () => {
    // 重置狀態
    setCashierTotal(0)
    setDrawerTotal(0)
    setForeignTotal(0)
    setPosAmount(0)

    // 清除所有相關的 localStorage 數據
    localStorage.removeItem('cashierTotal')
    localStorage.removeItem('drawerTotal')
    localStorage.removeItem('foreignTotal')
    localStorage.removeItem('posAmount')
    localStorage.removeItem('cashierDenominations')
    localStorage.removeItem('drawerDenominations')
    localStorage.removeItem('foreignTransactions')

    // 強制重新加載組件
    window.location.reload()
  }

  return (
    <div className="container-custom py-8">
      <div className="flex justify-end mb-4">
        <button
          onClick={resetAll}
          className="btn-primary bg-red-500 hover:bg-red-600"
        >
          重置所有數據
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DenominationCounter
          title="收銀機現金"
          onTotalChange={setCashierTotal}
          savedKey="cashierDenominations"
        />
        
        <DenominationCounter
          title="抽屜現金"
          onTotalChange={setDrawerTotal}
          savedKey="drawerDenominations"
        />
        
        <ForeignCurrency
          onTotalChange={setForeignTotal}
          savedKey="foreignTransactions"
        />
        
        <Summary
          cashierTotal={cashierTotal}
          drawerTotal={drawerTotal}
          foreignTotal={foreignTotal}
          posAmount={posAmount}
          onPosAmountChange={setPosAmount}
        />
      </div>
    </div>
  )
}

export default CashierManagement 