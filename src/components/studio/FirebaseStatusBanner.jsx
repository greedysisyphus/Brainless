import { CwAlert } from './ui'

export function FirebaseStatusBanner({ errorMessage }) {
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
