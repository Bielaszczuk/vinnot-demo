import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sharingGateway } from '@infrastructure/device/sharing.gateway';
import { sharingService } from './sharing.service';
vi.mock('@infrastructure/device/sharing.gateway', () => ({ sharingGateway: { canShare: vi.fn(), share: vi.fn(), copy: vi.fn() } }));
const link = { title: 'Vinnot', url: 'https://vinnot.com/events/one' };
beforeEach(() => vi.resetAllMocks());
describe('link sharing', () => {
  it('waits for a successful native share without copying', async () => {
    vi.mocked(sharingGateway.canShare).mockReturnValue(true);
    await expect(sharingService.shareLink(link)).resolves.toBe('shared');
    expect(sharingGateway.copy).not.toHaveBeenCalled();
  });
  it('only reports copied after the clipboard resolves', async () => {
    let complete!: () => void;
    vi.mocked(sharingGateway.copy).mockReturnValue(new Promise<void>(resolve => { complete = resolve; }));
    const pending = sharingService.shareLink(link);
    complete();
    await expect(pending).resolves.toBe('copied');
    expect(sharingGateway.copy).toHaveBeenCalledWith(link.url);
  });
  it('treats user cancellation silently and does not retry', async () => {
    vi.mocked(sharingGateway.canShare).mockReturnValue(true);
    vi.mocked(sharingGateway.share).mockRejectedValue(new DOMException('cancelled', 'AbortError'));
    await expect(sharingService.shareLink(link)).resolves.toBe('cancelled');
    expect(sharingGateway.copy).not.toHaveBeenCalled();
  });
  it.each([new Error('denied'), 'not supported'])('reports a failed copy without claiming success', async error => {
    vi.mocked(sharingGateway.copy).mockRejectedValue(error);
    await expect(sharingService.shareLink(link)).resolves.toBe('failed');
  });
});

it('shares a content URL without copying the current navigation or credentials', async () => {
  const id = '758a7f04-2678-4b92-8f5a-00272d150318';
  await expect(sharingService.shareContent({ kind: 'events', id, title: 'Tasting' })).resolves.toBe('copied');
  expect(sharingGateway.copy).toHaveBeenCalledWith(`https://dev.vinnot.com/share/events/${id}`);
});
it('rejects an invalid content identifier without invoking sharing', async () => {
  await expect(sharingService.shareContent({ kind: 'events', id: '../admin', title: 'Tasting' })).resolves.toBe('failed');
  expect(sharingGateway.copy).not.toHaveBeenCalled();
});
