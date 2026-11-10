/**
 * Reduced-motion forms of the transitions the app hands to native components.
 *
 * Under the system Reduce Motion setting, movement becomes a cross-dissolve (what iOS
 * itself does) and image fade-ins are dropped. With the setting off, every value is
 * returned unchanged.
 */
import type { ModalProps } from "react-native";
import type { ImageProps } from "expo-image";
import type { NativeStackNavigationOptions } from "expo-router";
import { useReduceMotionEnabled } from "@/presentation/hooks/useReduceMotionEnabled";

export type StackAnimation = NativeStackNavigationOptions["animation"];
export type ModalAnimation = ModalProps["animationType"];
export type ImageTransition = ImageProps["transition"];

/** Slides, including the platform default push, become a fade; `none` stays still. */
export function reducedStackAnimation(animation: StackAnimation, reduceMotion: boolean): StackAnimation {
  if (!reduceMotion || animation === "none") return animation;
  return "fade";
}

/** A sliding modal becomes a fade; fades and `none` are kept. */
export function reducedModalAnimation(animationType: ModalAnimation, reduceMotion: boolean): ModalAnimation {
  return reduceMotion && animationType === "slide" ? "fade" : animationType;
}

/** Images appear at once instead of fading in. */
export function reducedImageTransition(transition: ImageTransition, reduceMotion: boolean): ImageTransition {
  return reduceMotion ? 0 : transition;
}

export function useStackAnimation(animation?: StackAnimation): StackAnimation {
  return reducedStackAnimation(animation, useReduceMotionEnabled());
}

export function useModalAnimation(animationType: ModalAnimation): ModalAnimation {
  return reducedModalAnimation(animationType, useReduceMotionEnabled());
}

export function useImageTransition(transition: ImageTransition): ImageTransition {
  return reducedImageTransition(transition, useReduceMotionEnabled());
}
