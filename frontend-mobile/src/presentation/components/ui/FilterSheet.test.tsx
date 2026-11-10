import { KeyboardAvoidingView, Modal, Platform, ScrollView, Text } from "react-native";
import { render } from "@testing-library/react-native";
import { useContext } from "react";
import { FilterSheet } from "./FilterSheet";
import { SheetFieldFocusContext } from "./SheetInputContext";
import { useReduceMotionEnabled } from "@/presentation/hooks/useReduceMotionEnabled";

jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock("@/presentation/hooks/useReduceMotionEnabled", () => ({ useReduceMotionEnabled: jest.fn(() => false) }));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

function renderSheet() {
  return render(
    <FilterSheet visible title="Filtrar" onClose={jest.fn()}>
      <Text>options</Text>
    </FilterSheet>,
  );
}

describe("FilterSheet and the keyboard", () => {
  const originalOs = Platform.OS;
  afterEach(() => {
    Platform.OS = originalOs;
  });

  it("lifts the whole sheet above the keyboard on iOS", () => {
    Platform.OS = "ios";
    const screen = renderSheet();

    expect(screen.UNSAFE_getByType(KeyboardAvoidingView).props.behavior).toBe("padding");
  });

  it("keeps resizing the sheet on Android", () => {
    Platform.OS = "android";
    const screen = renderSheet();

    expect(screen.UNSAFE_getByType(KeyboardAvoidingView).props.behavior).toBe("height");
  });

  it("does not add a second keyboard inset inside the lifted sheet", () => {
    Platform.OS = "ios";
    const screen = renderSheet();

    expect(screen.UNSAFE_getByType(ScrollView).props.automaticallyAdjustKeyboardInsets).toBeFalsy();
  });

  it("gives its sections a way to stay visible above the keyboard", () => {
    const seen: Array<(field: null) => void> = [];
    function Section() {
      seen.push(useContext(SheetFieldFocusContext));
      return null;
    }
    const outside = render(<Section />);
    const defaultFocus = seen.pop();
    outside.unmount();

    const screen = render(
      <FilterSheet visible title="Filtrar" onClose={jest.fn()}>
        <Section />
      </FilterSheet>,
    );

    expect(seen.at(-1)).not.toBe(defaultFocus);
    expect(screen.UNSAFE_getByType(ScrollView).props.onLayout).toEqual(expect.any(Function));
  });
});

describe("FilterSheet motion", () => {
  it("slides up by default", () => {
    jest.mocked(useReduceMotionEnabled).mockReturnValue(false);
    expect(renderSheet().UNSAFE_getByType(Modal).props.animationType).toBe("slide");
  });

  it("fades in instead of sliding when the system asks to reduce motion", () => {
    jest.mocked(useReduceMotionEnabled).mockReturnValue(true);
    expect(renderSheet().UNSAFE_getByType(Modal).props.animationType).toBe("fade");
  });
});
