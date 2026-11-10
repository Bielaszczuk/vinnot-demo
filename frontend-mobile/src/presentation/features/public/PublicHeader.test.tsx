import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { useRouter } from "expo-router";
import { PublicHeader } from "./PublicHeader";

jest.mock("expo-router", () => ({ useRouter: jest.fn() }));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));

it("goes back when possible and returns home for a standalone deep link", () => {
  const router = {
    canGoBack: jest.fn().mockReturnValue(true),
    back: jest.fn(),
    replace: jest.fn(),
  };
  jest.mocked(useRouter).mockReturnValue(router as unknown as ReturnType<typeof useRouter>);
  render(<PublicHeader title="Legal" />);
  expect(screen.getByText("Legal")).toBeTruthy();
  fireEvent.press(screen.getByRole("button", { name: "common.back" }));
  expect(router.back).toHaveBeenCalledTimes(1);
  router.canGoBack.mockReturnValue(false);
  fireEvent.press(screen.getByRole("button", { name: "common.back" }));
  expect(router.replace).toHaveBeenCalledWith("/");
});
