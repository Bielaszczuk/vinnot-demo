import React from "react";
import { BackHandler, Linking, Text } from "react-native";
import { act, fireEvent, render } from "@testing-library/react-native";
import { AppUpdateGate } from "./AppUpdateGate";
import { appVersionService } from "@/application/services/appVersion.service";

const mockShowError = jest.fn();
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock("@/presentation/providers/ToastProvider", () => ({ useToast: () => ({ showError: mockShowError }) }));
jest.mock("@/application/services/appVersion.service", () => ({ appVersionService: { requirement: jest.fn() } }));
jest.mock("@/application/services/applicationLifecycle.service", () => ({
  applicationLifecycleService: { subscribe: () => () => undefined },
}));

const requirement = jest.mocked(appVersionService.requirement);
const IOS_STORE = "https://apps.apple.com/app/vinnot/id6817992780";

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
});

async function renderGate() {
  const ui = render(
    <AppUpdateGate>
      <Text>Contenido de la app</Text>
    </AppUpdateGate>,
  );
  await act(async () => {
    await Promise.resolve();
  });
  return ui;
}

describe("AppUpdateGate", () => {
  it("renders the app when the build meets the minimum", async () => {
    requirement.mockResolvedValue({ required: false });
    const ui = await renderGate();
    expect(ui.getByText("Contenido de la app")).toBeTruthy();
    expect(ui.queryByText("forceUpdate.title")).toBeNull();
  });

  it("renders the app when the policy cannot be read", async () => {
    requirement.mockRejectedValue(new Error("offline"));
    const ui = await renderGate();
    expect(ui.getByText("Contenido de la app")).toBeTruthy();
  });

  it.each([
    ["App Store", IOS_STORE],
    ["Google Play", "https://play.google.com/store/apps/details?id=com.vinnot.app"],
  ])("replaces the app with the update screen and opens the %s listing", async (_store, url) => {
    requirement.mockResolvedValue({ required: true, storeUrl: url });
    const ui = await renderGate();
    expect(ui.queryByText("Contenido de la app")).toBeNull();
    expect(ui.getByText("forceUpdate.title")).toBeTruthy();
    expect(ui.getByText("forceUpdate.body")).toBeTruthy();
    const button = ui.getByLabelText("forceUpdate.actionLabel");
    await act(async () => {
      fireEvent.press(button);
    });
    expect(Linking.openURL).toHaveBeenCalledWith(url);
  });

  it("swallows the Android back button while blocked", async () => {
    const remove = jest.fn();
    const addListener = jest.spyOn(BackHandler, "addEventListener").mockReturnValue({ remove });
    requirement.mockResolvedValue({ required: true, storeUrl: IOS_STORE });
    const ui = await renderGate();
    const [event, listener] = addListener.mock.calls[0]!;
    expect(event).toBe("hardwareBackPress");
    expect(listener({} as never)).toBe(true);
    ui.unmount();
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
