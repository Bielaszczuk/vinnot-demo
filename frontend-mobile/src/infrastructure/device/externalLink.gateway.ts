import { Linking } from "react-native";

export const externalLinkGateway = {
  async open(url: string): Promise<void> {
    await Linking.openURL(url);
  },
};
