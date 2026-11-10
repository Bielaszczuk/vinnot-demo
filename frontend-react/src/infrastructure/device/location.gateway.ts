export interface BrowserCoordinates { latitude: number; longitude: number }

export const locationGateway = {
  getCurrentPosition(): Promise<BrowserCoordinates> {
    return new Promise((resolve, reject) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        reject(new Error('Location unavailable'))
        return
      }
      // The browser timeout can exclude time spent waiting for permission.
      // Bound the entire request so dismissing the prompt cannot block discovery.
      let settled = false
      const timer = setTimeout(() => {
        settled = true
        reject(new Error('Location timed out'))
      }, 10_000)
      navigator.geolocation.getCurrentPosition(
        position => {
          if (settled) return
          settled = true
          clearTimeout(timer)
          resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude })
        },
        error => {
          if (settled) return
          settled = true
          clearTimeout(timer)
          reject(error)
        },
        { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
      )
    })
  },
}
