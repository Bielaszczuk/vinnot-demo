import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { Image } from "expo-image";
import { ImageWithFallback } from "./ImageWithFallback";
import { useReduceMotionEnabled } from "@/presentation/hooks/useReduceMotionEnabled";

jest.mock("@/presentation/hooks/useReduceMotionEnabled", () => ({ useReduceMotionEnabled: jest.fn(() => false) }));

it("preserves the real image, handles its failure and recovers when its source changes", () => {
  const view = render(
    <ImageWithFallback uri=" https://example.org/a.jpg " fallbackSource={7} alt="Event" />,
  );
  expect(view.UNSAFE_getByType(Image).props.source).toEqual({ uri: "https://example.org/a.jpg" });
  fireEvent(view.UNSAFE_getByType(Image), "error");
  expect(view.UNSAFE_getByType(Image).props.source).toBe(7);
  fireEvent(view.UNSAFE_getByType(Image), "error");
  expect(view.UNSAFE_queryByType(Image)).toBeNull();
  expect(view.getByText("Event")).toBeTruthy();
  view.rerender(<ImageWithFallback uri="https://example.org/b.jpg" fallbackSource={7} />);
  expect(view.UNSAFE_getByType(Image).props.source).toEqual({ uri: "https://example.org/b.jpg" });
});

it("uses the bundled fallback for missing images without retrying a broken asset", () => {
  const view = render(<ImageWithFallback uri=" " fallbackSource={7} style={{ height: 120 }} />);
  expect(view.UNSAFE_getByType(Image).props.source).toBe(7);
  fireEvent(view.UNSAFE_getByType(Image), "error");
  expect(view.UNSAFE_queryByType(Image)).toBeNull();
  view.rerender(<ImageWithFallback fallbackSource={8} />);
  expect(view.UNSAFE_getByType(Image).props.source).toBe(8);
});

it("reuses a remote cover cache across screens with a matching placeholder and resets recycled images", () => {
  const view = render(<ImageWithFallback uri="https://example.org/cover.jpg" placeholder={7} contentFit="cover" cachePolicy="memory-disk" enforceEarlyResizing transition={0} />);
  const image = view.UNSAFE_getByType(Image);
  expect(image.props.cachePolicy).toBe("memory-disk");
  expect(image.props.transition).toBe(0);
  expect(image.props.placeholder).toBe(7);
  expect(image.props.placeholderContentFit).toBe("cover");
  expect(image.props.enforceEarlyResizing).toBe(true);
  expect(image.props.allowDownscaling).toBe(true);
  view.rerender(<ImageWithFallback uri="https://example.org/next.jpg" />);
  expect(view.UNSAFE_getByType(Image).props.recyclingKey).toBe("https://example.org/next.jpg");
});

describe("image fade-in under Reduce Motion", () => {
  afterEach(() => jest.mocked(useReduceMotionEnabled).mockReturnValue(false));

  it("fades remote and fallback images in when Reduce Motion is off", () => {
    const view = render(<ImageWithFallback uri="https://example.org/a.jpg" fallbackSource={7} />);
    expect(view.UNSAFE_getByType(Image).props.transition).toBe(220);
    fireEvent(view.UNSAFE_getByType(Image), "error");
    expect(view.UNSAFE_getByType(Image).props.transition).toBe(180);
  });

  it("shows remote and fallback images at once under Reduce Motion", () => {
    jest.mocked(useReduceMotionEnabled).mockReturnValue(true);
    const view = render(<ImageWithFallback uri="https://example.org/a.jpg" fallbackSource={7} transition={400} />);
    expect(view.UNSAFE_getByType(Image).props.transition).toBe(0);
    fireEvent(view.UNSAFE_getByType(Image), "error");
    expect(view.UNSAFE_getByType(Image).props.transition).toBe(0);
  });
});
