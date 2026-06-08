import { useTheme } from '../../contexts/ThemeContext'
import { StudioPageChrome } from './StudioPageChrome'

/**
 * @param classic — Classic 視圖（整頁 JSX，不包含 Studio Shell）
 * @param studio — 僅在 studio theme 渲染，已由 PageChrome 包裹內緣 content
 * @param hideStudioHeader — 為 true 時不顯示麵包屑／標題／描述（頁面自管標題時使用）
 */
export function DualThemePage({
  breadcrumbs = [],
  title,
  description,
  classic,
  studio,
  hideStudioHeader = false,
}) {
  const { isStudio } = useTheme()
  if (!isStudio) return classic
  if (hideStudioHeader) {
    return (
      <StudioPageChrome breadcrumbs={[]} title={undefined} description={undefined}>
        {studio}
      </StudioPageChrome>
    )
  }
  return (
    <StudioPageChrome breadcrumbs={breadcrumbs} title={title} description={description}>
      {studio}
    </StudioPageChrome>
  )
}
