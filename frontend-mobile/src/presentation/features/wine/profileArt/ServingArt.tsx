/**
 * The illustration on top of each serving box: the thermometer at the recommended temperature, the
 * recommended glass, the decanter when decanting is advised (an uncorked bottle when it is not) and the cellar
 * when the wine can age.
 * Decorative: the box text already says all of it.
 */
import { View } from "react-native";
import { Image } from "expo-image";
import type { ProfileArtServing } from "@/domain/wine/wine.profile-art";
import { SERVING_ART } from "@/shared/profileArt";
import { profileArtStyles as styles } from "./profileArt.styles";
import { ServingThermometer } from "./ServingThermometer";

export type ServingBox = "temperature" | "glassware" | "decanting" | "aging";

interface ServingArtProps {
  box: ServingBox;
  serving: ProfileArtServing;
}

export function ServingArt({ box, serving }: ServingArtProps) {
  const art = artOf(box, serving);
  if (!art) return null;
  return (
    <View testID={`serving-art-box-${box}`} style={styles.servingArt} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {art === "THERMOMETER" && serving.temperature ? (
        <ServingThermometer temperature={serving.temperature} />
      ) : art !== "THERMOMETER" ? (
        <Image testID={`serving-art-${art}`} source={SERVING_ART[art]} style={styles.servingImage} contentFit="contain" />
      ) : null}
    </View>
  );
}

function artOf(box: ServingBox, serving: ProfileArtServing) {
  switch (box) {
    case "temperature":
      return serving.temperature ? ("THERMOMETER" as const) : null;
    case "glassware":
      return serving.glass;
    case "decanting":
      return serving.decant ? ("DECANTER" as const) : ("OPEN_BOTTLE" as const);
    case "aging":
      return "CELLAR" as const;
  }
}
