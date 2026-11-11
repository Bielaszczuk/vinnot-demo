import { act, renderHook } from "@testing-library/react-native";
import { useFollowToggle } from "./useFollowToggle";

type Callbacks = { onError?: () => void; onSuccess?: () => void };
const mockFollow = jest.fn<void, [string, Callbacks]>();
const mockUnfollow = jest.fn<void, [string, Callbacks]>();
const mockShowError = jest.fn();

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock("@/presentation/providers/ToastProvider", () => ({ useToast: () => ({ showError: mockShowError }) }));
jest.mock("@/presentation/hooks/queries/social", () => ({
  useFollowMutations: () => ({
    follow: { mutate: mockFollow, isPending: false },
    unfollow: { mutate: mockUnfollow, isPending: false },
  }),
}));

beforeEach(() => jest.clearAllMocks());

it("follows at once and calls PUT through the follow mutation", () => {
  const { result } = renderHook(() => useFollowToggle("u-2", false));
  act(() => result.current.toggle());
  expect(result.current.following).toBe(true);
  expect(mockFollow).toHaveBeenCalledWith("u-2", expect.any(Object));
  expect(mockUnfollow).not.toHaveBeenCalled();
});

it("unfollows at once and puts the state back with a message when the call fails", () => {
  const { result } = renderHook(() => useFollowToggle("u-2", true));
  act(() => result.current.toggle());
  expect(result.current.following).toBe(false);
  expect(mockUnfollow).toHaveBeenCalledWith("u-2", expect.any(Object));
  act(() => mockUnfollow.mock.calls[0]![1].onError?.());
  expect(result.current.following).toBe(true);
  expect(mockShowError).toHaveBeenCalledWith("social.followError");
});

it("takes the refreshed server state as the truth", () => {
  const { result, rerender } = renderHook(({ following }) => useFollowToggle("u-2", following), {
    initialProps: { following: false },
  });
  act(() => result.current.toggle());
  rerender({ following: true });
  expect(result.current.following).toBe(true);
  rerender({ following: false });
  expect(result.current.following).toBe(false);
});
