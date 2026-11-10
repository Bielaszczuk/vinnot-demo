/**
 * MSW browser worker setup
 *
 * Initializes the service worker for intercepting requests in the browser.
 * Only used in development when VITE_MOCK_API=true.
 */

import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

export const worker = setupWorker(...handlers)

