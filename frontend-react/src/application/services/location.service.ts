import { locationGateway } from '@infrastructure/device/location.gateway'

export const locationService = {
  async getCurrentLocation(): Promise<{ latitude: number; longitude: number } | null> {
    try { return await locationGateway.getCurrentPosition() } catch { return null }
  },
}
