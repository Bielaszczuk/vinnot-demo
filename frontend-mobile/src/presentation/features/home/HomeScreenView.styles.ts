import { StyleSheet } from "react-native";
import { contentStyles } from "./HomeScreenView.content.styles";
import { discoveryStyles } from "./HomeScreenView.discovery.styles";
import { heroStyles, SCREEN_BG } from "./HomeScreenView.hero.styles";

export { SCREEN_BG };

export const styles = StyleSheet.create({
  ...heroStyles,
  ...discoveryStyles,
  ...contentStyles,
});
