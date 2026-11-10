export const sharingGateway = {
  canShare: () => typeof navigator.share === 'function',
  share: (data: ShareData) => navigator.share(data),
  async copy(text: string): Promise<void> {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
    await navigator.clipboard.writeText(text)
  },
}
