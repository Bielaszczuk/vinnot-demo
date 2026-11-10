export const checkoutReturnBrowser = {
  open(url: string) {
    window.location.assign(url)
  },
  /** iPadOS reports a desktop Safari user agent, so touch support identifies it. */
  isMobileDevice() {
    const { userAgent, maxTouchPoints } = window.navigator
    return (
      /Android|iPhone|iPad|iPod/i.test(userAgent) ||
      (/Macintosh/i.test(userAgent) && maxTouchPoints > 1)
    )
  },
}
