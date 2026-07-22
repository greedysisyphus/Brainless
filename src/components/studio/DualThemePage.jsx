import { useTheme } from '../../contexts/ThemeContext'
import { StudioPageChrome } from './StudioPageChrome'

/**
 * Classic 與 Club（現代）雙視圖切換。
 * @param classic — Classic 視圖
 * @param studio — Club 現代視圖（Cw* 元件區塊；prop 名保留向後相容）
 * @param hideStudioHeader — 為 true 時不顯示麵包屑／標題／描述
 */
export function DualThemePage({
  breadcrumbs = [],
  title,
  description,
  classic,
  studio,
  hideStudioHeader = false,
}) {
  const { isModern, isClub } = useTheme()
  if (!isModern) return classic
  if (hideStudioHeader) {
    return (
      <StudioPageChrome breadcrumbs={[]} title={undefined} description={undefined}>
        {studio}
      </StudioPageChrome>
    )
  }
  return (
    <StudioPageChrome breadcrumbs={isClub ? [] : breadcrumbs} title={title} description={description}>
      {studio}
    </StudioPageChrome>
  )
}
