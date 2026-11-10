import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { coverImagesService } from "@application/services/coverImages.service";
import { imageCropService } from "@application/services/imageCrop.service";
import { MAX_COVER_UPLOAD_BYTES } from "@domain/media/coverImages.types";
import { CoverImagePicker } from "./CoverImagePicker";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock("@application/services/coverImages.service", () => ({ coverImagesService: { upload: vi.fn(), preview: vi.fn() } }));
vi.mock("@application/services/imageCrop.service", () => ({ imageCropService: { crop: vi.fn() } }));

const original = { create: URL.createObjectURL, revoke: URL.revokeObjectURL };
const picked = new File(["photo"], "vineyard.png", { type: "image/png" });
const cropped = new File(["jpeg"], "vineyard.jpg", { type: "image/jpeg" });

beforeEach(() => {
  vi.clearAllMocks();
  URL.createObjectURL = vi.fn(() => "blob:picked");
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => {
  URL.createObjectURL = original.create;
  URL.revokeObjectURL = original.revoke;
});

function mount(value: string | null = null) {
  const onChange = vi.fn();
  const onBusyChange = vi.fn();
  const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
  render(<form onSubmit={onSubmit}><CoverImagePicker kind="EVENT" value={value} onChange={onChange} onBusyChange={onBusyChange} /></form>);
  return { onChange, onBusyChange, onSubmit };
}

const fileInput = () => screen.getByLabelText("media.choose") as HTMLInputElement;
const dialog = () => screen.queryByRole("dialog", { name: "media.crop.title" });

function loadPhoto() {
  const img = screen.getByRole("group", { name: "media.crop.frameLabel" }).querySelector("img")!;
  Object.defineProperty(img, "naturalWidth", { configurable: true, value: 4000 });
  Object.defineProperty(img, "naturalHeight", { configurable: true, value: 3000 });
  fireEvent.load(img);
}

describe("CoverImagePicker", () => {
  it("removes the photo without submitting the form it sits in", () => {
    const { onChange, onSubmit } = mount("https://images.vinnot.com/cover.jpg");
    fireEvent.click(screen.getByRole("button", { name: "media.remove" }));
    expect(onChange).toHaveBeenCalledWith(null);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("frames a picked photo in the 16:9 cover frame and uploads only the framed result", async () => {
    vi.mocked(imageCropService.crop).mockResolvedValueOnce(cropped);
    vi.mocked(coverImagesService.upload).mockResolvedValueOnce({ id: "c1", imageUrl: "https://images.vinnot.com/c1.webp", width: 1600, height: 900, size: 1 });
    const { onChange, onSubmit } = mount();

    fireEvent.change(fileInput(), { target: { files: [picked] } });
    expect(dialog()).toBeVisible();
    expect(screen.getByText("media.crop.guideBand")).toBeVisible();
    expect(coverImagesService.upload).not.toHaveBeenCalled();

    loadPhoto();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "media.crop.confirm" })); });
    expect(imageCropService.crop).toHaveBeenCalledWith(expect.objectContaining({ file: picked, aspect: 16 / 9 }));
    expect(coverImagesService.upload).toHaveBeenCalledWith(cropped, "EVENT", expect.any(AbortSignal));
    expect(onChange).toHaveBeenCalledWith("https://images.vinnot.com/c1.webp");
    expect(dialog()).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:picked");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("cancel uploads nothing and keeps the previous photo", () => {
    const { onChange } = mount("https://images.vinnot.com/cover.jpg");
    fireEvent.drop(screen.getByText("media.cover").parentElement!, { dataTransfer: { files: [picked] } });
    expect(dialog()).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "media.crop.cancel" }));
    expect(dialog()).toBeNull();
    expect(coverImagesService.upload).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
    expect(document.querySelector("section img")).toHaveAttribute("src", "https://images.vinnot.com/cover.jpg");
  });

  it("still refuses a file over 8 MB or in another format before framing it", () => {
    mount();
    const huge = new File(["x"], "huge.jpg", { type: "image/jpeg" });
    Object.defineProperty(huge, "size", { value: MAX_COVER_UPLOAD_BYTES + 1 });
    fireEvent.change(fileInput(), { target: { files: [huge] } });
    expect(screen.getByRole("alert")).toHaveTextContent("media.invalid");
    fireEvent.change(fileInput(), { target: { files: [new File(["<svg/>"], "a.svg", { type: "image/svg+xml" })] } });
    expect(screen.getByRole("alert")).toHaveTextContent("media.invalid");
    expect(dialog()).toBeNull();
    expect(coverImagesService.upload).not.toHaveBeenCalled();
  });
});
