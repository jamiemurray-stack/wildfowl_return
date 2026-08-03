/** Scroll to the top of the page, smoothly unless the user prefers reduced
 *  motion (matchMedia is unavailable in some very old browsers - fall back
 *  to an instant jump, which is always safe). */
export function scrollToTop(): void {
  let reduce = false
  try {
    reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    reduce = true
  }
  window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
}
