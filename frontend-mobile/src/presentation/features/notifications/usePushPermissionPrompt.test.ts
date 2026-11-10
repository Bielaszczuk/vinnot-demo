import { act, renderHook, waitFor } from "@testing-library/react-native";
import { pushNotificationsService } from "@/application/services/pushNotifications.service";
import { usePushPermissionPrompt } from "./usePushPermissionPrompt";

const mockChannels = [{ id: "default", importance: "default", name: "Vinnot", description: "Otros avisos" }];
jest.mock("./usePushChannels", () => ({ usePushChannels: () => mockChannels }));
jest.mock("@/presentation/store/ui.store", () => ({
  useUiStore: (selector: (state: { language: string }) => unknown) => selector({ language: "en-US" }),
}));
jest.mock("@/application/services/pushNotifications.service", () => ({
  pushNotificationsService: {
    offerAfterEvent: jest.fn(),
    allowFromPrompt: jest.fn(),
  },
}));

const service = pushNotificationsService as jest.Mocked<typeof pushNotificationsService>;

beforeEach(() => {
  jest.clearAllMocks();
  service.offerAfterEvent.mockResolvedValue(true);
  service.allowFromPrompt.mockResolvedValue(true);
});

it("explains push notifications after a confirmed ticket when the service allows it", async () => {
  const { result } = renderHook(usePushPermissionPrompt);

  act(() => result.current.offer());

  await waitFor(() => expect(result.current.visible).toBe(true));
  expect(service.allowFromPrompt).not.toHaveBeenCalled();
});

it("stays hidden when the system already decided or a sheet already showed in this launch", async () => {
  service.offerAfterEvent.mockResolvedValue(false);
  const { result } = renderHook(usePushPermissionPrompt);

  await act(async () => result.current.offer());

  expect(result.current.visible).toBe(false);
});

it("allowing asks the system and registers the signed-in device through the service", async () => {
  const { result } = renderHook(usePushPermissionPrompt);
  act(() => result.current.offer());
  await waitFor(() => expect(result.current.visible).toBe(true));

  await act(async () => result.current.allow());

  expect(service.allowFromPrompt).toHaveBeenCalledWith("en-US", mockChannels, true);
  expect(result.current.visible).toBe(false);
  expect(result.current.busy).toBe(false);
});

it("a failed request just closes the explanation", async () => {
  service.allowFromPrompt.mockRejectedValue(new Error("unavailable"));
  const { result } = renderHook(usePushPermissionPrompt);

  await act(async () => result.current.allow());

  expect(result.current.visible).toBe(false);
});

it("a failed check never surfaces to the flow that offered it", async () => {
  service.offerAfterEvent.mockRejectedValue(new Error("storage"));
  const { result } = renderHook(usePushPermissionPrompt);

  await act(async () => result.current.offer());
  act(() => result.current.dismiss());

  expect(result.current.visible).toBe(false);
});
