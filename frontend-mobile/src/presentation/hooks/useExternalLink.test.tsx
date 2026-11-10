import React from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { Linking } from "react-native";
import { act, fireEvent, render, renderHook, screen } from "@testing-library/react-native";
import { useExternalLink } from "./useExternalLink";
import { WineryHero } from "@/presentation/features/winery/WineryHero";
import type { Winery } from "@/domain/winery/winery.types";

const mockShowError = jest.fn();
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock("@/presentation/providers/ToastProvider", () => ({
  useToast: () => ({ showError: mockShowError }),
}));

const openURL = jest.spyOn(Linking, "openURL");

beforeEach(() => {
  jest.clearAllMocks();
  openURL.mockResolvedValue(undefined);
});

describe("useExternalLink", () => {
  it.each([
    "https://bodega.example.com",
    "https://wa.me/5491123456789",
    "mailto:hola@bodega.example.com",
    "tel:+5491123456789",
  ])("opens the allowed link %s", async (url) => {
    const { result } = renderHook(() => useExternalLink());
    await act(async () => {
      await expect(result.current(url)).resolves.toBe(true);
    });
    expect(openURL).toHaveBeenCalledWith(url);
    expect(mockShowError).not.toHaveBeenCalled();
  });

  it.each(["javascript:alert(1)", "file:///etc/passwd", "intent://x#Intent;end", "vinnot://x", null])(
    "refuses %s and tells the user",
    async (url) => {
      const { result } = renderHook(() => useExternalLink());
      await act(async () => {
        await expect(result.current(url)).resolves.toBe(false);
      });
      expect(openURL).not.toHaveBeenCalled();
      expect(mockShowError).toHaveBeenCalledWith("common.linkOpenError");
    },
  );

  it("shows an error when the system cannot open the link", async () => {
    openURL.mockRejectedValueOnce(new Error("no handler"));
    const { result } = renderHook(() => useExternalLink());
    await act(async () => {
      await expect(result.current("https://bodega.example.com")).resolves.toBe(false);
    });
    expect(mockShowError).toHaveBeenCalledWith("common.linkOpenError");
  });
});

describe("WineryHero website", () => {
  const winery = (website: string) =>
    ({ id: "w1", name: "Bodega", website, region: "Mendoza", country: "Argentina" }) as unknown as Winery;

  it("opens a safe website", async () => {
    render(<WineryHero winery={winery("https://bodega.example.com")} />);
    await act(async () => {
      fireEvent.press(screen.getByText("wineries.visitWebsite"));
    });
    expect(openURL).toHaveBeenCalledWith("https://bodega.example.com");
  });

  it("does not open an unsafe website and shows an error", async () => {
    render(<WineryHero winery={winery("javascript:alert(1)")} />);
    await act(async () => {
      fireEvent.press(screen.getByText("wineries.visitWebsite"));
    });
    expect(openURL).not.toHaveBeenCalled();
    expect(mockShowError).toHaveBeenCalledWith("common.linkOpenError");
  });
});
