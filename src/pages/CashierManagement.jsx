import { useState, useEffect } from 'react'
import DenominationCounter from '../components/cashier/DenominationCounter'
import ForeignCurrency from '../components/cashier/ForeignCurrency'
import Summary from '../components/cashier/Summary'

function CashierManagement() {
  const [cashierTotal, setCashierTotal] = useState(0)
  const [drawerTotal, setDrawerTotal] = useState(0)
  const [foreignTotal, setForeignTotal] = useState(0)
  const [posAmount, setPosAmount] = useState(0)
  
  return (
    <div className="container-custom py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DenominationCounter
          title="收銀機現金"
          onTotalChange={setCashierTotal}
        />
        
        <DenominationCounter
          title="抽屜現金"
          onTotalChange={setDrawerTotal}
        />
        
        <ForeignCurrency
          onTotalChange={setForeignTotal}
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