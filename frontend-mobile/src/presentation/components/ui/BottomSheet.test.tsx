import React, { useRef } from "react";
import { BackHandler, Keyboard, Platform, StyleSheet, Text, type TextInputInstance } from "react-native";
import { act, fireEvent, render } from "@testing-library/react-native";
import { BottomSheetModal, BottomSheetScrollView, BottomSheetStickyFooter, BottomSheetView } from "./BottomSheet";
import { TextField } from "./TextField";

import { SheetFieldFocusContext, SheetFooterContext } from "./SheetInputContext";
const mockScrollTo = jest.fn();
const mockDismiss = jest.fn();
const mockPresent = jest.fn();
let mockViewportTop = -1_000_000;
let mockProps: React.PropsWithChildren<{
  onChange: (index: number) => void;
  onDismiss?: () => void;
  handleComponent: () => React.ReactNode;
  footerComponent?: (props: never) => React.ReactNode;
  topInset?: number;
  bottomInset?: number;
  enableDynamicSizing?: boolean;
  keyboardBehavior?: string;
  keyboardBlurBehavior?: string;
  android_keyboardInputMode?: string;
}>;
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 59, bottom: 34 }),
}));
jest.mock("@gorhom/bottom-sheet", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { TextInput, View } = jest.requireActual<typeof import("react-native")>("react-native");
  return {
    BottomSheetModal: React.forwardRef((props: typeof mockProps, ref) => {
      mockProps = props;
      React.useImperativeHandle(ref, () => ({ dismiss: mockDismiss, present: mockPresent }));
      return React.createElement(View, null, props.handleComponent(), props.children, props.footerComponent?.({} as never));
    }),
    BottomSheetScrollView: React.forwardRef((props: React.ComponentProps<typeof View>, ref) => {
      React.useImperativeHandle(ref, () => ({
        scrollTo: mockScrollTo,
        measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) =>
          callback(0, mockViewportTop, 390, 600),
      }));
      return React.createElement(View, props, props.children);
    }),
    BottomSheetView: (props: React.ComponentProps<typeof View>) => React.createElement(View, props, props.children),
    BottomSheetHandle: () => null,
    BottomSheetFooter: (props: React.ComponentProps<typeof View>) => React.createElement(View, null, props.children),
    BottomSheetTextInput: React.forwardRef<React.ElementRef<typeof TextInput>, React.ComponentProps<typeof TextInput>>((props, ref) =>
      React.createElement(TextInput, { ...props, ref, testID: "sheet-input" }),
    ),
  };
});

function Form({ busy = false }: { busy?: boolean }) {
  const ref = useRef<BottomSheetModal>(null);
  return (
    <BottomSheetModal ref={ref} enablePanDownToClose={!busy}>
      <Text>Form</Text>
      <TextField label="Name" value="Local" onChangeText={() => {}} />
    </BottomSheetModal>
  );
}

describe("shared native sheet contract", () => {
  beforeEach(() => jest.clearAllMocks());
  it.each([ ["android", "fillParent"], ["ios", "interactive"] ] as const)(
    "uses a keyboard layout compatible with %s and restores on dismissal",
    (platform, behavior) => {
      const original = Platform.OS;
      Object.defineProperty(Platform, "OS", { configurable: true, value: platform });
      try {
        const screen = render(<Form />);
        expect(mockProps.keyboardBehavior).toBe(behavior);
        expect(mockProps.android_keyboardInputMode).toBe("adjustResize");
        expect(mockProps.keyboardBlurBehavior).toBe("restore");
        screen.unmount();
      } finally {
        Object.defineProperty(Platform, "OS", { configurable: true, value: original });
      }
    },
  );
  it("uses safe boundaries and sheet-aware inputs, with an explicit close action", () => {
    const screen = render(<Form />);
    expect(mockProps.topInset).toBe(67);
    // The sheet surface reaches the screen edge; content padding keeps it above the home indicator.
    expect(mockProps.bottomInset).toBe(0);
    expect(mockProps.enableDynamicSizing).toBe(false);
    expect(mockProps.keyboardBehavior).toBe("interactive");
    expect(mockProps.keyboardBlurBehavior).toBe("restore");
    expect(mockProps.android_keyboardInputMode).toBe("adjustResize");
    expect(screen.getByTestId("sheet-input")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("common.back"));
    expect(mockDismiss).toHaveBeenCalledTimes(1);
    screen.rerender(<Form busy />);
    fireEvent.press(screen.getByLabelText("common.back"));
    expect(mockDismiss).toHaveBeenCalledTimes(1);
  });
  it("lets a short prompt hide the back button and reach the bottom edge", () => {
    const screen = render(
      <BottomSheetModal showBackButton={false}>
        <Text>Prompt</Text>
      </BottomSheetModal>,
    );
    expect(screen.queryByLabelText("common.back")).toBeNull();
    expect(mockProps.bottomInset).toBe(0);
    expect(mockProps.topInset).toBe(67);
  });
  it("still honours an explicit bottom inset and dynamic sizing", () => {
    render(
      <BottomSheetModal bottomInset={12} enableDynamicSizing>
        <Text>Detached</Text>
      </BottomSheetModal>,
    );
    expect(mockProps.bottomInset).toBe(12);
    expect(mockProps.enableDynamicSizing).toBe(true);
  });
  it("consumes Android Back only while the sheet is open and cleans up the listener", () => {
    const remove = jest.fn();
    const listener = jest.spyOn(BackHandler, "addEventListener").mockReturnValue({ remove });
    const screen = render(<Form />);
    expect(listener).not.toHaveBeenCalled();
    act(() => mockProps.onChange(0));
    expect(listener).toHaveBeenCalledWith("hardwareBackPress", expect.any(Function));
    act(() => {
      expect(listener.mock.calls[0]?.[1]?.({} as never)).toBe(true);
    });
    expect(mockDismiss).toHaveBeenCalledTimes(1);
    act(() => mockProps.onChange(-1));
    expect(remove).toHaveBeenCalledTimes(1);
    screen.unmount();
    listener.mockRestore();
  });
  it("ignores a dismissal before the sheet was ever presented, so a later present still opens it", () => {
    const onDismiss = jest.fn();
    const ref = React.createRef<BottomSheetModal>();
    render(
      <BottomSheetModal ref={ref} onDismiss={onDismiss}>
        <Text>Sheet</Text>
      </BottomSheetModal>,
    );
    // Screens dismiss their closed sheet on mount; Gorhom would then ignore present().
    act(() => ref.current?.dismiss());
    expect(mockDismiss).not.toHaveBeenCalled();
    act(() => ref.current?.present());
    expect(mockPresent).toHaveBeenCalledTimes(1);
    act(() => ref.current?.dismiss());
    expect(mockDismiss).toHaveBeenCalledTimes(1);
    act(() => mockProps.onDismiss?.());
    expect(onDismiss).toHaveBeenCalledTimes(1);
    act(() => ref.current?.dismiss());
    expect(mockDismiss).toHaveBeenCalledTimes(1);
  });
  it("keeps ordinary fields independent of Gorhom outside a sheet", () => {
    const screen = render(<TextField label="Name" />);
    expect(screen.queryByTestId("sheet-input")).toBeNull();
  });
});

it("reveals a field focused before Android reports the keyboard, then rechecks the resized viewport", () => {
  const metrics = jest.spyOn(Keyboard, "metrics").mockReturnValue(undefined);
  const subscribe = jest.spyOn(Keyboard, "addListener");
  let focus: (input: TextInputInstance | null) => void = () => {};
  function FieldProbe() {
    focus = React.useContext(SheetFieldFocusContext);
    return null;
  }
  const screen = render(<BottomSheetScrollView testID="form-scroll"><FieldProbe /></BottomSheetScrollView>);
  const remove = jest.spyOn(subscribe.mock.results[0]!.value, "remove");
  let fieldY = 600;
  const field = {
    measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) =>
      callback(20, fieldY, 300, 48),
  } as unknown as TextInputInstance;
  mockScrollTo.mockClear();
  act(() => focus(field));
  expect(mockScrollTo).not.toHaveBeenCalled();
  metrics.mockReturnValue({ screenY: 500, screenX: 0, height: 300, width: 390 });
  act(() => {
    subscribe.mock.calls.find(([event]) => event === "keyboardDidShow")?.[1]({} as never);
  });
  expect(mockScrollTo).toHaveBeenLastCalledWith({ y: 168, animated: true });
  // The sheet has now expanded and moved the field above the keyboard.
  fieldY = 200;
  mockScrollTo.mockClear();
  fireEvent(screen.getByTestId("form-scroll"), "layout", { nativeEvent: { layout: { height: 400 } } });
  expect(mockScrollTo).not.toHaveBeenCalled();
  screen.unmount();
  expect(remove).toHaveBeenCalledTimes(1);
  metrics.mockRestore();
  subscribe.mockRestore();
});

it("scrolls the focused field above the actual keyboard boundary", () => {
  const metrics = jest
    .spyOn(Keyboard, "metrics")
    .mockReturnValue({ screenY: 500, screenX: 0, height: 300, width: 390 });
  let focus: (input: TextInputInstance | null) => void = () => {};
  function FieldProbe() {
    focus = React.useContext(SheetFieldFocusContext);
    return null;
  }
  const screen = render(
    <BottomSheetScrollView>
      <FieldProbe />
    </BottomSheetScrollView>,
  );
  const field = {
    measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) =>
      callback(20, 450, 300, 120),
  } as unknown as TextInputInstance;
  act(() => focus(field));
  expect(mockScrollTo).toHaveBeenCalledWith({ y: 90, animated: true });
  mockScrollTo.mockClear();
  act(() => focus(null));
  expect(mockScrollTo).not.toHaveBeenCalled();
  metrics.mockReturnValue(undefined);
  act(() => focus(field));
  expect(mockScrollTo).not.toHaveBeenCalled();
  screen.unmount();
  metrics.mockRestore();
});

it("gives a low Android field enough scroll room above the docked keyboard, then removes it", () => {
  const original = Platform.OS;
  Object.defineProperty(Platform, "OS", { configurable: true, value: "android" });
  const metrics = jest
    .spyOn(Keyboard, "metrics")
    .mockReturnValue({ screenY: 500, screenX: 0, height: 300, width: 390 });
  const subscribe = jest.spyOn(Keyboard, "addListener");
  try {
    let focus: (input: TextInputInstance | null) => void = () => {};
    function FieldProbe() {
      focus = React.useContext(SheetFieldFocusContext);
      return null;
    }
    const screen = render(<BottomSheetScrollView testID="form-scroll"><FieldProbe /></BottomSheetScrollView>);
    expect(screen.queryByTestId("sheet-keyboard-space")).toBeNull();
    const contactPhone = {
      measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) =>
        callback(20, 640, 300, 52),
    } as unknown as TextInputInstance;
    act(() => focus(contactPhone));
    act(() => subscribe.mock.calls.filter(([event]) => event === "keyboardDidShow").forEach(([, listener]) => listener({} as never)));
    expect(screen.getByTestId("sheet-keyboard-space")).toHaveStyle({ height: 300 });
    mockScrollTo.mockClear();
    fireEvent(screen.getByTestId("form-scroll"), "contentSizeChange", 390, 1600);
    expect(mockScrollTo).toHaveBeenCalledWith({ y: 212, animated: true });
    act(() => subscribe.mock.calls.filter(([event]) => event === "keyboardDidHide").forEach(([, listener]) => listener({} as never)));
    expect(screen.queryByTestId("sheet-keyboard-space")).toBeNull();
    screen.unmount();
  } finally {
    Object.defineProperty(Platform, "OS", { configurable: true, value: original });
    metrics.mockRestore();
    subscribe.mockRestore();
  }
});

it("adds no keyboard space on iOS, where Gorhom moves the sheet itself", () => {
  const subscribe = jest.spyOn(Keyboard, "addListener");
  const metrics = jest
    .spyOn(Keyboard, "metrics")
    .mockReturnValue({ screenY: 500, screenX: 0, height: 300, width: 390 });
  const screen = render(<BottomSheetScrollView><Text>Form</Text></BottomSheetScrollView>);
  act(() => subscribe.mock.calls.filter(([event]) => event === "keyboardDidShow").forEach(([, listener]) => listener({} as never)));
  expect(screen.queryByTestId("sheet-keyboard-space")).toBeNull();
  screen.unmount();
  metrics.mockRestore();
  subscribe.mockRestore();
});

describe("sheet content clears the home indicator", () => {
  it("adds the safe-area bottom inset to the scroll content's own bottom padding", () => {
    const screen = render(
      <BottomSheetScrollView testID="form-scroll" contentContainerStyle={{ gap: 18, paddingBottom: 34 }}>
        <Text>Form</Text>
      </BottomSheetScrollView>,
    );
    const content = StyleSheet.flatten(screen.getByTestId("form-scroll").props.contentContainerStyle);
    expect(content).toMatchObject({ gap: 18, paddingBottom: 68 });
  });
  it("keeps at least a small gap above the inset when the content has no bottom padding", () => {
    const screen = render(
      <BottomSheetScrollView testID="form-scroll" contentContainerStyle={{ padding: 4 }}>
        <Text>Form</Text>
      </BottomSheetScrollView>,
    );
    const content = StyleSheet.flatten(screen.getByTestId("form-scroll").props.contentContainerStyle);
    expect(content).toMatchObject({ padding: 4, paddingBottom: 50 });
  });
  it("pads a plain sheet view the same way", () => {
    const screen = render(
      <BottomSheetView testID="plain" style={{ paddingBottom: 20 }}>
        <Text>Prompt</Text>
      </BottomSheetView>,
    );
    expect(StyleSheet.flatten(screen.getByTestId("plain").props.style)).toMatchObject({ paddingBottom: 54 });
  });
});

describe("sheet footer and tall fields", () => {
  const measurable = (y: number, height: number) =>
    ({
      measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) =>
        callback(20, y, 300, height),
    }) as unknown as TextInputInstance;
  function renderScroll(footer: { current: TextInputInstance | null } | null) {
    let focus: (input: TextInputInstance | null) => void = () => {};
    function FieldProbe() {
      focus = React.useContext(SheetFieldFocusContext);
      return null;
    }
    const screen = render(
      <SheetFooterContext.Provider value={footer}>
        <BottomSheetScrollView>
          <FieldProbe />
        </BottomSheetScrollView>
      </SheetFooterContext.Provider>,
    );
    return { screen, focus: (input: TextInputInstance | null) => act(() => focus(input)) };
  }
  let metrics: jest.SpyInstance;
  beforeEach(() => {
    mockScrollTo.mockClear();
    mockViewportTop = -1_000_000;
    metrics = jest.spyOn(Keyboard, "metrics").mockReturnValue({ screenY: 500, screenX: 0, height: 300, width: 390 });
  });
  afterEach(() => metrics.mockRestore());

  it("keeps the focused field above the sticky footer that sits over the keyboard", () => {
    const { screen, focus } = renderScroll({ current: measurable(420, 80) });
    focus(measurable(400, 48));
    expect(mockScrollTo).toHaveBeenCalledWith({ y: 48, animated: true });
    screen.unmount();
  });

  it("ignores a footer that has not been laid out yet", () => {
    const { screen, focus } = renderScroll({ current: measurable(0, 0) });
    focus(measurable(400, 48));
    expect(mockScrollTo).not.toHaveBeenCalled();
    screen.unmount();
  });

  it("never scrolls the top of a tall field out of the sheet's scroll area", () => {
    mockViewportTop = 100;
    const { screen, focus } = renderScroll(null);
    focus(measurable(150, 400));
    expect(mockScrollTo).toHaveBeenCalledWith({ y: 42, animated: true });
    screen.unmount();
  });

  it("shares one footer slot between the sticky footer and the sheet content", () => {
    let fromFooter: unknown;
    let fromContent: unknown;
    function ContentProbe() {
      fromContent = React.useContext(SheetFooterContext);
      return null;
    }
    render(
      <BottomSheetModal
        footerComponent={(props) => (
          <BottomSheetStickyFooter {...props}>
            <FooterProbe />
          </BottomSheetStickyFooter>
        )}
      >
        <ContentProbe />
      </BottomSheetModal>,
    );
    function FooterProbe() {
      fromFooter = React.useContext(SheetFooterContext);
      return null;
    }
    expect(fromContent).toBeTruthy();
    expect(fromFooter).toBe(fromContent);
    expect((fromContent as { current: unknown }).current).toBeTruthy();
  });
});
