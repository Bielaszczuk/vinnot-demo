/**
 * ImageCropModal — full-screen adjust step shown after a photo is picked and before it is
 * uploaded. The photo always covers the frame; the user drags it to move it and pinches to zoom
 * (screen readers swipe up or down to zoom). Outside the frame the photo is dimmed; profile
 * photos get a round mask and covers a guide for the strip the widest display always shows.
 */
import { useEffect, useMemo, useState } from "react";
import { Modal, StyleSheet, Text, View, type AccessibilityActionEvent, type LayoutChangeEvent } from "react-native";
import { Image } from "expo-image";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Button } from "@/presentation/components/ui/Button";
import type { ImageCropRequest } from "@/presentation/hooks/useImageCropRequest";
import { fitFrame, guideBand } from "@/domain/media/imageAspect";
import {
  clampCropOffset,
  clampCropZoom,
  coverScale,
  cropRect,
  type CropRect,
  type ImageSize,
} from "@/domain/media/imageCrop";
import { neutral } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";

/** Space kept between the frame and the screen edges. */
const FRAME_MARGIN = 20;
/** Zoom step of one screen-reader swipe. */
const A11Y_ZOOM_STEP = 0.5;
const DIM = "rgba(10, 10, 10, 0.68)";

interface ImageCropModalProps {
  request: ImageCropRequest | null;
  onCancel: () => void;
  onConfirm: (rect: CropRect) => void;
}

export function ImageCropModal({ request, onCancel, onConfirm }: ImageCropModalProps) {
  return (
    <Modal
      visible={request !== null}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      supportedOrientations={["portrait"]}
      onRequestClose={onCancel}
    >
      {request && (
        <GestureHandlerRootView style={styles.root}>
          <CropStage key={request.photo.uri} request={request} onCancel={onCancel} onConfirm={onConfirm} />
        </GestureHandlerRootView>
      )}
    </Modal>
  );
}

function CropStage({ request, onCancel, onConfirm }: { request: ImageCropRequest } & Omit<ImageCropModalProps, "request">) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { photo, frame } = request;
  const [area, setArea] = useState<ImageSize>({ width: 0, height: 0 });
  const box = useMemo(
    () => fitFrame({ width: area.width - FRAME_MARGIN * 2, height: area.height - FRAME_MARGIN * 2 }, frame.aspect),
    [area, frame.aspect],
  );
  const zoom = useSharedValue(1);
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  // Last translation and scale each gesture reported, so moves add up while both run together.
  const lastPanX = useSharedValue(0);
  const lastPanY = useSharedValue(0);
  const lastScale = useSharedValue(1);
  const ready = box.width > 0 && box.height > 0;

  // The gesture is built once per photo; the measured frame reaches it through a shared value.
  const target = useSharedValue<ImageSize>(box);
  useEffect(() => {
    target.value = box;
  }, [box, target]);

  const gesture = useMemo(() => {
    const image = { width: photo.width, height: photo.height };
    const moveTo = (nextZoom: number, x: number, y: number) => {
      "worklet";
      if (!(target.value.width > 0)) return;
      const offset = clampCropOffset(image, target.value, nextZoom, { x, y });
      zoom.value = nextZoom;
      offsetX.value = offset.x;
      offsetY.value = offset.y;
    };
    const pan = Gesture.Pan()
      .onStart(() => {
        lastPanX.value = 0;
        lastPanY.value = 0;
      })
      .onUpdate((event) => {
        const dx = event.translationX - lastPanX.value;
        const dy = event.translationY - lastPanY.value;
        lastPanX.value = event.translationX;
        lastPanY.value = event.translationY;
        moveTo(zoom.value, offsetX.value + dx, offsetY.value + dy);
      })
      .withTestId("image-crop-pan");
    const pinch = Gesture.Pinch()
      .onStart(() => {
        lastScale.value = 1;
      })
      .onUpdate((event) => {
        const previous = zoom.value;
        const next = clampCropZoom(previous * (event.scale / lastScale.value));
        lastScale.value = event.scale;
        // Scaling the offset with the zoom keeps the middle of the frame on the same spot of the photo.
        const ratio = next / previous;
        moveTo(next, offsetX.value * ratio, offsetY.value * ratio);
      })
      .withTestId("image-crop-pinch");
    return Gesture.Simultaneous(pan, pinch);
    // Shared values are stable and the stage is keyed by the photo, so the gesture never changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const imageStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offsetX.value }, { translateY: offsetY.value }, { scale: zoom.value }],
  }));

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setArea({ width, height });
  };

  const onAccessibilityAction = (event: AccessibilityActionEvent) => {
    const step = event.nativeEvent.actionName === "increment" ? A11Y_ZOOM_STEP : -A11Y_ZOOM_STEP;
    const previous = zoom.value;
    const next = clampCropZoom(previous + step);
    const ratio = next / previous;
    const offset = clampCropOffset(photo, box, next, { x: offsetX.value * ratio, y: offsetY.value * ratio });
    zoom.value = next;
    offsetX.value = offset.x;
    offsetY.value = offset.y;
  };

  const confirm = () => {
    if (!ready) return;
    onConfirm(cropRect(photo, box, zoom.value, { x: offsetX.value, y: offsetY.value }));
  };

  const frameLeft = (area.width - box.width) / 2;
  const frameTop = (area.height - box.height) / 2;
  const base = ready ? coverScale(photo, box) : 0;
  const imageWidth = photo.width * base;
  const imageHeight = photo.height * base;
  const band = ready ? guideBand(box, frame.guideAspect) : null;
  const frameRect = { left: frameLeft, top: frameTop, width: box.width, height: box.height };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]} accessibilityViewIsModal>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">{t("media.crop.title")}</Text>
        <Text style={styles.hint}>{t("media.crop.hint")}</Text>
      </View>
      <GestureDetector gesture={gesture}>
        <View
          style={styles.stage}
          onLayout={onLayout}
          testID="image-crop-stage"
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={t("media.crop.stage")}
          accessibilityHint={t("media.crop.stageHint")}
          accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
          onAccessibilityAction={onAccessibilityAction}
        >
          {ready && (
            <>
              <Animated.View
                style={[
                  styles.photo,
                  {
                    left: frameLeft + (box.width - imageWidth) / 2,
                    top: frameTop + (box.height - imageHeight) / 2,
                    width: imageWidth,
                    height: imageHeight,
                  },
                  imageStyle,
                ]}
              >
                <Image source={{ uri: photo.uri }} style={styles.fill} contentFit="fill" accessible={false} />
              </Animated.View>
              <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                <View style={[styles.dim, { left: 0, right: 0, top: 0, height: frameTop }]} />
                <View style={[styles.dim, { left: 0, right: 0, top: frameTop + box.height, bottom: 0 }]} />
                <View style={[styles.dim, { left: 0, width: frameLeft, top: frameTop, height: box.height }]} />
                <View style={[styles.dim, { right: 0, width: frameLeft, top: frameTop, height: box.height }]} />
                {frame.round && (
                  <View style={[styles.mask, frameRect]} testID="image-crop-round-mask">
                    <View
                      style={{
                        position: "absolute",
                        left: -box.width / 2,
                        top: -box.height / 2,
                        width: box.width * 2,
                        height: box.height * 2,
                        borderRadius: box.width,
                        borderWidth: box.width / 2,
                        borderColor: DIM,
                      }}
                    />
                  </View>
                )}
                <View style={[styles.frame, frameRect, frame.round && { borderRadius: box.width / 2 }]} />
                {band && (
                  <View
                    style={[styles.band, { left: frameLeft, width: box.width, top: frameTop + band.top, height: band.height }]}
                    testID="image-crop-guide"
                  >
                    <Text style={styles.bandLabel}>{t("media.crop.guide")}</Text>
                  </View>
                )}
              </View>
            </>
          )}
        </View>
      </GestureDetector>
      <View style={styles.actions}>
        <View style={styles.action}>
          <Button fullWidth variant="secondary" onPress={onCancel} accessibilityLabel={t("media.crop.cancel")}>
            {t("media.crop.cancel")}
          </Button>
        </View>
        <View style={styles.action}>
          <Button fullWidth disabled={!ready} onPress={confirm} accessibilityLabel={t("media.crop.confirm")}>
            {t("media.crop.confirm")}
          </Button>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: neutral[950] },
  header: { gap: 4, paddingHorizontal: FRAME_MARGIN, paddingBottom: 8 },
  title: { ...textStyles.headingSmall, color: neutral[0], textAlign: "center" },
  hint: { ...textStyles.bodySmall, color: neutral[300], textAlign: "center" },
  stage: { flex: 1, overflow: "hidden" },
  photo: { position: "absolute" },
  fill: { width: "100%", height: "100%" },
  dim: { position: "absolute", backgroundColor: DIM },
  mask: { position: "absolute", overflow: "hidden" },
  frame: { position: "absolute", borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.9)" },
  band: {
    position: "absolute",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(255, 255, 255, 0.75)",
  },
  bandLabel: {
    ...textStyles.caption,
    alignSelf: "flex-start",
    margin: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden",
    color: neutral[0],
    backgroundColor: "rgba(10, 10, 10, 0.55)",
  },
  actions: { flexDirection: "row", gap: 12, paddingHorizontal: FRAME_MARGIN, paddingTop: 12 },
  action: { flex: 1 },
});
