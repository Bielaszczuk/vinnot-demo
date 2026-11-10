import React from "react";
import { act, render, waitFor } from "@testing-library/react-native";
import { Image } from "expo-image";
import { CoverImage } from "./CoverImage";
import { coverImagesService } from "@/application/services/coverImages.service";
jest.mock("@/application/services/coverImages.service", () => ({ coverImagesService: { preview: jest.fn() } }));
beforeEach(() => jest.clearAllMocks());

it("shows a neutral placeholder, not the fallback illustration, while an uploaded cover loads", async () => {
  let resolve!: (value: string) => void;
  jest.mocked(coverImagesService.preview).mockReturnValueOnce(new Promise(done => { resolve = done; }));
  const view = render(<CoverImage uri="/api/uploads/covers/a.webp" fallbackSource={7} alt="Harvest" style={{ height: 120 }} />);
  expect(view.UNSAFE_queryByType(Image)).toBeNull();
  expect(view.queryByText("Harvest")).toBeNull();
  const placeholder = view.getByLabelText("Harvest");
  expect(placeholder.props.accessibilityState).toEqual({ busy: true });
  expect(placeholder.props.style).toEqual(expect.arrayContaining([{ height: 120 }]));
  await act(async () => resolve("data:image/webp;base64,a"));
  expect(view.UNSAFE_getByType(Image).props.source).toEqual({ uri: "data:image/webp;base64,a" });
});

it("falls back to the illustration when the cover cannot load, and keeps ordinary URLs", async () => {
  jest.mocked(coverImagesService.preview).mockRejectedValueOnce(new Error("offline"));
  const view = render(<CoverImage uri="/api/uploads/covers/a.webp" fallbackSource={7} alt="Harvest" />);
  await waitFor(() => expect(view.UNSAFE_getByType(Image).props.source).toBe(7));
  view.rerender(<CoverImage uri="https://legacy.example/x.jpg" fallbackSource={7} alt="Harvest" />);
  expect(view.UNSAFE_getByType(Image).props.source).toEqual({ uri: "https://legacy.example/x.jpg" });
});
