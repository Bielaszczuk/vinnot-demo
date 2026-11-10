import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { PhotoAdjuster } from "@/application/services/photoCrop.service";
import { IMAGE_FRAMES } from "@/domain/media/imageAspect";
import { catalogImagesService } from "@/application/services/catalogImages.service";
import { CatalogImagePicker } from "./CatalogImagePicker";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock("@/application/services/catalogImages.service", () => ({
  catalogImagesService: { selectAndUpload: jest.fn() },
}));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }) }));
jest.mock("@/presentation/components/ui/ImageWithFallback", () => {
  const { Text } = jest.requireActual("react-native");
  return { ImageWithFallback: ({ uri }: { uri: string }) => <Text>{`preview:${uri}`}</Text> };
});

const selectAndUpload = catalogImagesService.selectAndUpload as jest.Mock;

beforeEach(() => jest.clearAllMocks());

it("uploads as soon as a photo is picked and shows its preview", async () => {
  let finish: (value: unknown) => void = () => {};
  selectAndUpload.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  const onChange = jest.fn();
  const onBusyChange = jest.fn();
  const view = render(<CatalogImagePicker label="Photo" frame="WINE" value="" onChange={onChange} active onBusyChange={onBusyChange} />);
  await act(async () => fireEvent.press(screen.getByText("media.choose")));
  expect(selectAndUpload).toHaveBeenCalledWith("WINE", expect.any(Function));
  expect(screen.getByText("media.uploading")).toBeTruthy();
  expect(onBusyChange).toHaveBeenLastCalledWith(true);
  await act(async () => finish({ status: "uploaded", imageUrl: "https://cdn/x.jpg" }));
  expect(onChange).toHaveBeenCalledWith("https://cdn/x.jpg");
  expect(onBusyChange).toHaveBeenLastCalledWith(false);
  view.rerender(<CatalogImagePicker label="Photo" frame="WINE" value="https://cdn/x.jpg" onChange={onChange} active />);
  expect(screen.getByText("preview:https://cdn/x.jpg")).toBeTruthy();
  fireEvent.press(screen.getByText("media.remove"));
  expect(onChange).toHaveBeenLastCalledWith("");
});

it("explains a denied permission and a failed upload", async () => {
  selectAndUpload.mockResolvedValueOnce({ status: "permission_denied" });
  render(<CatalogImagePicker label="Photo" frame="WINE" value="" onChange={jest.fn()} active />);
  await act(async () => fireEvent.press(screen.getByText("media.choose")));
  expect(screen.getByText("media.permission")).toBeTruthy();
  selectAndUpload.mockRejectedValueOnce(new Error("network"));
  await act(async () => fireEvent.press(screen.getByText("media.choose")));
  expect(screen.getByText("media.failed")).toBeTruthy();
});

it("ignores an upload that finishes after the form closed", async () => {
  let finish: (value: unknown) => void = () => {};
  selectAndUpload.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  const onChange = jest.fn();
  const view = render(<CatalogImagePicker label="Photo" frame="WINE" value="" onChange={onChange} active />);
  await act(async () => fireEvent.press(screen.getByText("media.choose")));
  view.rerender(<CatalogImagePicker label="Photo" frame="WINE" value="" onChange={onChange} active={false} />);
  await act(async () => finish({ status: "uploaded", imageUrl: "https://cdn/late.jpg" }));
  expect(onChange).not.toHaveBeenCalled();
});

it("frames the photo in its frame before uploading, and uploads nothing on cancel", async () => {
  const photo = { uri: "file:///bottle.jpg", width: 3000, height: 3000 };
  selectAndUpload.mockImplementation(async (frame: "WINE", adjust: PhotoAdjuster) => {
    const rect = await adjust(photo, IMAGE_FRAMES[frame]);
    return rect ? { status: "uploaded", imageUrl: `https://cdn/${rect.originX}-${rect.width}x${rect.height}.jpg` } : { status: "cancelled" };
  });
  const onChange = jest.fn();
  render(<CatalogImagePicker label="Photo" frame="WINE" value="" onChange={onChange} active />);
  await act(async () => fireEvent.press(screen.getByText("media.choose")));
  await screen.findByText("media.crop.title");
  // A 360x400 stage holds a 3:4 frame of 270x360; the square photo keeps its middle 2250x3000.
  fireEvent(screen.getByTestId("image-crop-stage"), "layout", { nativeEvent: { layout: { x: 0, y: 0, width: 360, height: 400 } } });
  expect(screen.queryByText("media.crop.guide")).toBeNull();
  await act(async () => fireEvent.press(screen.getByText("media.crop.confirm")));
  expect(onChange).toHaveBeenCalledWith("https://cdn/375-2250x3000.jpg");

  onChange.mockClear();
  await act(async () => fireEvent.press(screen.getByText("media.choose")));
  await screen.findByText("media.crop.title");
  await act(async () => fireEvent.press(screen.getByText("media.crop.cancel")));
  await waitFor(() => expect(screen.queryByText("media.crop.title")).toBeNull());
  expect(onChange).not.toHaveBeenCalled();
  expect(screen.queryByText("media.uploading")).toBeNull();
});
