jest.mock("@/presentation/hooks/useAuth", () => ({ useAuth: () => ({ user: null }) }));
jest.mock("@react-native-async-storage/async-storage", () => ({ getItem: jest.fn().mockResolvedValue(null), setItem: jest.fn().mockResolvedValue(undefined), removeItem: jest.fn().mockResolvedValue(undefined) }));
import { act, renderHook } from "@testing-library/react-native";
import { useEventEditor, toEventEditorPayload } from "./useEventEditor";
import { EVENT_STATUSES, toDefaultValues } from "./EventEditor.contracts";
import { geocodingService, type GeocodeResult } from "@/application/services/geocoding.service";
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock("@/presentation/providers/ToastProvider", () => ({
  useToast: () => ({ showError: jest.fn() }),
}));
jest.mock("@/application/services/geocoding.service", () => ({
  geocodingService: { geocodeAddress: jest.fn() },
}));
beforeEach(() => jest.clearAllMocks());
it("uses the same defaults and payload rules for admin and partner without sending presentation-only pricing mode", () => {
  const payload = toEventEditorPayload({
    ...toDefaultValues(),
    title: " Tasting ",
    price: "100",
    pricingMode: "FREE",
    maxAttendees: "",
    currency: "invalid-hidden-draft",
    contactEmail: " host@example.com ",
  });
  expect(payload).toEqual(
    expect.objectContaining({
      title: "Tasting",
      price: null,
      maxAttendees: null,
      currency: "ARS",
      contactEmail: "host@example.com",
    }),
  );
  expect(payload).not.toHaveProperty("pricingMode");
  expect(
    toEventEditorPayload({
      ...toDefaultValues(),
      pricingMode: "PAID",
      price: "10000.25",
      maxAttendees: "50",
    }),
  ).toEqual(expect.objectContaining({ price: 10000.25, maxAttendees: 50 }));
});
it("leaves out the payment fields the editor does not show, so saving never clears them", () => {
  const payload = toEventEditorPayload({ ...toDefaultValues(), title: "Cata" });
  expect(payload).not.toHaveProperty("paymentAlias");
  expect(payload).not.toHaveProperty("paymentQrUrl");
  expect(payload).not.toHaveProperty("paymentInstructions");
});
it("does not overwrite a manually selected zero coordinate with a late search result", async () => {
  let resolve!: (value: GeocodeResult) => void;
  jest.mocked(geocodingService.geocodeAddress).mockReturnValueOnce(
    new Promise((done) => {
      resolve = done;
    }),
  );
  const { result } = renderHook(() => useEventEditor(true));
  act(() => result.current.changeSearch("Some winery"));
  let pending!: Promise<void>;
  act(() => {
    pending = result.current.runGeocode();
  });
  act(() => result.current.selectLocation(0, 0));
  await act(async () => {
    resolve({
      ok: true,
      status: "OK",
      errorMessage: null,
      location: {
        latitude: -32,
        longitude: -68,
        formattedAddress: "Winery",
        placeId: null,
        city: null,
        region: null,
        country: null,
      },
    });
    await pending;
  });
  expect(result.current.form.getValues()).toEqual(
    expect.objectContaining({ latitude: 0, longitude: 0 }),
  );
  expect(result.current.isGeocoding).toBe(false);
});
it("clears the coordinates error once a map point sets both latitude and longitude", async () => {
  const { result } = renderHook(() => useEventEditor(true));
  await act(async () => result.current.selectLocation(-32.98, -68.87));
  expect(result.current.form.getFieldState("latitude").error).toBeUndefined();
  expect(result.current.form.getFieldState("longitude").error).toBeUndefined();
  expect(result.current.form.getValues()).toEqual(
    expect.objectContaining({ latitude: -32.98, longitude: -68.87 }),
  );
});
it("shows no coordinates error after a successful address search", async () => {
  jest.mocked(geocodingService.geocodeAddress).mockResolvedValueOnce({
    ok: true,
    status: "OK",
    errorMessage: null,
    location: {
      latitude: -32.98,
      longitude: -68.87,
      formattedAddress: "Viamonte 4950, Luján de Cuyo",
      placeId: null,
      city: "Luján de Cuyo",
      region: "Mendoza",
      country: "Argentina",
    },
  });
  const { result } = renderHook(() => useEventEditor(true));
  act(() => result.current.changeSearch("Viamonte 4950"));
  await act(async () => result.current.runGeocode());
  expect(result.current.form.getFieldState("latitude").error).toBeUndefined();
  expect(result.current.form.getFieldState("longitude").error).toBeUndefined();
  expect(result.current.form.getValues()).toEqual(
    expect.objectContaining({ latitude: -32.98, longitude: -68.87, locationName: "Viamonte 4950" }),
  );
});
it("ignores search completion after the editor closes and resets a reopened draft", async () => {
  let resolve!: (value: GeocodeResult) => void;
  jest.mocked(geocodingService.geocodeAddress).mockReturnValueOnce(
    new Promise((done) => {
      resolve = done;
    }),
  );
  const hook = renderHook(({ visible }) => useEventEditor(visible), {
    initialProps: { visible: true },
  });
  act(() => hook.result.current.changeSearch("Winery"));
  let pending!: Promise<void>;
  act(() => {
    pending = hook.result.current.runGeocode();
  });
  hook.rerender({ visible: false });
  hook.rerender({ visible: true });
  await act(async () => {
    resolve({
      ok: true,
      status: "OK",
      errorMessage: null,
      location: {
        latitude: -32,
        longitude: -68,
        formattedAddress: "Winery",
        placeId: null,
        city: null,
        region: null,
        country: null,
      },
    });
    await pending;
  });
  expect(hook.result.current.form.getValues("latitude")).toBeNull();
  expect(hook.result.current.searchAddress).toBe("");
});
it("rejects invalid capacity and reveals field errors instead of sending a request", async () => {
  const { result } = renderHook(() => useEventEditor(true));
  act(() => {
    result.current.form.setValue("title", "Tasting");
    result.current.form.setValue("maxAttendees", "1.5");
  });
  const saved = jest.fn(),
    invalid = jest.fn();
  await act(async () => result.current.form.handleSubmit(saved, invalid)());
  expect(saved).not.toHaveBeenCalled();
  expect(invalid).toHaveBeenCalledWith(
    expect.objectContaining({
      maxAttendees: expect.objectContaining({ message: "eventEditor.validation.maxAttendees" }),
    }),
    undefined,
  );
});
describe("status sent on save", () => {
  const editing = (status: string) => ({ ...toDefaultValues(), title: "Cata", status });

  it("does not resend the status of a sold-out event, so editing it no longer fails", () => {
    expect(toEventEditorPayload(editing("SOLD_OUT"), "SOLD_OUT")).not.toHaveProperty("status");
  });

  it("does not resend an unchanged status", () => {
    expect(toEventEditorPayload(editing("PUBLISHED"), "PUBLISHED")).not.toHaveProperty("status");
  });

  it("never asks for SOLD_OUT by hand", () => {
    expect(toEventEditorPayload(editing("SOLD_OUT"), "PUBLISHED")).not.toHaveProperty("status");
  });

  it("sends a status the editor changed", () => {
    expect(toEventEditorPayload(editing("COMPLETED"), "PUBLISHED")).toEqual(
      expect.objectContaining({ status: "COMPLETED" }),
    );
  });

  it("still sends the chosen status of a new event", () => {
    expect(toEventEditorPayload(editing("DRAFT"))).toEqual(expect.objectContaining({ status: "DRAFT" }));
    expect(toEventEditorPayload(editing("PUBLISHED"), null)).toEqual(expect.objectContaining({ status: "PUBLISHED" }));
  });
});

it("offers no cancelled status in the editor: cancelling goes through the cancel sheet", () => {
  expect(EVENT_STATUSES).not.toContain("CANCELLED");
  expect(EVENT_STATUSES).toEqual(["DRAFT", "PUBLISHED", "COMPLETED"]);
});
