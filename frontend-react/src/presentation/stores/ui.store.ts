/**
 * UI store facade
 *
 * Public API remains Zustand-like while state is managed by Redux Toolkit.
 */

import { useMemo, useSyncExternalStore } from 'react'
import { uiActions, type Theme, type UiState } from './ui.slice'
import { appStore, type RootState } from './reduxStore'

export type { Theme }

export interface UiActions {
  setTheme: (theme: Theme) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
}

export type UiStore = UiState & UiActions

function applyThemeToDocument(theme: Theme): void {
  if (typeof window === 'undefined') return
  const root = document.documentElement
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark)
  root.classList.toggle('dark', isDark)
}

const selectUiSlice = (root: RootState): UiState => root.ui

function createUiActions(dispatch: typeof appStore.dispatch): UiActions {
  return {
    setTheme: (theme) => {
      applyThemeToDocument(theme)
      dispatch(uiActions.setTheme(theme))
    },
    toggleSidebar: () => {
      dispatch(uiActions.toggleSidebar())
    },
    setSidebarOpen: (open) => {
      dispatch(uiActions.setSidebarOpen(open))
    },
  }
}

function getUiSnapshot(): UiStore {
  const state = selectUiSlice(appStore.getState())
  const actions = createUiActions(appStore.dispatch)
  return { ...state, ...actions }
}

type UiSelector<T> = (state: UiStore) => T

interface UseUiStore {
  <T>(selector: UiSelector<T>): T
  (): UiStore
  getState: () => UiStore
  setState: (patch: Partial<UiState>) => void
}

const useUiStoreImpl = (<T>(selector?: UiSelector<T>) => {
  const state = useSyncExternalStore(
    appStore.subscribe,
    () => selectUiSlice(appStore.getState()),
    () => selectUiSlice(appStore.getState()),
  )

  const actions = useMemo(
    () => createUiActions(appStore.dispatch),
    [],
  )
  const snapshot = useMemo<UiStore>(
    () => ({ ...state, ...actions }),
    [state, actions],
  )

  if (selector) return selector(snapshot)
  return snapshot
}) as UseUiStore

useUiStoreImpl.getState = getUiSnapshot
useUiStoreImpl.setState = (patch) => {
  appStore.dispatch(uiActions.patchState(patch))
}

export const useUiStore = useUiStoreImpl
