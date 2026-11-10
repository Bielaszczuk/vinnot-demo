import { authHandlers } from './handlers/auth.handlers'
import { eventHandlers } from './handlers/event.handlers'
import { routeHandlers } from './handlers/route.handlers'
import { userHandlers } from './handlers/user.handlers'
import { wineHandlers } from './handlers/wine.handlers'

export const handlers = [
  ...authHandlers,
  ...wineHandlers,
  ...eventHandlers,
  ...routeHandlers,
  ...userHandlers,
]
