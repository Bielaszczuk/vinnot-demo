import { act, cleanup, fireEvent, render, renderHook, waitFor } from "@testing-library/react-native";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { AxiosError, type InternalAxiosRequestConfig, type AxiosResponse } from "axios";
import { appApi } from "@/presentation/store/api";
import { http } from "@/infrastructure/api/http";
import { useWineProfileEditor } from "@/presentation/hooks/queries/admin/useWineProfileEditor";
import { wineProfileFixture } from "@/test/fixtures/wineProfile";
import { Alert, Keyboard } from "react-native";
import { AdminWineAiProfileScreen } from "@/presentation/features/admin/AdminWineAiProfileScreen";

const mockSuccess = jest.fn();
const mockError = jest.fn();
const mockLeave = jest.fn();
const mockOptions = jest.fn();
let mockLocale = "en-US";
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: mockLocale } }) }));
jest.mock("expo-router", () => ({
  useNavigation: () => ({ setOptions: mockOptions }),
  useFocusEffect: jest.fn(),
  // The shared BackButton reads the router; this screen passes its own leave handler.
  useRouter: () => ({ canGoBack: () => true, back: jest.fn(), replace: jest.fn() }),
}));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 20, bottom: 20 }),
}));
jest.mock("@/presentation/providers/ToastProvider", () => ({
  useToast: () => ({ showSuccess: mockSuccess, showError: mockError }),
}));
jest.mock("@/presentation/hooks/queries/wine", () => ({
  ...jest.requireActual("@/presentation/hooks/queries/wine"),
  useWineDetail: () => ({ data: { id: "local-wine", name: "Local fixture", winery: "Local winery" }, isLoading: false }),
}));

const originalAdapter = http.defaults.adapter;
const stores: ReturnType<typeof configureStore>[] = [];
const patchRequests: Array<{ language: string; content: Record<string, unknown> }> = [];
const reads: string[] = [];
let failSave = false;
let failRead = 0;
let finishPatch: (() => void) | undefined;
let delayPatch = false;
let contentByLanguage: Record<string, Record<string, unknown>>;
const fixtureContent = Object.fromEntries(Object.entries(wineProfileFixture)
  .filter(([key]) => !["wineId", "fromCache", "generatedAt"].includes(key)));

function response(config: InternalAxiosRequestConfig, data: unknown, status = 200): AxiosResponse {
  const result = { config, data, status, statusText: String(status), headers: {} };
  if (status >= 400) throw new AxiosError("Failed", "ERR_BAD_REQUEST", config, undefined, result);
  return result;
}
function dto(language: string) {
  return { wineId: "local-wine", generatedAt: "2026-10-06T12:00:00Z", cached: false,
    profileContent: contentByLanguage[language] };
}
function createEditorStore() {
  const store = configureStore({
    reducer: { auth: (state = { sessionGeneration: 0 }) => state, [appApi.reducerPath]: appApi.reducer },
    // Production stores domain Dates in query results as well.
    middleware: getDefault => getDefault({ serializableCheck: false }).concat(appApi.middleware),
  });
  stores.push(store);
  return store;
}
function openEditor() {
  const store = createEditorStore();
  return { store, ...renderHook(() => useWineProfileEditor("local-wine", mockLeave), {
    wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
  }) };
}

beforeEach(() => {
  jest.useFakeTimers({ advanceTimers: true });
  jest.clearAllMocks();
  jest.spyOn(Keyboard, "dismiss").mockImplementation(() => undefined);
  mockLocale = "en-US";
  failSave = false; failRead = 0; delayPatch = false; finishPatch = undefined;
  reads.length = 0; patchRequests.length = 0;
  contentByLanguage = { en: JSON.parse(JSON.stringify(fixtureContent)), es: { summary: "Perfil en español" } };
  http.defaults.adapter = async config => {
    if (!config.url?.endsWith("/ai-profile")) throw new Error(`Unexpected local request: ${config.url}`);
    const language = String(config.params?.language);
    if (config.method === "get") {
      reads.push(language);
      if (failRead) return response(config, {}, failRead);
      return response(config, dto(language));
    }
    if (config.method !== "patch") throw new Error("Unexpected write");
    const content = JSON.parse(config.data as string) as Record<string, unknown>;
    patchRequests.push({ language, content });
    if (delayPatch) await new Promise<void>(resolve => { finishPatch = resolve; });
    if (failSave) return response(config, {}, 500);
    contentByLanguage[language] = content;
    return response(config, dto(language));
  };
});

it("saves from the complete visual screen and returns to the caller after confirmation", async () => {
  const view = render(<Provider store={createEditorStore()}>
    <AdminWineAiProfileScreen wineId="local-wine" onLeave={mockLeave} />
  </Provider>);
  await waitFor(() => expect(view.getByTestId("profile-field-summary")).toBeTruthy());
  fireEvent.changeText(view.getByTestId("profile-field-summary"), "Written from the visual editor");
  fireEvent.changeText(view.getByTestId("profile-field-palateAnalysis.bodyScore"), "65,5");
  fireEvent.press(view.getByText("common.save"));
  await waitFor(() => expect(mockSuccess).toHaveBeenCalledTimes(1));
  expect(patchRequests).toHaveLength(1);
  expect(patchRequests[0]).toMatchObject({language: "en", content: {summary: "Written from the visual editor", palateAnalysis: {bodyScore: 65.5}}});
  expect(view.getByTestId("profile-field-summary").props.value).toBe("Written from the visual editor");
  fireEvent.press(view.getByText("common.cancel"));
  expect(mockLeave).toHaveBeenCalledTimes(1);
});
afterEach(async () => {
  cleanup();
  stores.splice(0).forEach(store => store.dispatch(appApi.util.resetApiState()));
  http.defaults.adapter = originalAdapter;
  // Flush RTK's scheduled notification frame before the native Jest environment closes.
  await act(async () => { await jest.runOnlyPendingTimersAsync(); });
  jest.useRealTimers();
  jest.restoreAllMocks();
});

it("saves the active English profile once, keeps other sections and uses normal cache invalidation", async () => {
  const { result } = openEditor();
  await waitFor(() => expect(result.current.draft).not.toBeNull());
  expect(result.current.dirty).toBe(false);
  act(() => {
    result.current.changeField("summary", "Edited English summary");
    result.current.changeField("palateAnalysis.bodyScore", "65,5");
    result.current.changeField("aromaticProfile.primaryAromas", ["Flowers"]);
  });
  await act(async () => { await result.current.save(); });
  await waitFor(() => expect(reads).toEqual(["en", "en"]));
  expect(patchRequests).toHaveLength(1);
  expect(patchRequests[0]).toMatchObject({ language: "en", content: {
    summary: "Edited English summary", palateAnalysis: { bodyScore: 65.5 },
    aromaticProfile: { primaryAromas: ["Flowers"] }, servingRecommendations: fixtureContent.servingRecommendations,
  } });
  expect(patchRequests[0]!.content).not.toHaveProperty("wineId");
  expect(patchRequests[0]!.content).not.toHaveProperty("generatedAt");
  expect(patchRequests[0]!.content).not.toHaveProperty("fromCache");
  expect(contentByLanguage.es).toEqual({ summary: "Perfil en español" });
  expect(result.current.draft!.values.summary).toBe("Edited English summary");
  expect(result.current.dirty).toBe(false);
  expect(mockSuccess).toHaveBeenCalledWith("admin.aiProfile.updated");
});

it("validates before writing and lets the user correct invalid scores without losing text", async () => {
  const { result } = openEditor();
  await waitFor(() => expect(result.current.draft).not.toBeNull());
  act(() => { result.current.changeField("summary", " "); result.current.changeField("palateAnalysis.bodyScore", "101"); });
  await act(async () => { await result.current.save(); });
  expect(patchRequests).toHaveLength(0);
  expect(result.current.errors).toEqual({ summary: "required", "palateAnalysis.bodyScore": "score" });
  act(() => { result.current.changeField("summary", "Corrected"); result.current.changeField("palateAnalysis.bodyScore", "0"); });
  expect(result.current.errors).toEqual({});
  await act(async () => { await result.current.save(); });
  expect(patchRequests).toHaveLength(1);
});

it("returns from failed saves with the draft intact and supports an explicit retry in Spanish", async () => {
  mockLocale = "es-AR"; failSave = true;
  const { result } = openEditor();
  await waitFor(() => expect(result.current.draft).not.toBeNull());
  act(() => result.current.changeField("summary", "Resumen corregido"));
  await act(async () => { await result.current.save(); });
  expect(result.current.busy).toBe(false);
  expect(result.current.dirty).toBe(true);
  expect(result.current.draft!.values.summary).toBe("Resumen corregido");
  expect(mockError).toHaveBeenCalledWith("admin.aiProfile.saveError");
  failSave = false;
  await act(async () => { await result.current.save(); });
  expect(patchRequests.map(request => request.language)).toEqual(["es", "es"]);
  expect(result.current.dirty).toBe(false);
});

it("suppresses duplicate writes and prevents leaving or modifying the draft during save", async () => {
  delayPatch = true;
  const { result } = openEditor();
  await waitFor(() => expect(result.current.draft).not.toBeNull());
  act(() => result.current.changeField("summary", "Confirmed once"));
  let pending!: Promise<void>;
  act(() => { pending = result.current.save(); });
  await waitFor(() => expect(finishPatch).toBeDefined());
  await act(async () => { await result.current.save(); });
  act(() => { result.current.requestLeave(); result.current.changeField("summary", "Too late"); });
  expect(mockLeave).not.toHaveBeenCalled();
  expect(result.current.draft!.values.summary).toBe("Confirmed once");
  expect(patchRequests).toHaveLength(1);
  await act(async () => { finishPatch!(); await pending; });
  expect(result.current.busy).toBe(false);
});

it("restores local changes and requires confirmation before discarding an edited profile", async () => {
  const alert = jest.spyOn(Alert, "alert");
  const { result } = openEditor();
  await waitFor(() => expect(result.current.draft).not.toBeNull());
  act(() => result.current.changeField("summary", "Unpublished"));
  act(() => result.current.requestLeave());
  expect(mockLeave).not.toHaveBeenCalled();
  expect(alert).toHaveBeenCalledWith("admin.aiProfile.discardTitle", "admin.aiProfile.discardMessage", expect.any(Array));
  act(() => result.current.restore());
  expect(result.current.draft!.values.summary).toBe(wineProfileFixture.summary);
  expect(result.current.dirty).toBe(false);
  act(() => result.current.requestLeave());
  expect(mockLeave).toHaveBeenCalledTimes(1);
  expect(patchRequests).toHaveLength(0);
});

it("shows read failures separately and retries without generating or saving a profile", async () => {
  failRead = 503;
  const { result } = openEditor();
  await waitFor(() => expect(result.current.loadError).toBe(true));
  expect(result.current.draft).toBeNull();
  failRead = 0;
  act(() => result.current.retry());
  await waitFor(() => expect(result.current.draft).not.toBeNull());
  expect(patchRequests).toHaveLength(0);
});

it("distinguishes a missing profile from a transport failure without automatically generating", async () => {
  failRead = 404;
  const { result } = openEditor();
  await waitFor(() => expect(reads).toEqual(["en"]));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.loadError).toBe(false);
  expect(result.current.draft).toBeNull();
  expect(patchRequests).toHaveLength(0);
});
