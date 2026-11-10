import { Image, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { WineGlassMark } from "./WineGlassMark";
import brandWordmark from "../../../../assets/brand/wordmark.png";
import { authColors } from "./authTheme";

export function VinnotLaunchScreen() {
  return <View style={styles.screen} accessible accessibilityRole="image" accessibilityLabel="Vinnot">
    <Animated.View entering={FadeIn.duration(350)} style={styles.mark}>
      <WineGlassMark size={92} animated />
    </Animated.View>
    <Animated.View entering={FadeInDown.duration(420).delay(180)} style={styles.brand}>
      <Image source={brandWordmark} resizeMode="contain"
        style={{ width: 180, height: 180 * 171 / 702, tintColor: authColors.brand }} />
    </Animated.View>
  </View>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: authColors.background },
  mark: { height: 98, alignItems: "center", justifyContent: "center" },
  brand: { alignItems: "center", marginTop: 12 },
});
