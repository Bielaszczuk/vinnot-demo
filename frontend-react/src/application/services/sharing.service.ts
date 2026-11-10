import { publicContentUrl, type ShareContentInput } from '@domain/sharing/contentLink'
import { env } from '@/app/env'
import { sharingGateway } from '@infrastructure/device/sharing.gateway'

export type SharingResult = 'shared' | 'copied' | 'cancelled' | 'failed'

export const sharingService = {
  async shareContent(input: ShareContentInput): Promise<SharingResult> {
    try {
      const url = publicContentUrl(env.appEnv === 'production' ? 'https://vinnot.com' : 'https://dev.vinnot.com', input.kind, input.id)
      return await sharingService.shareLink({ title: input.title, url })
    } catch { return 'failed' }
  },
  async shareLink(data: { title?: string; text?: string; url: string }): Promise<SharingResult> {
    try {
      if (sharingGateway.canShare()) {
        await sharingGateway.share(data)
        return 'shared'
      }
      await sharingGateway.copy(data.url)
      return 'copied'
    } catch (error) {
      return typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError' ? 'cancelled' : 'failed'
    }
  },
}
