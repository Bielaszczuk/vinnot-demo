import { useState } from "react";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Modal, Pressable, Text } from "react-native";
import { useAdminEventMutations } from "@/presentation/hooks/queries/admin";
import { useSingleAction } from "@/presentation/hooks/useSingleAction";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { AxiosError, type InternalAxiosRequestConfig, type AxiosResponse } from "axios";
import { appApi } from "@/presentation/store/api";
import { http, configureHttpAuth } from "@/infrastructure/api/http";
import { reauthenticationService } from "@/application/services/reauthentication.service";
import { ReauthenticationProvider } from "@/presentation/features/auth/ReauthenticationDialog";
import { AdminUserActionSheet } from "@/presentation/features/admin/AdminUserActionSheet";
import type { AdminUser } from "@/domain/admin/admin.types";

const mockSuccess = jest.fn();
const mockError = jest.fn();
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 20 }),
}));
jest.mock("@/presentation/providers/ToastProvider", () => ({
  useToast: () => ({ showSuccess: mockSuccess, showError: mockError }),
}));

const user: AdminUser = {
  id: "local-user",
  username: "Local fixture",
  email: "fixture@example.test",
  roles: ["ROLE_USER"],
  locked: false,
  enabled: true,
  name: null,
  lockReason: null,
  createdAt: "2026-10-06T12:00:00Z",
  lastLoginAt: null,
  points: 0,
  badgeTier: null,
};
const originalAdapter = http.defaults.adapter;
const stores: ReturnType<typeof configureStore>[] = [];
let storedRole = "ROLE_USER";
let roleAttempts = 0;
let appliedChanges = 0;
let failMutation = false;
let bearer = "local-access";
let operation = "role";
let deleteBodies: unknown[] = [];

function response(config: InternalAxiosRequestConfig, data: unknown, status = 200): AxiosResponse {
  const result = { config, data, status, statusText: String(status), headers: {} };
  if (status >= 400) throw new AxiosError("Denied", "ERR_BAD_REQUEST", config, undefined, result);
  return result;
}
function Panel() {
  const [visible, setVisible] = useState(true);
  return <AdminUserActionSheet visible={visible} user={user} onClose={() => setVisible(false)} />;
}
function DeletePanel() {
  const { remove } = useAdminEventMutations();
  const action = useSingleAction();
  return (
    <Pressable
      disabled={action.pending}
      onPress={() =>
        void action.run(() => remove.mutateAsync({ id: "local-event", cancellation: { reason: "WEATHER" } }), mockSuccess, mockError)
      }
    >
      <Text>{action.pending ? "Cancelling" : "Cancel event"}</Text>
    </Pressable>
  );
}
function openPanel(deletion = false) {
  const store = configureStore({
    reducer: {
      auth: (state = { sessionGeneration: 0 }) => state,
      [appApi.reducerPath]: appApi.reducer,
    },
    middleware: (getDefault) => getDefault().concat(appApi.middleware),
  });
  stores.push(store);
  return render(
    <Provider store={store}>
      <ReauthenticationProvider>{deletion ? <DeletePanel /> : <Panel />}</ReauthenticationProvider>
    </Provider>,
  );
}
beforeEach(() => {
  jest.clearAllMocks();
  reauthenticationService.cancel();
  operation = "role";
  deleteBodies = [];
  storedRole = "ROLE_USER";
  roleAttempts = 0;
  appliedChanges = 0;
  failMutation = false;
  bearer = "local-access";
  configureHttpAuth({
    getAccessToken: () => bearer,
    getSessionGeneration: () => 0,
    refreshToken: async () => "local-access",
    reauthenticate: () => {
      bearer = "renewed-access";
      return reauthenticationService.request();
    },
  });
  // Only an in-memory Axios adapter runs. No remote accounts or HTTP services are used.
  http.defaults.adapter = async (config) => {
    const body = JSON.parse(config.data ?? "{}");
    if (config.url === "/auth/reauthenticate") {
      return body.password === "correct"
        ? response(config, { proof: "local-proof" })
        : response(config, { code: "INVALID_CREDENTIALS" }, 401);
    }
    expect(config.url).toBe(
      operation === "role" ? "/admin/users/local-user/role" : "/admin/events/local-event",
    );
    roleAttempts++;
    if (operation === "delete") deleteBodies.push(body);
    if (
      config.headers.get("X-Admin-Reauthentication") !== "local-proof" ||
      config.headers.Authorization !== "Bearer renewed-access"
    ) {
      return response(config, { code: "REAUTHENTICATION_REQUIRED" }, 403);
    }
    if (failMutation) return response(config, { code: "INTERNAL_ERROR" }, 500);
    appliedChanges++;
    storedRole = body.role;
    return response(config, undefined, 204);
  };
});
afterEach(() => {
  cleanup();
  reauthenticationService.cancel();
  for (const store of stores.splice(0)) store.dispatch(appApi.util.resetApiState());
  http.defaults.adapter = originalAdapter;
});

it.each(["ROLE_ADMIN", "ROLE_MODERATOR", "ROLE_PARTNER"])(
  "confirms %s inside the user modal, then applies once and closes",
  async (role) => {
    const view = openPanel();
    fireEvent.press(view.getByText(`roles.${role}`));
    fireEvent.press(view.getByText("admin.users.saveRole"));
    await waitFor(() => expect(view.getByLabelText("reauthentication.password")).toBeTruthy());
    expect(view.UNSAFE_getAllByType(Modal).filter((modal) => modal.props.visible)).toHaveLength(1);
    expect(appliedChanges).toBe(0);
    fireEvent.changeText(view.getByLabelText("reauthentication.password"), "correct");
    fireEvent.press(view.getByText("reauthentication.confirm"));
    await waitFor(() => expect(mockSuccess).toHaveBeenCalledTimes(1));
    expect(storedRole).toBe(role);
    expect(roleAttempts).toBe(2);
    expect(appliedChanges).toBe(1);
    expect(view.UNSAFE_getAllByType(Modal).filter((modal) => modal.props.visible)).toHaveLength(0);
  },
);

it("allows a wrong password to be corrected without losing the selected role", async () => {
  const view = openPanel();
  fireEvent.press(view.getByText("roles.ROLE_ADMIN"));
  fireEvent.press(view.getByText("admin.users.saveRole"));
  await waitFor(() => expect(view.getByLabelText("reauthentication.password")).toBeTruthy());
  fireEvent.changeText(view.getByLabelText("reauthentication.password"), "wrong");
  fireEvent.press(view.getByText("reauthentication.confirm"));
  await waitFor(() => expect(view.getByText("reauthentication.failed")).toBeTruthy());
  expect(appliedChanges).toBe(0);
  fireEvent.changeText(view.getByLabelText("reauthentication.password"), "correct");
  fireEvent.press(view.getByText("reauthentication.confirm"));
  await waitFor(() => expect(storedRole).toBe("ROLE_ADMIN"));
  expect(appliedChanges).toBe(1);
});

it.each(["button", "native-back"])(
  "cancels with %s, releases loading and allows another save",
  async (method) => {
    const view = openPanel();
    fireEvent.press(view.getByText("roles.ROLE_PARTNER"));
    fireEvent.press(view.getByText("admin.users.saveRole"));
    await waitFor(() => expect(view.getByLabelText("reauthentication.password")).toBeTruthy());
    if (method === "button") fireEvent.press(view.getByText("reauthentication.cancel"));
    else act(() => view.UNSAFE_getByType(Modal).props.onRequestClose());
    await waitFor(() => expect(view.getByText("admin.users.saveRole")).toBeTruthy());
    expect(view.queryByLabelText("reauthentication.password")).toBeNull();
    expect(appliedChanges).toBe(0);
    fireEvent.press(view.getByText("admin.users.saveRole"));
    await waitFor(() => expect(view.getByLabelText("reauthentication.password")).toBeTruthy());
    fireEvent.changeText(view.getByLabelText("reauthentication.password"), "correct");
    fireEvent.press(view.getByText("reauthentication.confirm"));
    await waitFor(() => expect(mockSuccess).toHaveBeenCalledTimes(1));
    expect(storedRole).toBe("ROLE_PARTNER");
    expect(appliedChanges).toBe(1);
  },
);

it("releases loading after a backend failure and retries with the existing proof", async () => {
  const view = openPanel();
  failMutation = true;
  fireEvent.press(view.getByText("roles.ROLE_MODERATOR"));
  fireEvent.press(view.getByText("admin.users.saveRole"));
  await waitFor(() => expect(view.getByLabelText("reauthentication.password")).toBeTruthy());
  fireEvent.changeText(view.getByLabelText("reauthentication.password"), "correct");
  fireEvent.press(view.getByText("reauthentication.confirm"));
  await waitFor(() => expect(mockError).toHaveBeenCalledTimes(1));
  expect(appliedChanges).toBe(0);
  failMutation = false;
  fireEvent.press(view.getByText("admin.users.saveRole"));
  await waitFor(() => expect(mockSuccess).toHaveBeenCalledTimes(1));
  expect(storedRole).toBe("ROLE_MODERATOR");
  expect(view.queryByLabelText("reauthentication.password")).toBeNull();
});

it("continues event cancellation exactly once after password confirmation without another delete tap", async () => {
  operation = "delete";
  const view = openPanel(true);
  fireEvent.press(view.getByText("Cancel event"));
  await waitFor(() => expect(view.getByLabelText("reauthentication.password")).toBeTruthy());
  expect(view.getByText("Cancelling")).toBeTruthy();
  expect(appliedChanges).toBe(0);
  fireEvent.changeText(view.getByLabelText("reauthentication.password"), "correct");
  fireEvent.press(view.getByText("reauthentication.confirm"));
  await waitFor(() => expect(mockSuccess).toHaveBeenCalledTimes(1));
  expect(roleAttempts).toBe(2);
  expect(appliedChanges).toBe(1);
  expect(deleteBodies).toEqual([{ reason: "WEATHER" }, { reason: "WEATHER" }]);
  expect(mockError).not.toHaveBeenCalled();
  expect(view.queryByLabelText("reauthentication.password")).toBeNull();
  expect(view.getByText("Cancel event")).toBeTruthy();
});
