import { sharingGateway } from '@/infrastructure/device/sharing.gateway';
import { sharingService } from './sharing.service';
jest.mock('@/infrastructure/device/sharing.gateway', () => ({ sharingGateway: { share: jest.fn() } }));
jest.mock('@/shared/config/env', () => ({ env: { isProduction: true } }));
const input = { kind: 'wines' as const, id: '758a7f04-2678-4b92-8f5a-00272d150318', title: 'Mural Tinto' };
beforeEach(() => { jest.resetAllMocks(); });
describe('content sharing', () => {
  it('shares a public link as a URL item', async () => {
    jest.mocked(sharingGateway.share).mockResolvedValue(true);
    await expect(sharingService.shareContent(input)).resolves.toBe('shared');
    expect(sharingGateway.share).toHaveBeenCalledWith({ title: input.title, url: `https://vinnot.com/share/wines/${input.id}` });
  });
  it('does not report a cancelled share as success', async () => {
    jest.mocked(sharingGateway.share).mockResolvedValue(false);
    await expect(sharingService.shareContent(input)).resolves.toBe('cancelled');
  });
  it('normalizes provider failures', async () => {
    jest.mocked(sharingGateway.share).mockRejectedValue(new Error('unsupported'));
    await expect(sharingService.shareContent(input)).resolves.toBe('failed');
  });
  it('does not send invalid identifiers to the device', async () => {
    await expect(sharingService.shareContent({ ...input, id: '../admin' })).resolves.toBe('failed');
    expect(sharingGateway.share).not.toHaveBeenCalled();
  });
});
