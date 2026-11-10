/**
 * Motion tokens — Vinnot Mobile
 *
 * Consistent animation durations and easings for Reanimated worklets.
 * All timings are in milliseconds.
 * Premium feel = never too fast (feels cheap), never too slow (feels sluggish).
 */
import { Easing } from "react-native-reanimated";

// ─── Durations ────────────────────────────────────────────────────────────────

export const durations = {
  instant: 0,
  fast: 120,      // micro-interactions: button press, chip tap
  normal: 200,    // standard transitions: fade, scale
  slow: 320,      // modal enter, sheet snap
  slower: 480,    // hero transitions, parallax settle
  sluggish: 600,  // complex orchestrated sequences
} as const;

// ─── Easing ───────────────────────────────────────────────────────────────────

export const easings = {
  // Standard Material-influenced easing for most transitions
  standard: Easing.bezier(0.2, 0, 0, 1),

  // Enter: elements coming onto screen
  enter: Easing.bezier(0.0, 0, 0.2, 1),

  // Exit: elements leaving screen
  exit: Easing.bezier(0.4, 0, 1, 1),

  // Emphasized: for attention-drawing motions
  emphasized: Easing.bezier(0.2, 0, 0, 1),

  // Spring-like bounce for sheet snapping
  spring: Easing.bezier(0.34, 1.56, 0.64, 1),

  // Pure elastic for micro-interactions (button press)
  elastic: Easing.elastic(1.2),

  // Linear for looping animations (spinners, skeletons)
  linear: Easing.linear,
} as const;

// ─── Named presets ────────────────────────────────────────────────────────────

export const motionPresets = {
  // Button press scale
  buttonPress: {
    duration: durations.fast,
    easing: easings.standard,
    scaleDown: 0.96,
  },

  // Card press (FlashList items)
  cardPress: {
    duration: durations.fast,
    easing: easings.standard,
    scaleDown: 0.98,
  },

  // Fade in (content appearance)
  fadeIn: {
    duration: durations.normal,
    easing: easings.enter,
  },

  // Screen transition
  screenTransition: {
    duration: durations.slow,
    easing: easings.standard,
  },

  // Bottom sheet snap
  sheetSnap: {
    duration: durations.slow,
    easing: easings.emphasized,
  },

  // Tab indicator slide
  tabIndicator: {
    duration: durations.normal,
    easing: easings.standard,
  },

  // Skeleton shimmer
  skeleton: {
    duration: 1200,
    easing: easings.linear,
  },
} as const;

// ─── Spring configs (for withSpring) ──────────────────────────────────────────

export const springConfigs = {
  gentle: { damping: 20, stiffness: 150, mass: 1 },
  bouncy: { damping: 12, stiffness: 200, mass: 0.8 },
  snappy: { damping: 25, stiffness: 300, mass: 0.8 },
  stiff: { damping: 30, stiffness: 400, mass: 1 },
} as const;

