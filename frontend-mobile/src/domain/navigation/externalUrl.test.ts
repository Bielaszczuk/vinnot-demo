import { describe, expect, it } from "@jest/globals";
import { isSafeExternalUrl } from "./externalUrl";

describe("external URL allow-list", () => {
  it.each([
    "https://bodega.example.com",
    "http://bodega.example.com/visitas?x=1",
    "HTTPS://Bodega.example.com",
    "https://wa.me/5491123456789?text=Hola",
    "https://api.whatsapp.com/send?phone=5491123456789",
    "mailto:contacto@bodega.example.com",
    "tel:+5491123456789",
  ])("allows %s", (url) => {
    expect(isSafeExternalUrl(url)).toBe(true);
  });

  it.each([
    null,
    undefined,
    42,
    "",
    "   ",
    "javascript:alert(1)",
    "JavaScript:alert(1)",
    " javascript:alert(1)",
    "java\nscript:alert(1)",
    "file:///etc/passwd",
    "intent://scan/#Intent;scheme=zxing;end",
    "whatsapp://send?phone=123",
    "vinnot://events/1",
    "data:text/html,<script>alert(1)</script>",
    "https:evil.example.com",
    "https://",
    "//evil.example.com",
    "bodega.example.com",
    "https://bodega.example.com/\u0000",
    "mailto:",
    "tel:",
    `https://${"a".repeat(5000)}.com`,
  ])("rejects %s", (url) => {
    expect(isSafeExternalUrl(url)).toBe(false);
  });
});
