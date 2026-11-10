import { describe, it, expect, vi } from "vitest";
import { createOrganizerPaymentsService } from './organizerPayments.service';
vi.mock('@/infrastructure/api/clients/organizerPayments.client', () => ({ organizerPaymentsClient: {} }));
describe('organizer payments', () => {
  it('batches one page, deduplicates identities and avoids calls for an empty page', async () => {
    const client = { list: vi.fn().mockResolvedValue([]), refund: vi.fn().mockResolvedValue(undefined) };
    const service = createOrganizerPaymentsService(client);
    expect(await service.list('event', [])).toEqual([]);
    expect(client.list).not.toHaveBeenCalled();
    await service.list('event', ['b','a','b']);
    expect(client.list).toHaveBeenCalledWith('event',['a','b']);
    await expect(service.list('event',Array(51).fill('a'))).rejects.toThrow();
    await expect(service.refund('')).rejects.toThrow();
    expect(client.refund).not.toHaveBeenCalled();
    await service.refund('attempt');
    expect(client.refund).toHaveBeenCalledWith('attempt');
    client.refund.mockRejectedValueOnce(new Error('uncertain'));
    await expect(service.refund('attempt')).rejects.toThrow('uncertain');
    expect(client.refund).toHaveBeenCalledTimes(2);
  });
});
