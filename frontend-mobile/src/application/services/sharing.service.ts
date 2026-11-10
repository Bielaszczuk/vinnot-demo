import { sharingGateway } from '@/infrastructure/device/sharing.gateway';
import { publicContentUrl, type ShareContentInput } from '@/domain/sharing/contentLink';
import { env } from '@/shared/config/env';

export const sharingService = {
  async shareContent(input: ShareContentInput): Promise<'shared' | 'cancelled' | 'failed'> {
    try {
      const url = publicContentUrl(env.isProduction ? 'https://vinnot.com' : 'https://dev.vinnot.com', input.kind, input.id);
      return await sharingGateway.share({ title: input.title, url }) ? 'shared' : 'cancelled';
    } catch { return 'failed'; }
  },
};
