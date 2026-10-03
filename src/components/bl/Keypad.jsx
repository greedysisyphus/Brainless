// 頁內數字鍵盤：手機、平板上不叫系統鍵盤（位置會跳、會蓋住畫面），數字鍵固定長在底部。
// children 放在最後一列（下一筆、刪除等動作鍵）。樣式在 bl.css 的 .bl-pad。
export const PAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back']

export function Keypad({ onKey, children }) {
  return (
    <div className="bl-pad">
      {PAD_KEYS.map((key) => (
        <button key={key} type="button" className="k" aria-label={key === 'back' ? '倒退' : key === '.' ? '小數點' : key} onClick={() => onKey(key)}>
          {key === 'back' ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 6h11v12H9l-5-6zM12 10l4 4M16 10l-4 4" />
            </svg>
          ) : (
            key
          )}
        </button>
      ))}
      {children}
    </div>
  )
}
