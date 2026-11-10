/**
 * PourGhost — the drag demo for new raters: a see-through copy of the bottle leaves its stand,
 * glides over the glasses tilted to pour while they fill faintly, then fades as the preview
 * drains, and repeats. PourBarGhost glides a see-through glass along the slider bar on the same
 * timeline. Purely decorative: they ignore the pointer and never touch the real score.
 */

import { useEffect, useState } from 'react'
import { RATING_MAX, glassFills } from '@domain/wine/wine.rating'
import { GLASS_ART, wineClip, wineImage, type RatingLook } from './ratingLook'
import { barThumbLeft, bottlePose, ghostFrame, glassLeft, standPose, trackStyle, type BarLayout, type PourLayout } from './pourGeometry'
import { PourBottle } from './PourBottle'
import { RatingGlass } from './RatingGlass'

const FRAME_MS = 33
/** The demo bottle is a preview, never mistaken for the real one. */
const GHOST_BOTTLE_OPACITY = 0.45

/** The demo frame since mount; the bottle and the bar ghosts mount together, so they move as one. */
function useGhostFrame() {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const start = Date.now()
    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      setElapsed(Date.now() - start)
      timer = setTimeout(tick, FRAME_MS)
    }
    timer = setTimeout(tick, FRAME_MS)
    return () => clearTimeout(timer)
  }, [])
  return ghostFrame(elapsed)
}

export function PourGhost({ layout, look }: { layout: PourLayout; look: RatingLook }) {
  const frame = useGhostFrame()
  const box = GLASS_ART[look.glass].box
  // Same path as the real bottle: off the stand on a small arc, then over the glass it pours into.
  const stand = standPose(layout)
  const pour = bottlePose(Math.max(0.01, frame.score), layout, look, true)
  const lift = Math.sin(Math.PI * frame.held) * layout.glassHeight * 0.25
  const place = {
    left: stand.left + (pour.left - stand.left) * frame.held,
    top: stand.top + (pour.top - stand.top) * frame.held - lift,
    rotate: stand.rotate + (pour.rotate - stand.rotate) * frame.held,
  }
  return (
    <div className="vp-ghost" aria-hidden="true" data-testid="pour-ghost">
      {glassFills(frame.score).map((fill, index) => (
        <span
          key={index}
          className="vp-ghost-glass"
          data-fill={fill}
          style={{ left: glassLeft(layout, index), top: layout.top, width: layout.glassWidth, height: layout.glassHeight }}
        >
          <img src={wineImage(look.wine)} alt="" draggable={false} style={{ clipPath: wineClip(box, fill) }} />
        </span>
      ))}
      <div className="vp-ghost-bottle" style={{ opacity: GHOST_BOTTLE_OPACITY * frame.opacity }}>
        <PourBottle
          layout={layout}
          look={look}
          place={place}
          standing={false}
          corked={false}
          uncork={1}
          remaining={1 - frame.score / RATING_MAX}
          shadow={false}
        />
      </div>
    </div>
  )
}

/** The demo on the slider bar: a see-through glass and a faint wine track up to the demo score. */
export function PourBarGhost({ layout, bar, look }: { layout: PourLayout; bar: BarLayout; look: RatingLook }) {
  const frame = useGhostFrame()
  return (
    <div className="vp-bar-ghost" aria-hidden="true" data-testid="pour-bar-ghost" style={{ opacity: frame.opacity }}>
      <span className="vp-bar-fill" style={trackStyle(frame.score, layout, bar, look)} />
      <span className="vp-bar-thumb" style={{ left: barThumbLeft(frame.score, layout, bar) }}>
        <RatingGlass look={look} fill={Math.round((frame.score / RATING_MAX) * 100) / 100} height={bar.glassHeight} />
      </span>
    </div>
  )
}
