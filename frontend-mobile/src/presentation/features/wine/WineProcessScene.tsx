import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import type { WineProcessScene } from "./WineProcessJourney";
import type { WineSceneLooks } from "./wineSceneLook";
import {
  REPLAY_FADE_END,
  REPLAYABLE_SCENES,
  SCENE_ART_SIZE,
  WineProcessSceneArt,
} from "./WineProcessSceneArt";
import { isTasteProfileScene, TasteProfileSceneArt, type TasteScenePicks } from "./TasteProfileSceneArt";
import { vinnotColors } from "@/shared/theme/vinnotTheme";

export type { WineProcessScene };

const RING_SIZE = 176;
const RING_STROKE = 4;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
export const PROCESS_RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const RING_ADVANCE_MS = 900;
const SCENE_IN_MS = 450;
const SCENE_OUT_MS = 250;
/**
 * How long each gesture plays. A profile stage stays 1.8 s on screen and a comparison stage 2.5 s,
 * so each gesture ends just before the next stage; the note on the last stage is written slowly.
 * A taste quiz stage stays 3.2 s and plays at a calm pace: each gesture eases in and out and rests
 * on its final pose before the next stage, and the wheel is drawn within the quiz's minimum time.
 */
export const SCENE_ACTION_MS: Record<WineProcessScene, number> = {
  uncork: 1600,
  visual: 1600,
  bouquet: 1600,
  taste: 1600,
  report: 3000,
  compare: 2200,
  structure: 2200,
  contrast: 2200,
  recommendation: 3000,
  quizPicks: 2600,
  quizGlass: 2500,
  quizBlend: 2500,
  quizWheel: 2800,
};
const SCENE_ACTION_DELAY_MS = 120;
const QUIZ_SCENES: ReadonlySet<WineProcessScene> = new Set(["quizPicks", "quizGlass", "quizBlend", "quizWheel"]);
const calmEasing = Easing.inOut(Easing.sin);

/** Taste quiz gestures ease in and out so they read calmly; the wine scenes keep their steady pace. */
function sceneEasing(scene: WineProcessScene) {
  return QUIZ_SCENES.has(scene) ? calmEasing : Easing.linear;
}
/** On the last step, while the answer is on its way: rest, fade the page and write again. */
export const SCENE_ACTION_PAUSE_MS = 1600;
const SCENE_ERASE_MS = 700;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface WineProcessSceneProps {
  scene: WineProcessScene;
  /** Zero-based index of the step in progress. */
  step: number;
  total: number;
  looks: WineSceneLooks;
  /** The quiz options the taste profile scenes draw. */
  picks?: TasteScenePicks;
}

const NO_PICKS: TasteScenePicks = [];

/**
 * The step drawing inside a ring that fills as steps advance. Each drawing acts out its step once
 * and rests; the last step, a page being written, writes again while the answer is pending.
 */
export function WineProcessSceneVisual({ scene, step, total, looks, picks = NO_PICKS }: WineProcessSceneProps) {
  const reduceMotion = useReducedMotion();
  const completed = total <= 0 ? 0 : Math.min(step + 1, total) / total;
  const target = PROCESS_RING_CIRCUMFERENCE * (1 - completed);
  const offset = useSharedValue(reduceMotion ? target : PROCESS_RING_CIRCUMFERENCE);

  useEffect(() => {
    offset.value = reduceMotion
      ? target
      : withTiming(target, { duration: RING_ADVANCE_MS, easing: Easing.out(Easing.cubic) });
  }, [offset, reduceMotion, target]);

  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: offset.value }));

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.shell}
    >
      <Svg width={RING_SIZE} height={RING_SIZE} style={styles.ring}>
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          stroke={vinnotColors.brandTint}
          strokeWidth={RING_STROKE}
          fill="none"
        />
        <AnimatedCircle
          testID="process-ring-progress"
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          stroke={vinnotColors.brand}
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={PROCESS_RING_CIRCUMFERENCE}
          fill="none"
          animatedProps={ringProps}
        />
      </Svg>
      <View style={styles.disc}>
        <View style={styles.stage}>
          <SceneDrawing
            key={scene}
            scene={scene}
            looks={looks}
            picks={picks}
            reduceMotion={reduceMotion}
            waiting={total > 0 && step >= total - 1 && REPLAYABLE_SCENES.has(scene)}
          />
        </View>
      </View>
    </View>
  );
}

interface SceneDrawingProps {
  scene: WineProcessScene;
  looks: WineSceneLooks;
  picks: TasteScenePicks;
  reduceMotion: boolean;
  /** The last step: keep writing, with a pause, until the answer arrives. */
  waiting: boolean;
}

function SceneDrawing({ scene, looks, picks, reduceMotion, waiting }: SceneDrawingProps) {
  const progress = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      progress.value = 1;
      return;
    }
    const act = withTiming(1, { duration: SCENE_ACTION_MS[scene], easing: sceneEasing(scene) });
    progress.value = withDelay(
      SCENE_ACTION_DELAY_MS,
      waiting
        ? withRepeat(
            withSequence(
              act,
              withDelay(
                SCENE_ACTION_PAUSE_MS,
                withTiming(REPLAY_FADE_END, { duration: SCENE_ERASE_MS, easing: Easing.linear }),
              ),
              withTiming(0, { duration: 0 }),
            ),
            -1,
            false,
          )
        : act,
    );
  }, [progress, reduceMotion, scene, waiting]);

  return (
    <Animated.View
      testID={`process-scene-${scene}`}
      entering={reduceMotion ? undefined : FadeIn.duration(SCENE_IN_MS)}
      exiting={reduceMotion ? undefined : FadeOut.duration(SCENE_OUT_MS)}
      style={styles.drawing}
    >
      {isTasteProfileScene(scene) ? (
        <TasteProfileSceneArt scene={scene} progress={progress} picks={picks} />
      ) : (
        <WineProcessSceneArt scene={scene} progress={progress} looks={looks} />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  ring: { position: "absolute", transform: [{ rotate: "-90deg" }] },
  disc: {
    width: 140,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: vinnotColors.borderSoft,
    borderRadius: 70,
    backgroundColor: vinnotColors.surface,
    shadowColor: vinnotColors.brandDeep,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 2,
  },
  stage: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 70,
    overflow: "hidden",
  },
  drawing: {
    width: SCENE_ART_SIZE,
    height: SCENE_ART_SIZE,
  },
});
