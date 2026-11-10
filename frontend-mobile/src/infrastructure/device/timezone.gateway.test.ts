import * as Localization from "expo-localization";
import { timezoneGateway } from "./timezone.gateway";

jest.mock("expo-localization", () => ({ getCalendars: jest.fn() }));

const calendars = (timeZone: string | null) =>
  [{ timeZone }] as unknown as ReturnType<typeof Localization.getCalendars>;

afterEach(() => jest.restoreAllMocks());

it("reads the device IANA time zone", () => {
  jest.mocked(Localization.getCalendars).mockReturnValue(calendars("Europe/Madrid"));

  expect(timezoneGateway.current()).toBe("Europe/Madrid");
});

it("falls back to the JavaScript runtime zone when the device reports none", () => {
  jest.mocked(Localization.getCalendars).mockReturnValue(calendars(null));
  jest.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
    timeZone: "America/Mexico_City",
  } as Intl.ResolvedDateTimeFormatOptions);

  expect(timezoneGateway.current()).toBe("America/Mexico_City");
});

it("returns undefined when no zone can be read", () => {
  jest.mocked(Localization.getCalendars).mockImplementation(() => {
    throw new Error("native module unavailable");
  });

  expect(timezoneGateway.current()).toBeUndefined();
});
