import { CwAlert } from './ui'

/** App 層 Firebase 連線失敗時的全域提示（Classic / Studio 各一） */
export function FirebaseStatusBanner({ isStudio, errorMessage }) {
  if (isStudio) {
    return (
      <div className="m-4">
        <CwAlert title="Firebase 連接警告" variant="warning">
          <p>
            應用程式無法連接到 Firebase 服務。部分功能可能無法正常工作。
            {errorMessage ? (
              <span className="mt-1 block font-medium text-[var(--cw-text)]">錯誤：{errorMessage}</span>
            ) : null}
          </p>
          <p className="mt-3 text-xs">您仍可使用本應用，但資料將不會同步至雲端。</p>
        </CwAlert>
      </div>
    )
  }
  return (
    <div className="m-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
      <h3 className="mb-2 font-bold text-amber-500">Firebase 連接警告</h3>
      <p className="text-sm text-text-secondary">
        應用程序無法連接到 Firebase 服務。部分功能可能無法正常工作。
        {errorMessage ? <span className="mt-1 block">錯誤: {errorMessage}</span> : null}
      </p>
      <p className="mt-2 text-xs text-text-secondary">您仍然可以使用應用程序，但數據將不會同步到雲端。</p>
    </div>
  )
}
