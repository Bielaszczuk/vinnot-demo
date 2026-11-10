import { Linking } from "react-native";
export const paymentCheckoutNavigator = { open: (url: string) => Linking.openURL(url) };
