import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { useForm } from "react-hook-form";
import en from "@/shared/i18n/locales/en-US.json";
import { EventEditorFields } from "./EventEditorFields";
import { toDefaultValues, type EventSheetFormValues } from "./EventEditor.contracts";
jest.mock("@/presentation/components/ui/TextField", () => ({ TextField: "TextInput" }));
jest.mock("@/presentation/components/ui/Button", () => ({ Button: "Text" }));
jest.mock("@/presentation/components/features/media/CoverImagePicker", () => ({
  CoverImagePicker: "View",
}));
jest.mock("@/presentation/components/features/location/LocationPickerMap", () => ({
  LocationPickerMap: "View",
}));
let mockCommissionRate: string | null = "8";
jest.mock("@/presentation/hooks/usePaymentAccountSetup", () => ({
  usePaymentAccountSetup: () => ({
    connected: true,
    pending: false,
    open: jest.fn(),
    statusError: false,
    commissionRate: mockCommissionRate,
  }),
}));
jest.mock("./EventDateTimeField", () => ({ EventDateTimeField: "TextInput" }));
function Harness() {
  const form = useForm<EventSheetFormValues>({
    defaultValues: {
      ...toDefaultValues(),
      title: "Tasting draft",
      price: "10000",
      pricingMode: "PAID",
    },
  });
  return (
    <EventEditorFields
      form={form}
      active
      imageUploading={false}
      onImageBusyChange={jest.fn()}
      searchAddress=""
      onSearchChange={jest.fn()}
      runGeocode={async () => {}}
      isGeocoding={false}
      onLocationChange={jest.fn()}
    />
  );
}
it("shows one section initially, retains draft fields across folds, and hides paid-only fields for a free event", async () => {
  const i18n = createInstance();
  await i18n.use(initReactI18next).init({
    lng: "en-US",
    resources: { "en-US": { translation: en } },
    interpolation: { escapeValue: false },
  });
  render(
    <I18nextProvider i18n={i18n}>
      <Harness />
    </I18nextProvider>,
  );
  expect(screen.getByDisplayValue("Tasting draft")).toBeTruthy();
  expect(screen.queryByDisplayValue("10000")).toBeNull();
  fireEvent.changeText(screen.getByDisplayValue("Tasting draft"), "Updated draft");
  fireEvent.press(screen.getByText("Basic information"));
  expect(screen.queryByDisplayValue("Updated draft")).toBeNull();
  fireEvent.press(screen.getByText("Basic information"));
  expect(screen.getByDisplayValue("Updated draft")).toBeTruthy();
  fireEvent.press(screen.getByText("Registration"));
  expect(screen.getByDisplayValue("10000")).toBeTruthy();
  expect(screen.getByText(en.eventEditor.paymentsConnected)).toBeTruthy();
  expect(screen.getByText("Vinnot deducts 8% of the ticket price.")).toBeTruthy();
  expect(screen.queryByText(en.eventEditor.connectPayments)).toBeNull();
  expect(screen.getByText(en.eventEditor.reconnectPayments)).toBeTruthy();
  await act(async () => fireEvent.press(screen.getByText("Free")));
  expect(screen.queryByDisplayValue("10000")).toBeNull();
  expect(screen.queryByText(en.eventEditor.externalPayment)).toBeNull();
});
it("omits the commission sentence while the rate is unknown", async () => {
  mockCommissionRate = null;
  const i18n = createInstance();
  await i18n.use(initReactI18next).init({
    lng: "en-US",
    resources: { "en-US": { translation: en } },
    interpolation: { escapeValue: false },
  });
  render(
    <I18nextProvider i18n={i18n}>
      <Harness />
    </I18nextProvider>,
  );
  fireEvent.press(screen.getByText("Registration"));
  expect(screen.getByText(en.eventEditor.externalPayment)).toBeTruthy();
  expect(screen.queryByText(/Vinnot deducts/)).toBeNull();
  mockCommissionRate = "8";
});
it("chooses the event type from a selector instead of a row of chips", async () => {
  const i18n = createInstance();
  await i18n.use(initReactI18next).init({
    lng: "en-US",
    resources: { "en-US": { translation: en } },
    interpolation: { escapeValue: false },
  });
  render(
    <I18nextProvider i18n={i18n}>
      <Harness />
    </I18nextProvider>,
  );
  const field = screen.getByRole("combobox", { name: new RegExp(en.partner.fields.type) });
  expect(screen.queryByText(en.events.types.FESTIVAL)).toBeNull();
  fireEvent.press(field);
  expect(screen.queryByLabelText(en.forms.picker.search)).toBeNull();
  fireEvent.press(screen.getByRole("button", { name: en.events.types.WORKSHOP }));
  expect(screen.queryByText(en.events.types.FESTIVAL)).toBeNull();
  expect(screen.getByText(en.events.types.WORKSHOP)).toBeTruthy();
});
