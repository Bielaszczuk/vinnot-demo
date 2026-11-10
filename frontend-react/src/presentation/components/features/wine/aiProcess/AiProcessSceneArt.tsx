/**
 * AiProcessSceneArt — draws one watercolor scene and animates its parts with
 * CSS keyframes sampled from the scene's motion tracks. With reduced motion
 * every part shows its final pose and nothing moves.
 */

import { useMemo, type CSSProperties } from 'react'
import {
  REPLAYABLE_SCENES,
  SCENE_ACTION_MS,
  SCENE_SIZE,
  keyframesCss,
  lookKey,
  loopKeyframesCss,
  sceneLayers,
  sceneTiming,
  type AiProcessSceneName,
  type Pose,
  type SceneLayer,
  type SceneTiming,
  type WineSceneLooks,
} from './aiProcessScenes'

/** Pause before a gesture starts, so the scene settles in first. */
const SCENE_ACTION_DELAY_MS = 120

interface AiProcessSceneArtProps {
  scene: AiProcessSceneName
  looks: WineSceneLooks
  /** The last step: keep writing, with a pause, until the answer arrives. */
  waiting: boolean
  reducedMotion: boolean
}

const shapeStyles: Record<NonNullable<SceneLayer['shape']>, CSSProperties> = {
  stream: { borderRadius: 1.2, opacity: 0.88 },
  bubble: {
    borderRadius: '50%',
    border: '0.6px solid rgba(150, 112, 40, 0.7)',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  foam: { borderRadius: '50%', border: '0.8px solid #C8AB6A', backgroundColor: '#F6EBCB' },
}

function poseStyle(pose: Pose): CSSProperties {
  return {
    opacity: pose.opacity === undefined ? undefined : Number(pose.opacity),
    transform: pose.transform,
    clipPath: pose['clip-path'],
    top: pose.top,
    height: pose.height,
  }
}

interface RenderContext {
  name: string
  timing: SceneTiming
  iteration: string
  reducedMotion: boolean
  css: string[]
}

function renderLayer(layer: SceneLayer, context: RenderContext) {
  const style: CSSProperties = {
    position: 'absolute',
    left: layer.x,
    top: layer.y,
    width: layer.w,
    height: layer.h,
    overflow: layer.clip ? 'hidden' : undefined,
    backgroundColor: layer.color,
    ...(layer.shape ? shapeStyles[layer.shape] : {}),
  }
  const animationName = `${context.name}-${layer.id}`
  if (layer.track) {
    if (context.reducedMotion) {
      Object.assign(style, poseStyle(layer.track(1)))
    } else {
      context.css.push(keyframesCss(animationName, layer.track, context.timing))
      style.animation = `${animationName} ${context.timing.durationMs}ms linear ${SCENE_ACTION_DELAY_MS}ms ${context.iteration} both`
    }
  } else if (layer.loop) {
    if (context.reducedMotion) {
      Object.assign(style, poseStyle(layer.loop.track(layer.loop.offset)))
    } else {
      context.css.push(loopKeyframesCss(animationName, layer.loop.track))
      style.animation = `${animationName} ${layer.loop.periodMs}ms linear ${-layer.loop.offset * layer.loop.periodMs}ms infinite both`
    }
  }
  return (
    <div key={layer.id} data-layer={layer.id} style={style}>
      {layer.src && <img src={layer.src} alt="" draggable={false} className="block h-full w-full select-none" />}
      {layer.children?.map((child) => renderLayer(child, context))}
    </div>
  )
}

export function AiProcessSceneArt({ scene, looks, waiting, reducedMotion }: AiProcessSceneArtProps) {
  const replay = waiting && REPLAYABLE_SCENES.has(scene) && !reducedMotion
  const { layers, css } = useMemo(() => {
    const context: RenderContext = {
      name: `vinnot-ai-${scene}-${lookKey(looks.first)}-${lookKey(looks.second)}-${replay ? 'loop' : 'once'}`,
      timing: sceneTiming(SCENE_ACTION_MS[scene], replay),
      iteration: replay ? 'infinite' : '1',
      reducedMotion,
      css: [],
    }
    const rendered = sceneLayers(scene, looks).map((layer) => renderLayer(layer, context))
    return { layers: rendered, css: context.css.join('\n') }
  }, [scene, looks, replay, reducedMotion])

  return (
    <div
      data-scene={scene}
      data-motion={reducedMotion ? 'still' : replay ? 'replay' : 'once'}
      className="relative"
      style={{ width: SCENE_SIZE, height: SCENE_SIZE }}
    >
      {css && <style>{css}</style>}
      {layers}
    </div>
  )
}
