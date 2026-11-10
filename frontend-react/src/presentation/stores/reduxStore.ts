import { configureStore } from '@reduxjs/toolkit'
import { authReducer } from './auth.slice'
import { uiReducer } from './ui.slice'
import { writePersistedTheme } from './persistence'

export const appStore = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
})

export type RootState = ReturnType<typeof appStore.getState>
export type AppDispatch = typeof appStore.dispatch

let previousTheme = ''

appStore.subscribe(() => {
  const state = appStore.getState()
  if (state.ui.theme !== previousTheme) {
    writePersistedTheme(state.ui.theme)
    previousTheme = state.ui.theme
  }
})
