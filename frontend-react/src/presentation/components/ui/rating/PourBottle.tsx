/**
 * PourBottle — the bottle of the pour control: the empty bottle, the wine still in it (the full
 * bottle cut at a level surface, so it empties as the glasses fill) and the uncorking of the AI
 * profile scene. Placement and timing come from PourRating.
 */

import { BOTTLE_ART, UNCORK_ART, bottleImage, emptyBottleImage, type RatingLook } from './ratingLook'
import { bottleWineClip, corkBox, uncorkScene, type BottlePose, type PourLayout } from './pourGeometry'

/** Foam at the lip of a sparkling bottle: offset from the centre and size, in stage units. */
const FOAM = [[-4, 7], [3.5, 8], [0, 10], [-2.5, 6.5], [4.5, 6], [1, 7.5]] as const
/** Width of the cork on the AI scene stage, which the uncorking motion is measured in. */
const STAGE_CORK_WIDTH = { still: 12, sparkling: 16 } as const
/** The corkscrew is painted at this share of its pixels on that stage, its tip 110 px from its left. */
const SCREW_SCALE = 0.17
const SCREW_TIP = 110
const WISP_SCALE = 0.2

interface PourBottleProps {
  layout: PourLayout
  look: RatingLook
  place: Pick<BottlePose, 'left' | 'top' | 'rotate'>
  /** Upright on its stand beside the glasses: a short contact shadow instead of a long, soft one. */
  standing: boolean
  corked: boolean
  travel?: 'lift' | 'settle'
  /** 0 corked, 1 open: the progress of the uncorking. */
  uncork: number
  /** Share of the wine still in the bottle, 1 full to 0 empty. */
  remaining: number
  /** Casts its shadow on the card; off for the see-through demo bottle, where it reads as haze. */
  shadow?: boolean
}

const round = (n: number) => Math.round(n * 10) / 10
const move = (dx: number, dy: number, rotate: number) => `translate(${round(dx)}px, ${round(dy)}px) rotate(${round(rotate)}deg)`

export function PourBottle({ layout, look, place, standing, corked, travel, uncork, remaining, shadow = true }: PourBottleProps) {
  return (
    <div className="vp-shade" aria-hidden="true" data-stand={standing} data-shadow={shadow}>
      <div
        className="vp-bottle"
        data-corked={corked}
        data-travel={travel}
        style={{ width: layout.bottleWidth, height: layout.bottleHeight, left: place.left, top: place.top, rotate: `${place.rotate}deg` }}
      >
        <img className="vp-art vp-empty" src={emptyBottleImage(look.bottle)} alt="" draggable={false} />
        <img className="vp-art vp-full" src={bottleImage(look.bottle)} alt="" draggable={false}
          style={{ clipPath: bottleWineClip(place.rotate, remaining, layout, look) }} />
        {uncork < 1 && <Uncorking layout={layout} look={look} progress={uncork} />}
      </div>
    </div>
  )
}

/** The cork and the props that take it out, in the bottle box (origin at its top left, upright). */
function Uncorking({ layout, look, progress }: { layout: PourLayout; look: RatingLook; progress: number }) {
  const bottle = BOTTLE_ART[look.bottle]
  const kind = bottle.cork.kind
  const cork = corkBox(layout, look)
  const scale = cork.width / STAGE_CORK_WIDTH[kind]
  const lipX = cork.left + cork.width / 2
  const lipY = (bottle.lip[1] / bottle.height) * layout.bottleHeight
  const scene = uncorkScene(progress, kind, scale)
  const screw = { width: UNCORK_ART.corkscrew.width * SCREW_SCALE * scale, height: UNCORK_ART.corkscrew.height * SCREW_SCALE * scale }
  const cage = { width: (cork.width * UNCORK_ART.cage.width) / bottle.cork.width, height: (cork.width * UNCORK_ART.cage.height) / bottle.cork.width }
  const wisp = { width: UNCORK_ART.wisp.width * WISP_SCALE * scale, height: UNCORK_ART.wisp.height * WISP_SCALE * scale }
  // Whatever is below the lip is inside the neck.
  const far = layout.width * 2
  const aboveLip = `polygon(${-far}px ${-far}px, ${far}px ${-far}px, ${far}px ${round(lipY)}px, ${-far}px ${round(lipY)}px)`
  const foamSize = (size: number) => size * scale

  return (
    <>
      {kind === 'still' && (
        <img className="vp-prop vp-wisp" src={UNCORK_ART.wisp.src} alt="" draggable={false}
          style={{
            left: lipX - wisp.width / 2, top: lipY - 26 * scale, width: wisp.width, height: wisp.height,
            transform: `translateY(${round(scene.wisp.dy)}px)`, opacity: scene.wisp.opacity,
          }} />
      )}
      <div className="vp-neck" style={{ clipPath: aboveLip }}>
        <img className="vp-prop vp-cork" src={bottle.cork.src} alt="" draggable={false}
          style={{
            left: cork.left, top: cork.top, width: cork.width, height: cork.height,
            transform: move(scene.cork.dx, scene.cork.dy, scene.cork.rotate), opacity: scene.cork.opacity,
          }} />
        {kind === 'still' && (
          <img className="vp-prop vp-screw" src={UNCORK_ART.corkscrew.src} alt="" draggable={false}
            style={{
              left: lipX - SCREW_TIP * SCREW_SCALE * scale, top: cork.top - 2 * scale - screw.height,
              width: screw.width, height: screw.height,
              transformOrigin: `${round(SCREW_TIP * SCREW_SCALE * scale)}px 50%`,
              transform: `translateY(${round(scene.screw.dy)}px) scaleX(${scene.screw.scaleX.toFixed(3)})`,
              opacity: scene.screw.opacity,
            }} />
        )}
      </div>
      {kind === 'sparkling' && (
        <>
          <img className="vp-prop vp-cage" src={UNCORK_ART.cage.src} alt="" draggable={false}
            style={{
              left: lipX - cage.width / 2, top: cork.top - scale, width: cage.width, height: cage.height,
              transform: move(scene.cage.dx, scene.cage.dy, scene.cage.rotate), opacity: scene.cage.opacity,
            }} />
          {FOAM.map(([dx, size]) => (
            <i key={dx} className="vp-prop vp-foam"
              style={{
                left: lipX + dx * scale - foamSize(size) / 2, top: lipY - foamSize(size) / 2,
                width: foamSize(size), height: foamSize(size),
                transform: `translateY(${round(scene.foam.dy)}px) scale(${scene.foam.scaleX.toFixed(3)})`,
                opacity: scene.foam.opacity,
              }} />
          ))}
        </>
      )}
    </>
  )
}
