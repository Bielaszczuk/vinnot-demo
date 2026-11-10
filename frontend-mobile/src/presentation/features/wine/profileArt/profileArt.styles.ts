import { StyleSheet } from "react-native";
import { radii } from "@/shared/theme/tokens";
import { vinnotColors, vinnotFonts } from "@/shared/theme/vinnotTheme";
import { fontSizes } from "@/shared/theme/typography";

/** A rotating note: about 88 pt of art with its label under it. */
export const VIGNETTE_SIZE = 88;
const STILL_SIZE = 64;
const LABEL_HEIGHT = 30;
const SERVING_ART_SIZE = 64;

export const THERMOMETER_TUBE_HEIGHT = 56;
const TUBE_WIDTH = 10;
const BULB_SIZE = 20;

export const profileArtStyles = StyleSheet.create({
  stage: {
    width: 112,
    height: VIGNETTE_SIZE + 4 + LABEL_HEIGHT,
  },
  layer: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
  frame: { alignItems: "center", gap: 4 },
  image: { width: VIGNETTE_SIZE, height: VIGNETTE_SIZE },
  stillRow: {
    flexGrow: 1,
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  stillFrame: { width: 84, alignItems: "center", gap: 4 },
  stillImage: { width: STILL_SIZE, height: STILL_SIZE },
  label: {
    maxHeight: LABEL_HEIGHT,
    fontFamily: vinnotFonts.medium,
    fontSize: fontSizes["2xs"],
    lineHeight: 15,
    letterSpacing: 0,
    textAlign: "center",
    color: vinnotColors.muted,
  },

  servingArt: {
    alignItems: "center",
    justifyContent: "flex-end",
    minHeight: SERVING_ART_SIZE,
    marginBottom: 8,
  },
  servingImage: { width: SERVING_ART_SIZE, height: SERVING_ART_SIZE },

  thermometer: { alignItems: "center", gap: 4 },
  thermometerBody: { alignItems: "center" },
  tube: {
    width: TUBE_WIDTH,
    height: THERMOMETER_TUBE_HEIGHT,
    marginBottom: -4,
    borderTopLeftRadius: radii.full,
    borderTopRightRadius: radii.full,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: vinnotColors.borderSoft,
    backgroundColor: vinnotColors.canvas,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  mercury: {
    width: "100%",
    backgroundColor: vinnotColors.brand,
  },
  bulb: {
    width: BULB_SIZE,
    height: BULB_SIZE,
    borderRadius: radii.full,
    backgroundColor: vinnotColors.brand,
  },
  thermometerLabel: {
    fontFamily: vinnotFonts.semibold,
    fontSize: fontSizes["2xs"],
    lineHeight: 15,
    letterSpacing: 0,
    color: vinnotColors.ink,
  },
});
