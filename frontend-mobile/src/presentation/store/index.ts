import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { applicationLifecycleService } from "@/application/services/applicationLifecycle.service";
import authReducer from "./authSlice";
import uiReducer from "./uiSlice";
import draftsReducer from "./draftsSlice";
import { appApi } from "./api";

export const appStore = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    drafts: draftsReducer,
    [appApi.reducerPath]: appApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(appApi.middleware),
});

export type RootState = ReturnType<typeof appStore.getState>;
export type AppDispatch = typeof appStore.dispatch;

setupListeners(appStore.dispatch, (dispatch, { onFocus, onFocusLost }) => {
  return applicationLifecycleService.subscribe({
    onFocus: () => dispatch(onFocus()),
    onFocusLost: () => dispatch(onFocusLost()),
  });
});
