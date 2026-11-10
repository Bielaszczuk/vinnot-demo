import { Platform, Share } from 'react-native';

export const sharingGateway = {
  async share(data: { title: string; url: string }): Promise<boolean> {
    // iOS needs a URL item for rich previews. Android shares the URL as text.
    const result = await Share.share(Platform.OS === 'ios'
      ? { title: data.title, url: data.url }
      : { title: data.title, message: data.url });
    return result.action !== Share.dismissedAction;
  },
};
