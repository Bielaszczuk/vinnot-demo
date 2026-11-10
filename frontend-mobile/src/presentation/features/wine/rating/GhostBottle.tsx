/**
 * The drag demo of the pour control, for someone who never rated: a see-through copy of the
 * bottle leaves the stand, glides over the glasses tilted to pour, then fades. The real bottle
 * stays corked on its stand.
 */
import { Group } from "@shopify/react-native-skia";
import { useDerivedValue, useSharedValue, type SharedValue } from "react-native-reanimated";
import type { BottleArt, GlassArt } from "./ratingArt";
import { PourBottle, type BottlePlace } from "./PourBottle";
import { ghostFrame, POUR_ANGLE, pourFrame, type PourLayout } from "./pourGeometry";

/** A preview, never mistaken for the real bottle. */
const GHOST_BOTTLE_OPACITY = 0.45;

interface GhostBottleProps {
  /** 0..1 progress of the demo loop. */
  ghost: SharedValue<number>;
  layout: PourLayout;
  glass: GlassArt;
  bottle: BottleArt;
}

export function GhostBottle({ ghost, layout, glass, bottle }: GhostBottleProps) {
  const shot = useDerivedValue(() => ghostFrame(ghost.value));
  // Same path as the real bottle: off the stand on a small arc, then over the glass it pours into.
  const place = useDerivedValue<BottlePlace>(() => {
    const { held, level } = shot.value;
    const f = pourFrame(Math.max(0.0001, level), layout, glass, bottle);
    return {
      x: layout.standX + (f.bottleCenterX - layout.standX) * held,
      y: layout.standY + (f.bottleCenterY - layout.standY) * held - Math.sin(Math.PI * held) * layout.glassHeight * 0.25,
      rotate: POUR_ANGLE * held,
    };
  });
  const stand = useDerivedValue(() => 1 - shot.value.held);
  const level = useDerivedValue(() => shot.value.level);
  const uncork = useSharedValue(1);
  const opacity = useDerivedValue(() => GHOST_BOTTLE_OPACITY * shot.value.opacity);
  return (
    <Group opacity={opacity}>
      <PourBottle layout={layout} bottle={bottle} place={place} stand={stand} uncork={uncork} level={level} shadow={false} />
    </Group>
  );
}
