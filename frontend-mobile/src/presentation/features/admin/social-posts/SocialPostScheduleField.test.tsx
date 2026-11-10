import { Platform } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { SocialPostScheduleField, type SocialPostScheduleFieldProps } from "./SocialPostScheduleField";

jest.mock("@react-native-community/datetimepicker", () => {
  const { View } = jest.requireActual("react-native");
  return {
    __esModule: true,
    default: (props: { mode: string }) => <View testID={`picker-${props.mode}`} {...props} />,
  };
});

function renderField(os: "ios" | "android") {
  jest.replaceProperty(Platform, "OS", os);
  const props: SocialPostScheduleFieldProps = {
    value: { date: "2026-11-10", time: "12:30" },
    locale: "es-AR",
    dateLabel: "date-label",
    timeLabel: "time-label",
    formatDay: (isoDate) => `day(${isoDate})`,
    onDateChange: jest.fn(),
    onTimeChange: jest.fn(),
  };
  render(<SocialPostScheduleField {...props} />);
  return props;
}

afterEach(() => {
  jest.restoreAllMocks();
});

it("shows both inline pickers on iOS at the instant of the Argentina date and time, in the Argentina zone", () => {
  const props = renderField("ios");

  const date = screen.getByTestId("picker-date");
  expect(date.props.value.toISOString()).toBe("2026-11-10T15:30:00.000Z");
  expect(date.props.timeZoneName).toBe("America/Argentina/Buenos_Aires");
  expect(date.props.accessibilityLabel).toBe("date-label");
  expect(screen.getByTestId("picker-time").props.accessibilityLabel).toBe("time-label");

  fireEvent(date, "change", { type: "set" }, new Date("2026-11-12T02:00:00Z"));
  expect(props.onDateChange).toHaveBeenCalledWith("2026-11-11");
  fireEvent(screen.getByTestId("picker-time"), "change", { type: "set" }, new Date("2026-11-10T22:30:00Z"));
  expect(props.onTimeChange).toHaveBeenCalledWith("19:30");
});

it("opens the system dialog from labelled buttons on Android and ignores a dismissed dialog", () => {
  const props = renderField("android");

  expect(screen.queryByTestId("picker-date")).toBeNull();
  expect(screen.getByText("day(2026-11-10)")).toBeTruthy();
  expect(screen.getByText("12:30")).toBeTruthy();

  fireEvent.press(screen.getByRole("button", { name: "date-label" }));
  fireEvent(screen.getByTestId("picker-date"), "change", { type: "dismissed" }, undefined);
  expect(props.onDateChange).not.toHaveBeenCalled();
  expect(screen.queryByTestId("picker-date")).toBeNull();

  fireEvent.press(screen.getByRole("button", { name: "time-label" }));
  const time = screen.getByTestId("picker-time");
  expect(time.props.timeZoneName).toBe("America/Argentina/Buenos_Aires");
  fireEvent(time, "change", { type: "set" }, new Date("2026-11-10T23:45:00Z"));
  expect(props.onTimeChange).toHaveBeenCalledWith("20:45");
  expect(screen.queryByTestId("picker-time")).toBeNull();
});
