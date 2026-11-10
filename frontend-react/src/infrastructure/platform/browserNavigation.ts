/** Browser navigation the application layer asks for, kept out of components and services. */
export const browserNavigation = {
  /** Leaves the app for an external page in the same tab, e.g. an OAuth authorize URL that redirects back. */
  leaveTo(url: string): void {
    window.location.assign(url)
  },
}
