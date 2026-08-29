import { StudioPageChrome } from './StudioPageChrome'

/**
 * Club 頁面 chrome。`studio` 為頁面主內容（prop 名沿用既有呼叫端）。
 */
export function DualThemePage({
  breadcrumbs = [],
  title,
  description,
  studio,
  hideStudioHeader = false,
}) {
  if (hideStudioHeader) {
    return (
      <StudioPageChrome breadcrumbs={[]} title={undefined} description={undefined}>
        {studio}
      </StudioPageChrome>
    )
  }
  return (
    <StudioPageChrome breadcrumbs={[]} title={title} description={description}>
      {studio}
    </StudioPageChrome>
  )
}
