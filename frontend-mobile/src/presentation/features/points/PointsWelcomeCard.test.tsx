import { render, screen } from "@testing-library/react-native";
import { Modal } from "react-native";
import { useReduceMotionEnabled } from "@/presentation/hooks/useReduceMotionEnabled";
import { PointsWelcomeCard } from "./PointsWelcomeCard";

jest.mock("@/presentation/hooks/useReduceMotionEnabled", () => ({ useReduceMotionEnabled: jest.fn(() => false) }));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
// The animated seal has its own tests; here only the modal presentation matters.
jest.mock("./UserBadge", () => ({ UserBadge: () => null }));

function renderCard() {
  render(<PointsWelcomeCard points={10} tier="BROTE" onDismiss={jest.fn()} onOpenPoints={jest.fn()} />);
  return screen.UNSAFE_getByType(Modal);
}

it("slides the welcome card up when Reduce Motion is off", () => {
  jest.mocked(useReduceMotionEnabled).mockReturnValue(false);
  expect(renderCard().props.animationType).toBe("slide");
});

it("fades the welcome card in under Reduce Motion", () => {
  jest.mocked(useReduceMotionEnabled).mockReturnValue(true);
  expect(renderCard().props.animationType).toBe("fade");
});
