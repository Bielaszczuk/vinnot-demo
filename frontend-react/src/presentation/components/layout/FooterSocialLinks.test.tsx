import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FooterSocialLinks } from "./FooterSocialLinks";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { network?: string }) =>
      key === "footer.social.linkLabel" ? `Vinnot en ${options?.network}` : key,
  }),
}));

describe("FooterSocialLinks", () => {
  it("opens each official profile in a new tab with an accessible name", () => {
    render(<FooterSocialLinks />);
    const expected = {
      "Vinnot en Instagram": "https://www.instagram.com/vinnotapp/",
      "Vinnot en Facebook": "https://www.facebook.com/profile.php?id=61595940584834",
      "Vinnot en Threads": "https://www.threads.com/@vinnotapp",
      "Vinnot en TikTok": "https://www.tiktok.com/@vinnotapp",
    };
    for (const [name, url] of Object.entries(expected)) {
      const link = screen.getByRole("link", { name });
      expect(link).toHaveAttribute("href", url);
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
    expect(screen.getByRole("navigation", { name: "footer.social.title" })).toBeInTheDocument();
  });
});
