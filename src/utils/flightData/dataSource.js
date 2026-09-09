export async function loadPrimaryThenFallback(loadPrimary, loadFallback) {
  try {
    const result = await loadPrimary()
    if (result) return result
  } catch (error) {
    if (error?.name === 'AbortError') throw error
  }
  return loadFallback()
}
