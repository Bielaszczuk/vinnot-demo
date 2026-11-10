import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { AccessibilityInfo, Animated, Text } from "react-native";
import { Image } from "expo-image";
import { EmptyState, Skeleton } from "./Feedback";
import { illustrations } from "@/shared/illustrations";
import { useReduceMotionEnabled } from "@/presentation/hooks/useReduceMotionEnabled";

jest.mock("@/presentation/hooks/useReduceMotionEnabled", () => ({ useReduceMotionEnabled: jest.fn(() => false) }));

it("shows a watercolor illustration as decoration above the copy", () => {
  render(<EmptyState illustration="noWines" title="No wines" description="Try other filters" />);
  const image = screen.UNSAFE_getByType(Image);
  expect(image.props.source).toBe(illustrations.noWines);
  expect(image.props.accessible).toBe(false);
  expect(screen.getByRole("header", { name: "No wines" })).toBeTruthy();
  expect(screen.getByText("Try other filters")).toBeTruthy();
});

it("keeps the icon well when there is no illustration and runs its action", () => {
  const onPress = jest.fn();
  render(<EmptyState icon={<Text>icon</Text>} title="Empty" action={{ label: "Retry", onPress }} />);
  expect(screen.UNSAFE_queryByType(Image)).toBeNull();
  expect(screen.getByText("icon")).toBeTruthy();
  fireEvent.press(screen.getByRole("button", { name: "Retry" }));
  expect(onPress).toHaveBeenCalledTimes(1);
});

it("stops the skeleton shimmer when the user reduces motion", async () => {
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
  const loop = jest.spyOn(Animated, "loop");
  render(<Skeleton height={20} />);
  await act(async () => {});
  expect(loop).not.toHaveBeenCalled();
  loop.mockRestore();
});

it("animates the skeleton when motion is allowed", async () => {
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(false);
  const loop = jest.spyOn(Animated, "loop");
  const { unmount } = render(<Skeleton />);
  await act(async () => {});
  expect(loop).toHaveBeenCalledTimes(1);
  unmount();
  loop.mockRestore();
});

describe("empty state illustration under Reduce Motion", () => {
  afterEach(() => jest.mocked(useReduceMotionEnabled).mockReturnValue(false));

  it("fades the illustration in when Reduce Motion is off", () => {
    render(<EmptyState illustration="noWines" title="No wines" />);
    expect(screen.UNSAFE_getByType(Image).props.transition).toBe(180);
  });

  it("shows the illustration at once under Reduce Motion", () => {
    jest.mocked(useReduceMotionEnabled).mockReturnValue(true);
    render(<EmptyState illustration="noWines" title="No wines" />);
    expect(screen.UNSAFE_getByType(Image).props.transition).toBe(0);
  });
});
