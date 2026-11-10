import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { AuthProvider } from "./AuthProvider";
import { appStore } from "@/presentation/store";
import { initSession } from "@/presentation/store/authSlice";

jest.mock("@/infrastructure/api/http", () => ({ configureHttpAuth: jest.fn() }));
jest.mock("@/presentation/store", () => ({ appStore: { getState: jest.fn(), dispatch: jest.fn() } }));
jest.mock("@/presentation/store/authSlice", () => ({ initSession: jest.fn(() => ({ type: "boot" })), refreshSession: jest.fn() }));
jest.mock("@/presentation/store/uiSlice", () => ({ hydrateUiState: jest.fn(() => ({ type: "ui" })) }));
jest.mock("@/shared/i18n", () => ({ __esModule: true, default: { language: "en" } }));
jest.mock("@/application/services/reauthentication.service", () => ({ reauthenticationService: { request: jest.fn() } }));
jest.mock("@/presentation/features/auth/ReauthenticationDialog", () => ({ ReauthenticationProvider: ({ children }: { children: React.ReactNode }) => children }));

it("restores once, retaining an in-flight or completed bootstrap across provider remounts", async () => {
  let auth = { isInitializing: true, pendingSessionRequest: undefined as string | undefined };
  jest.mocked(appStore.getState).mockImplementation(() => ({ auth }) as ReturnType<typeof appStore.getState>);
  jest.mocked(appStore.dispatch).mockImplementation(((action: { type: string }) => {
    if (action.type === "boot") auth = { isInitializing: true, pendingSessionRequest: "request" };
    return action;
  }) as typeof appStore.dispatch);
  let tree!: ReactTestRenderer;
  const mount = async () => { await act(async () => { tree = create(<AuthProvider>{null}</AuthProvider>); }); };
  const unmount = async () => { await act(async () => { tree.unmount(); }); };
  await mount(); await unmount();
  await mount(); await unmount();
  auth = { isInitializing: false, pendingSessionRequest: "request" };
  await mount(); await unmount();
  expect(initSession).toHaveBeenCalledTimes(1);
});
