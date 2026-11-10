import { createRoot } from 'react-dom/client'
import { App } from './App'

import '@assets/styles/tailwind.css'
import '@assets/styles/globals.css'

/**
 * Application entrypoint.
 *
 * Conditionally starts MSW for mock API in development,
 * then mounts the React tree.
 */
async function bootstrap() {
  // Start MSW if mock mode is enabled
  if (import.meta.env.DEV && import.meta.env.VITE_MOCK_API === 'true') {
    const { worker } = await import('@mocks/browser')
    await worker.start({
      onUnhandledRequest: 'bypass',
      serviceWorker: {
        url: '/mockServiceWorker.js',
      },
    })
    console.log('[MSW] Mock service worker started')
  }

  const root = document.getElementById('root')
  if (!root) throw new Error('Root element not found')

  createRoot(root).render(<App />)
}

bootstrap()
