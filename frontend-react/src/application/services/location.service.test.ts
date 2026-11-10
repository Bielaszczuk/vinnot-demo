import { describe, expect, it, vi } from 'vitest';
import { locationGateway } from '@infrastructure/device/location.gateway';
import { locationService } from './location.service';
vi.mock('@infrastructure/device/location.gateway', () => ({ locationGateway: { getCurrentPosition: vi.fn() } }));
describe('current location', () => {
 it('preserves coordinates on zero axes', async () => { vi.mocked(locationGateway.getCurrentPosition).mockResolvedValue({ latitude: 0, longitude: 0 }); await expect(locationService.getCurrentLocation()).resolves.toEqual({ latitude: 0, longitude: 0 }); });
 it('allows manual discovery when permissions or location fail', async () => { vi.mocked(locationGateway.getCurrentPosition).mockRejectedValue(new Error('denied')); await expect(locationService.getCurrentLocation()).resolves.toBeNull(); });
});
