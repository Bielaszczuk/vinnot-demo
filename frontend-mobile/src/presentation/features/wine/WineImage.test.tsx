import { fireEvent, render } from "@testing-library/react-native";
import { Image } from "expo-image";
import { Image as NativeImage, Platform } from "react-native";
import { WineImage } from "./WineImage";
import darkBottle from "../../../../assets/images/mock/winebottle.webp";
import lightBottle from "../../../../assets/images/mock/winebottle2.webp";

const originalOS = Platform.OS;
afterEach(() => { Platform.OS = originalOS; jest.restoreAllMocks(); });

it.each(["white", "WHITE", "sparkling"])("uses the light bottle for missing %s photos", (wineType) => {
  const view = render(<WineImage wineType={wineType} alt="Wine" />);
  expect(view.UNSAFE_getByType(Image).props.source).toBe(lightBottle);
});

it.each(["red", "white", "sparkling"])("allows Android to decode %s defaults at view size", (wineType) => {
  Platform.OS = "android";
  const resolve = jest.spyOn(NativeImage, "resolveAssetSource").mockReturnValue({
    uri: "android.resource://com.vinnot.app/drawable/winebottle",
    width: 3840, height: 5760, scale: 1,
  });
  const view = render(<WineImage wineType={wineType} alt="Wine" />);
  expect(resolve).toHaveBeenCalledWith(wineType === "red" ? darkBottle : lightBottle);
  const source = view.UNSAFE_getByType(Image).props.source;
  expect(source).toEqual({ uri: "android.resource://com.vinnot.app/drawable/winebottle" });
  // Retain failure identity across renders: a failed default must not retry forever.
  fireEvent(view.UNSAFE_getByType(Image), "error");
  expect(view.queryAllByText("Wine")).toHaveLength(1);
  view.rerender(<WineImage wineType={wineType} alt="Wine" />);
  expect(view.queryAllByText("Wine")).toHaveLength(1);
});

it("keeps genuine Android uploads and recovers after a failed upload", () => {
  Platform.OS = "android";
  jest.spyOn(NativeImage, "resolveAssetSource").mockReturnValue({
    uri: "file:///data/user/0/com.vinnot.app/files/winebottle.webp",
    width: 3840, height: 5760, scale: 1,
  });
  const view = render(<WineImage uri="https://api.vinnot.com/api/uploads/wine-labels/label.jpg" />);
  expect(view.UNSAFE_getByType(Image).props.source).toEqual({ uri: "https://api.vinnot.com/api/uploads/wine-labels/label.jpg" });
  fireEvent(view.UNSAFE_getByType(Image), "error");
  expect(view.UNSAFE_getByType(Image).props.source).toEqual({ uri: "file:///data/user/0/com.vinnot.app/files/winebottle.webp" });
  view.rerender(<WineImage uri="https://api.vinnot.com/api/uploads/wine-labels/new.jpg" />);
  expect(view.UNSAFE_getByType(Image).props.source).toEqual({ uri: "https://api.vinnot.com/api/uploads/wine-labels/new.jpg" });
});
it("uses the original photo, falls back on error and recovers with a new photo", () => {
  const view = render(<WineImage wineType="red" uri="https://api.vinnot.com/api/uploads/wine-labels/label.jpg" />);
  expect(view.UNSAFE_getByType(Image).props.source).toEqual({ uri: "https://api.vinnot.com/api/uploads/wine-labels/label.jpg" });
  fireEvent(view.UNSAFE_getByType(Image), "error");
  expect(view.UNSAFE_getByType(Image).props.source).toBe(darkBottle);
  view.rerender(<WineImage wineType="red" uri="https://api.vinnot.com/api/uploads/wine-labels/new.jpg" />);
  expect(view.UNSAFE_getByType(Image).props.source).toEqual({ uri: "https://api.vinnot.com/api/uploads/wine-labels/new.jpg" });
});
