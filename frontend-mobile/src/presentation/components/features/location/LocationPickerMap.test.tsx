import { fireEvent, render, screen } from "@testing-library/react-native";
import { LocationPickerMap } from "./LocationPickerMap";
const mockAnimate = jest.fn();
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock("react-native-maps", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  return {
    __esModule: true,
    default: React.forwardRef((props: Record<string, unknown>, ref) => {
      React.useImperativeHandle(ref, () => ({ animateToRegion: mockAnimate }));
      return React.createElement("View", { ...props, testID: "map" });
    }),
    Marker: (props: Record<string, unknown>) =>
      React.createElement("View", { ...props, testID: "marker" }),
  };
});
it("does not select the overview, accepts a manual zero point, drag, and recenters on external search", () => {
  const select = jest.fn();
  const { rerender } = render(
    <LocationPickerMap latitude={null} longitude={null} onChange={select} />,
  );
  expect(screen.queryByTestId("marker")).toBeNull();
  expect(select).not.toHaveBeenCalled();
  fireEvent(screen.getByTestId("map"), "press", {
    nativeEvent: { coordinate: { latitude: 0, longitude: 0 } },
  });
  expect(select).toHaveBeenCalledWith(0, 0);
  rerender(<LocationPickerMap latitude={0} longitude={0} onChange={select} />);
  expect(screen.getByTestId("marker").props.coordinate).toEqual({ latitude: 0, longitude: 0 });
  fireEvent(screen.getByTestId("marker"), "dragEnd", {
    nativeEvent: { coordinate: { latitude: -32, longitude: -68 } },
  });
  expect(select).toHaveBeenLastCalledWith(-32, -68);
  rerender(<LocationPickerMap latitude={-31} longitude={-67} onChange={select} />);
  expect(mockAnimate).toHaveBeenLastCalledWith(
    expect.objectContaining({ latitude: -31, longitude: -67 }),
    250,
  );
});
