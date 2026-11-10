import { render, screen } from "@testing-library/react-native";
import { Modal, Text } from "react-native";
import { useReduceMotionEnabled } from "@/presentation/hooks/useReduceMotionEnabled";
import { AdminDetailSheet } from "./AdminDetailSheet";

jest.mock("@/presentation/hooks/useReduceMotionEnabled", () => ({ useReduceMotionEnabled: jest.fn(() => false) }));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));

function renderSheet() {
  render(
    <AdminDetailSheet visible title="Detail" onClose={jest.fn()}>
      <Text>Body</Text>
    </AdminDetailSheet>,
  );
  return screen.UNSAFE_getByType(Modal);
}

it("slides the sheet up when Reduce Motion is off", () => {
  jest.mocked(useReduceMotionEnabled).mockReturnValue(false);
  expect(renderSheet().props.animationType).toBe("slide");
});

it("fades the sheet in under Reduce Motion", () => {
  jest.mocked(useReduceMotionEnabled).mockReturnValue(true);
  expect(renderSheet().props.animationType).toBe("fade");
});
