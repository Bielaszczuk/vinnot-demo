import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { User } from '@domain/user/user.types'
import { readPersistedAuth } from './persistence'

export interface AuthState {
  sessionGeneration?: number
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isInitializing: boolean
  isSessionExpired: boolean
}

const persisted = readPersistedAuth()

const initialState: AuthState = {
  user: persisted.user,
  accessToken: persisted.accessToken,
  refreshToken: persisted.refreshToken,
  isInitializing: true,
  isSessionExpired: false,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    beginSession(state) {
      state.sessionGeneration = (state.sessionGeneration ?? 0) + 1
    },
    setUser(state, action: PayloadAction<User | null>) {
      state.user = action.payload
    },
    setTokens(state, action: PayloadAction<{ accessToken: string; refreshToken: string }>) {
      state.accessToken = action.payload.accessToken
      state.refreshToken = action.payload.refreshToken
      state.isSessionExpired = false
    },
    clearSession(state) {
      state.isInitializing = false
      state.sessionGeneration = (state.sessionGeneration ?? 0) + 1
      state.user = null
      state.accessToken = null
      state.refreshToken = null
    },
    markSessionExpired(state) {
      state.isInitializing = false
      state.sessionGeneration = (state.sessionGeneration ?? 0) + 1
      state.user = null
      state.accessToken = null
      state.refreshToken = null
      state.isSessionExpired = true
    },
    setSessionExpired(state, action: PayloadAction<boolean>) {
      state.isSessionExpired = action.payload
    },
    setInitializing(state, action: PayloadAction<boolean>) {
      state.isInitializing = action.payload
    },
    patchState(state, action: PayloadAction<Partial<AuthState>>) {
      Object.assign(state, action.payload)
    },
  },
})

export const authActions = authSlice.actions
export const authReducer = authSlice.reducer
