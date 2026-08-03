function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    // matchMedia unavailable in some very old browsers - an instant jump is
    // always safe.
    return true
  }
}

/** Scroll to the top of the page, smoothly unless the user prefers reduced
 *  motion. */
export function scrollToTop(): void {
  window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
}

/** Bring an element to the middle of the screen - used to carry the user to
 *  the first field that still needs filling in when they try to submit. */
export function scrollIntoViewGently(el: HTMLElement | null): void {
  el?.scrollIntoView({
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    block: 'center',
  })
}
