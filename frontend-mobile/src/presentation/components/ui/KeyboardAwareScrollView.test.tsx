import { createRef } from "react";
import { Keyboard, Platform, ScrollView, Text, TextInput, type ScrollViewInstance } from "react-native";
import { act, fireEvent, render } from "@testing-library/react-native";
import { KeyboardAwareScrollView } from "./KeyboardAwareScrollView";

type MeasureCallback = (x: number, y: number, width: number, height: number) => void;

function withPlatform(platform: "ios" | "android", run: () => void) {
  const original = Platform.OS;
  Object.defineProperty(Platform, "OS", { configurable: true, value: platform });
  try {
    run();
  } finally {
    Object.defineProperty(Platform, "OS", { configurable: true, value: original });
  }
}

function focusFieldAt(y: number) {
  jest.spyOn(TextInput.State, "currentlyFocusedInput").mockReturnValue({
    measureInWindow: (callback: MeasureCallback) => callback(16, y, 320, 48),
  } as never);
}

function emit(subscribe: jest.SpyInstance, event: "keyboardDidShow" | "keyboardDidHide") {
  act(() =>
    subscribe.mock.calls
      .filter(([name]) => name === event)
      .forEach(([, listener]) => (listener as (e: unknown) => void)({})),
  );
}

function scrollSpy(screen: ReturnType<typeof render>) {
  const scroll = screen.UNSAFE_getByType(ScrollView).instance as unknown as ScrollViewInstance;
  const scrollTo = jest.spyOn(scroll, "scrollTo").mockImplementation(() => undefined);
  // The React Native jest ScrollView mock shares one scrollTo mock across instances.
  scrollTo.mockClear();
  return scrollTo;
}

afterEach(() => jest.restoreAllMocks());

it("lets iOS inset the scroll for the keyboard and keeps taps on handled controls", () => {
  withPlatform("ios", () => {
    const screen = render(
      <KeyboardAwareScrollView>
        <Text>Review</Text>
      </KeyboardAwareScrollView>,
    );
    const scroll = screen.UNSAFE_getByType(ScrollView);
    expect(scroll.props.automaticallyAdjustKeyboardInsets).toBe(true);
    expect(scroll.props.keyboardShouldPersistTaps).toBe("handled");
    expect(scroll.props.scrollEventThrottle).toBe(16);
    screen.rerender(
      <KeyboardAwareScrollView automaticallyAdjustKeyboardInsets={false} keyboardShouldPersistTaps="always">
        <Text>Review</Text>
      </KeyboardAwareScrollView>,
    );
    expect(screen.UNSAFE_getByType(ScrollView).props.automaticallyAdjustKeyboardInsets).toBe(false);
    expect(screen.UNSAFE_getByType(ScrollView).props.keyboardShouldPersistTaps).toBe("always");
  });
});

it("reserves the keyboard height on Android while it is docked and removes it on hide", () => {
  withPlatform("android", () => {
    const subscribe = jest.spyOn(Keyboard, "addListener");
    const screen = render(
      <KeyboardAwareScrollView>
        <Text>Review</Text>
      </KeyboardAwareScrollView>,
    );
    expect(screen.UNSAFE_getByType(ScrollView).props.automaticallyAdjustKeyboardInsets).toBe(false);
    expect(screen.queryByTestId("keyboard-space")).toBeNull();
    jest.spyOn(Keyboard, "metrics").mockReturnValue({ screenY: 500, screenX: 0, height: 300, width: 390 });
    emit(subscribe, "keyboardDidShow");
    expect(screen.getByTestId("keyboard-space")).toHaveStyle({ height: 300 });
    emit(subscribe, "keyboardDidHide");
    expect(screen.queryByTestId("keyboard-space")).toBeNull();
    screen.unmount();
  });
});

it.each(["ios", "android"] as const)("scrolls a focused field covered by the keyboard above it on %s", (platform) => {
  withPlatform(platform, () => {
    const subscribe = jest.spyOn(Keyboard, "addListener");
    const screen = render(
      <KeyboardAwareScrollView>
        <Text>Review</Text>
      </KeyboardAwareScrollView>,
    );
    const scrollTo = scrollSpy(screen);
    fireEvent.scroll(screen.UNSAFE_getByType(ScrollView), { nativeEvent: { contentOffset: { x: 0, y: 40 } } });
    focusFieldAt(620);
    jest.spyOn(Keyboard, "metrics").mockReturnValue({ screenY: 500, screenX: 0, height: 300, width: 390 });
    emit(subscribe, "keyboardDidShow");
    // 620 + 48 + 20 margin - 500 keyboard top = 188 overflow, on top of the current offset.
    expect(scrollTo).toHaveBeenLastCalledWith({ y: 228, animated: true });
    screen.unmount();
  });
});

it("leaves a focused field that is already above the keyboard where it is", () => {
  withPlatform("ios", () => {
    const subscribe = jest.spyOn(Keyboard, "addListener");
    const screen = render(
      <KeyboardAwareScrollView>
        <Text>Review</Text>
      </KeyboardAwareScrollView>,
    );
    const scrollTo = scrollSpy(screen);
    focusFieldAt(200);
    jest.spyOn(Keyboard, "metrics").mockReturnValue({ screenY: 500, screenX: 0, height: 300, width: 390 });
    emit(subscribe, "keyboardDidShow");
    fireEvent(screen.UNSAFE_getByType(ScrollView), "contentSizeChange", 390, 1400);
    expect(scrollTo).not.toHaveBeenCalled();
    screen.unmount();
  });
});

it("keeps a growing multiline field visible when the content size changes", () => {
  withPlatform("android", () => {
    const screen = render(
      <KeyboardAwareScrollView>
        <Text>Review</Text>
      </KeyboardAwareScrollView>,
    );
    const scrollTo = scrollSpy(screen);
    focusFieldAt(470);
    jest.spyOn(Keyboard, "metrics").mockReturnValue({ screenY: 500, screenX: 0, height: 300, width: 390 });
    fireEvent(screen.UNSAFE_getByType(ScrollView), "contentSizeChange", 390, 1400);
    expect(scrollTo).toHaveBeenLastCalledWith({ y: 38, animated: true });
  });
});

it("hands the ScrollView to object and callback refs and still calls the caller's handlers", () => {
  const objectRef = createRef<ScrollViewInstance>();
  const callbackRef = jest.fn();
  const onScroll = jest.fn();
  const onLayout = jest.fn();
  const onContentSizeChange = jest.fn();
  const screen = render(
    <KeyboardAwareScrollView
      ref={objectRef}
      onScroll={onScroll}
      onLayout={onLayout}
      onContentSizeChange={onContentSizeChange}
      scrollEventThrottle={32}
    >
      <Text>Review</Text>
    </KeyboardAwareScrollView>,
  );
  const scroll = screen.UNSAFE_getByType(ScrollView);
  expect(objectRef.current).toBe(scroll.instance);
  expect(scroll.props.scrollEventThrottle).toBe(32);
  const scrollEvent = { nativeEvent: { contentOffset: { x: 0, y: 12 } } };
  fireEvent.scroll(scroll, scrollEvent);
  fireEvent(scroll, "layout", { nativeEvent: { layout: { height: 400 } } });
  fireEvent(scroll, "contentSizeChange", 390, 900);
  expect(onScroll).toHaveBeenCalledWith(scrollEvent);
  expect(onLayout).toHaveBeenCalledWith({ nativeEvent: { layout: { height: 400 } } });
  expect(onContentSizeChange).toHaveBeenCalledWith(390, 900);
  screen.rerender(
    <KeyboardAwareScrollView ref={callbackRef}>
      <Text>Review</Text>
    </KeyboardAwareScrollView>,
  );
  expect(callbackRef).toHaveBeenLastCalledWith(screen.UNSAFE_getByType(ScrollView).instance);
  expect(objectRef.current).toBeNull();
});
