import { Image, StyleSheet, View } from "react-native";
import brandMark from "../../../../assets/brand/mark.png";
import brandWordmark from "../../../../assets/brand/wordmark.png";
import { authColors } from "./authTheme";

type VinnotBrandProps = { compact?: boolean; color?: string };

/** The supplied racimo and wordmark keep their proportions at either size. */
export function VinnotBrand({ compact = false, color = authColors.brand }: VinnotBrandProps) {
  const height = compact ? 40 : 54;
  const wordWidth = compact ? 90 : 126;
  return (
    <View style={styles.container} accessible accessibilityRole="image" accessibilityLabel="Vinnot">
      <Image source={brandMark} resizeMode="contain"
        style={{ height, width: height * 338 / 431, tintColor: color }} />
      <Image source={brandWordmark} resizeMode="contain"
        style={{ width: wordWidth, height: wordWidth * 171 / 702, tintColor: color }} />
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
});
