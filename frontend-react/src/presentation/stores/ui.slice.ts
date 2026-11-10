import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { readPersistedTheme } from './persistence'

export type Theme = 'light' | 'dark' | 'system'

export interface UiState {
  theme: Theme
  sidebarOpen: boolean
}

const initialState: UiState = {
  theme: readPersistedTheme(),
  sidebarOpen: false,
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<Theme>) {
      state.theme = action.payload
    },
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen
    },
    setSidebarOpen(state, action: PayloadAction<boolean>) {
      state.sidebarOpen = action.payload
    },
    patchState(state, action: PayloadAction<Partial<UiState>>) {
      Object.assign(state, action.payload)
    },
  },
})

export const uiActions = uiSlice.actions
export const uiReducer = uiSlice.reducer
