/**
 * Frame of each kind of uploaded photo (width / height), matching where it is
 * shown, so what the user frames before uploading is what everyone sees.
 */
export const IMAGE_ASPECT = {
  /** Event and wine route covers, shown 16:9 in cards. */
  COVER: 16 / 9,
  /** Profile photos, shown round. */
  AVATAR: 1,
  /** Admin wine (catalog) photos. */
  WINE: 3 / 4,
  /** Admin winery logos, shown in a square box. */
  LOGO: 1,
} as const

export type ImageFrameKind = keyof typeof IMAGE_ASPECT

/** The widest place a cover appears (web detail hero, 21:8): its strip is visible everywhere. */
export const COVER_GUIDE_BAND_ASPECT = 21 / 8
