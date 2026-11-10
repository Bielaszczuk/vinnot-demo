/** How many times this browser has rated with the pour control; blocked storage reads as none. */
const key = 'vinnot.rating-gesture-count.v1'

export const ratingGestureStorage = {
  readCount(): number {
    try {
      const count = Number(localStorage.getItem(key))
      return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0
    } catch {
      return 0
    }
  },
  writeCount(count: number): void {
    try {
      localStorage.setItem(key, String(count))
    } catch {
      /* The drag demo shows one more time. */
    }
  },
}
