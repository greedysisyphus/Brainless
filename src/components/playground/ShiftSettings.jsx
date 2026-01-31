import { useState, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../utils/firebase'
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'

function ShiftSettings() {
  const [shifts, setShifts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingShift, setEditingShift] = useState(null)
  const [formData, setFormData] = useState({
    store: '',
    shiftName: '',
    startTime: '',
    endTime: ''
  })

  // 載入班別列表
  useEffect(() => {
    const q = query(collection(db, 'shifts'), orderBy('store', 'asc'), orderBy('shiftName', 'asc'))
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const shiftsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setShifts(shiftsData)
      setIsLoading(false)
    }, (error) => {
      console.error('載入班別失敗:', error)
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // 開啟新增/編輯模態框
  const openModal = (shift = null) => {
    if (shift) {
      setEditingShift(shift)
      setFormData({
        store: shift.store || '',
        shiftName: shift.shiftName || '',
        startTime: shift.startTime || '',
        endTime: shift.endTime || ''
      })
    } else {
      setEditingShift(null)
      setFormData({
        store: '',
        shiftName: '',
        startTime: '',
        endTime: ''
      })
    }
    setIsModalOpen(true)
  }

  // 關閉模態框
  const closeModal = () => {
    setIsModalOpen(false)
    setEditingShift(null)
    setFormData({
      store: '',
      shiftName: '',
      startTime: '',
      endTime: ''
    })
  }

  // 儲存班別
  const saveShift = async () => {
    if (!formData.store.trim() || !formData.shiftName.trim() || !formData.startTime.trim() || !formData.endTime.trim()) {
      alert('請填寫所有欄位')
      return
    }

    try {
      const shiftData = {
        store: formData.store.trim(),
        shiftName: formData.shiftName.trim(),
        startTime: formData.startTime.trim(),
        endTime: formData.endTime.trim(),
        updatedAt: serverTimestamp()
      }

      if (editingShift) {
        // 更新現有班別
        await updateDoc(doc(db, 'shifts', editingShift.id), shiftData)
      } else {
        // 新增班別
        shiftData.createdAt = serverTimestamp()
        await addDoc(collection(db, 'shifts'), shiftData)
      }

      closeModal()
    } catch (error) {
      console.error('儲存班別失敗:', error)
      alert('儲存失敗，請稍後再試')
    }
  }

  // 刪除班別
  const deleteShift = async (shiftId) => {
    if (!confirm('確定要刪除此班別嗎？')) return

    try {
      await deleteDoc(doc(db, 'shifts', shiftId))
    } catch (error) {
      console.error('刪除班別失敗:', error)
      alert('刪除失敗，請稍後再試')
    }
  }

  // 格式化時間顯示（用於驗證）
  const formatTime = (time) => {
    // 支援格式：4:30, 04:30, 13:00, 1:00 pm, 1:00 PM
    return time
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-text-secondary">載入中...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 標題和新增按鈕 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary mb-1">班別設定</h2>
          <p className="text-text-secondary text-sm">管理可用的班別類型，用於月曆班表設定</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          <span>新增班別</span>
        </button>
      </div>

      {/* 班別列表 */}
      {shifts.length === 0 ? (
        <div className="text-center py-12 bg-surface/40 rounded-lg border border-white/10">
          <p className="text-text-secondary">尚未建立任何班別</p>
          <p className="text-text-secondary text-sm mt-2">點擊「新增班別」開始建立</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shifts.map((shift) => (
            <div
              key={shift.id}
              className="bg-surface/40 backdrop-blur-md border border-white/10 rounded-lg p-4 hover:border-green-500/30 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-primary mb-1">
                    {shift.store} - {shift.shiftName}
                  </h3>
                  <p className="text-text-secondary text-sm">
                    {shift.startTime} - {shift.endTime}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openModal(shift)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    title="編輯"
                  >
                    <PencilIcon className="w-4 h-4 text-text-secondary hover:text-primary" />
                  </button>
                  <button
                    onClick={() => deleteShift(shift.id)}
                    className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                    title="刪除"
                  >
                    <TrashIcon className="w-4 h-4 text-text-secondary hover:text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 新增/編輯模態框 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-white/20 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-primary mb-4">
              {editingShift ? '編輯班別' : '新增班別'}
            </h3>

            <div className="space-y-4">
              {/* 分店 */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  分店名稱
                </label>
                <input
                  type="text"
                  value={formData.store}
                  onChange={(e) => setFormData({ ...formData, store: e.target.value })}
                  placeholder="例如：D13店"
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-primary focus:outline-none focus:border-green-500/50"
                />
              </div>

              {/* 班別名稱 */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  班別名稱
                </label>
                <input
                  type="text"
                  value={formData.shiftName}
                  onChange={(e) => setFormData({ ...formData, shiftName: e.target.value })}
                  placeholder="例如：早班"
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-primary focus:outline-none focus:border-green-500/50"
                />
              </div>

              {/* 開始時間 */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  開始時間
                </label>
                <input
                  type="text"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  placeholder="例如：4:30 或 04:30"
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-primary focus:outline-none focus:border-green-500/50"
                />
                <p className="text-xs text-text-secondary mt-1">支援格式：4:30, 04:30, 1:00 pm</p>
              </div>

              {/* 結束時間 */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  結束時間
                </label>
                <input
                  type="text"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  placeholder="例如：13:00 或 1:00 pm"
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-primary focus:outline-none focus:border-green-500/50"
                />
                <p className="text-xs text-text-secondary mt-1">支援格式：13:00, 1:00 pm, 1:00 PM</p>
              </div>
            </div>

            {/* 按鈕 */}
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-primary rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={saveShift}
                className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
              >
                儲存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ShiftSettings
