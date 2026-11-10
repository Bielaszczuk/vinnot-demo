import React, { type ComponentType } from "react";
import { render } from "@testing-library/react-native";
import { useReduceMotionEnabled } from "@/presentation/hooks/useReduceMotionEnabled";
import AppLayout from "../../../../app/(app)/_layout";
import AuthLayout from "../../../../app/(auth)/_layout";
import WinesLayout from "../../../../app/(app)/(tabs)/wines/_layout";
import EventsLayout from "../../../../app/(app)/(tabs)/events/_layout";
import RoutesLayout from "../../../../app/(app)/(tabs)/routes/_layout";
import AdminLayout from "../../../../app/(app)/admin/_layout";
import PartnerLayout from "../../../../app/(app)/partner/_layout";

const mockStackOptions = jest.fn();

jest.mock("@/presentation/hooks/useReduceMotionEnabled", () => ({ useReduceMotionEnabled: jest.fn(() => false) }));
jest.mock("expo-router", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const Stack = ({ screenOptions, children }: { screenOptions: unknown; children?: React.ReactNode }) => {
    mockStackOptions(screenOptions);
    return React.createElement(React.Fragment, null, children);
  };
  Stack.Screen = () => null;
  return { Stack, Redirect: () => null, useSegments: () => [] };
});
jest.mock("@/presentation/hooks/useAuth", () => ({
  useAuth: () => ({ user: { onboardingCompleted: true }, isAuthenticated: true, isInitializing: false }),
}));
jest.mock("@/presentation/features/public/TermsGate", () => ({
  TermsGate: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("@/presentation/navigation/guards", () => ({
  AuthGuard: ({ children }: { children: React.ReactNode }) => children,
  RoleGuard: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("@/presentation/features/points/PointsHost", () => ({ PointsHost: () => null }));
jest.mock("@/presentation/features/auth", () => ({ authColors: { background: "#fff" } }));

function stackAnimationOf(Layout: ComponentType) {
  mockStackOptions.mockClear();
  render(<Layout />);
  expect(mockStackOptions).toHaveBeenCalled();
  return (mockStackOptions.mock.lastCall?.[0] as { animation?: string }).animation;
}

const layouts = [
  ["(app)", AppLayout, "slide_from_right"],
  ["(auth)", AuthLayout, "slide_from_bottom"],
  ["wines", WinesLayout, "slide_from_right"],
  ["events", EventsLayout, "slide_from_right"],
  ["routes", RoutesLayout, undefined],
  ["admin", AdminLayout, undefined],
  ["partner", PartnerLayout, undefined],
] as const;

describe("stack transitions", () => {
  it.each(layouts)("keeps the %s stack transition when Reduce Motion is off", (_name, Layout, animation) => {
    jest.mocked(useReduceMotionEnabled).mockReturnValue(false);
    expect(stackAnimationOf(Layout)).toBe(animation);
  });

  it.each(layouts)("cross-dissolves the %s stack under Reduce Motion", (_name, Layout) => {
    jest.mocked(useReduceMotionEnabled).mockReturnValue(true);
    expect(stackAnimationOf(Layout)).toBe("fade");
  });
});
