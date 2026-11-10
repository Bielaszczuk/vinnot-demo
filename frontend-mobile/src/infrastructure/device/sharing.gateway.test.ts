import { Platform, Share } from 'react-native';
import { sharingGateway } from './sharing.gateway';
const data = { title: 'Wine', url: 'https://vinnot.com/share/wines/758a7f04-2678-4b92-8f5a-00272d150318' };
afterEach(() => jest.restoreAllMocks());
it.each(['ios', 'android'] as const)('uses the native URL contract on %s and respects cancellation', async platform => {
  const original = Platform.OS;
  Object.defineProperty(Platform, 'OS', { value: platform, configurable: true });
  try {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction, activityType: undefined });
    await expect(sharingGateway.share(data)).resolves.toBe(true);
    expect(share).toHaveBeenCalledWith(platform === 'ios' ? data : { title: data.title, message: data.url });
    share.mockResolvedValue({ action: Share.dismissedAction, activityType: undefined });
    await expect(sharingGateway.share(data)).resolves.toBe(false);
  } finally { Object.defineProperty(Platform, 'OS', { value: original, configurable: true }); }
});
