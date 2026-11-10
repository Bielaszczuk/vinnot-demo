import { describe, expect, it } from "@jest/globals";
import {
  announcementPlainText,
  announcementSummary,
  emailGreeting,
  parseAnnouncementBody,
  type AnnouncementBlock,
} from "./announcementBody";
import { MAX_ANNOUNCEMENT_BODY_LENGTH } from "./announcement";

/** Mirrors backend AnnouncementBodyTest: the app preview must read the body exactly as the email does. */
function blocksOf(source: string): AnnouncementBlock[] {
  const parsed = parseAnnouncementBody(source);
  if (!parsed.ok) throw new Error(`unexpected ${parsed.error}`);
  return parsed.blocks;
}

describe("parseAnnouncementBody", () => {
  it("reads headings, paragraphs, bold, links and buttons", () => {
    const blocks = blocksOf(
      [
        "## Harvest weekend",
        "Join us on **Saturday** at the winery.",
        "Details in [our events](https://vinnot.com/events).",
        "",
        "[[See events]](https://vinnot.com/events)",
        "",
      ].join("\n"),
    );

    expect(blocks).toEqual([
      { type: "heading", text: "Harvest weekend" },
      {
        type: "paragraph",
        spans: [
          { type: "text", text: "Join us on ", bold: false },
          { type: "text", text: "Saturday", bold: true },
          { type: "text", text: " at the winery.\nDetails in ", bold: false },
          { type: "link", text: "our events", url: "https://vinnot.com/events" },
          { type: "text", text: ".", bold: false },
        ],
      },
      { type: "button", label: "See events", url: "https://vinnot.com/events" },
    ]);
    expect(announcementPlainText(blocks)).toBe(
      [
        "Harvest weekend",
        "",
        "Join us on Saturday at the winery.",
        "Details in our events (https://vinnot.com/events).",
        "",
        "See events: https://vinnot.com/events",
      ].join("\n"),
    );
    expect(announcementSummary(blocks)).toBe("Join us on Saturday at the winery. Details in our events.");
  });

  it("never reads markup as HTML and leaves unfinished marks as text", () => {
    expect(blocksOf("<b>hi</b> **open\r\n#not a heading\n\n\n\nnext")).toEqual([
      { type: "paragraph", spans: [{ type: "text", text: "<b>hi</b> **open\n#not a heading", bold: false }] },
      { type: "paragraph", spans: [{ type: "text", text: "next", bold: false }] },
    ]);
  });

  it("keeps balanced parentheses in addresses", () => {
    expect(
      blocksOf(
        "Read about [Malbec](https://en.wikipedia.org/wiki/Malbec_(grape)).\n[[Learn more]](https://vinnot.com/wines_(red))",
      ),
    ).toEqual([
      {
        type: "paragraph",
        spans: [
          { type: "text", text: "Read about ", bold: false },
          { type: "link", text: "Malbec", url: "https://en.wikipedia.org/wiki/Malbec_(grape)" },
          { type: "text", text: ".", bold: false },
        ],
      },
      { type: "button", label: "Learn more", url: "https://vinnot.com/wines_(red)" },
    ]);
  });

  it("strips the spaces around each line and the heading text, and reads a lone carriage return as a break", () => {
    expect(blocksOf("  ##   Spaced  \r  first  \r  second  ")).toEqual([
      { type: "heading", text: "Spaced" },
      { type: "paragraph", spans: [{ type: "text", text: "first\nsecond", bold: false }] },
    ]);
  });

  it("refuses an empty body, a body without visible text and a too long one", () => {
    expect(parseAnnouncementBody("  \n ")).toEqual({ ok: false, error: "ANNOUNCEMENT_BODY_REQUIRED" });
    expect(parseAnnouncementBody(null)).toEqual({ ok: false, error: "ANNOUNCEMENT_BODY_REQUIRED" });
    expect(parseAnnouncementBody("**   **")).toEqual({ ok: false, error: "ANNOUNCEMENT_BODY_REQUIRED" });
    expect(parseAnnouncementBody("x".repeat(MAX_ANNOUNCEMENT_BODY_LENGTH + 1))).toEqual({
      ok: false,
      error: "ANNOUNCEMENT_BODY_TOO_LONG",
    });
    expect(blocksOf("x".repeat(MAX_ANNOUNCEMENT_BODY_LENGTH))).toHaveLength(1);
  });

  it.each([
    "[x](javascript:alert(1))",
    "[x](https://user:pass@vinnot.com)",
    "[[Go]](/events)",
    "[x](mailto:team@vinnot.com)",
    "[x](https://)",
    "[x](HTTPS://vinnot.com)",
    "[x](https://-bad-.com)",
  ])("refuses the unsafe address %s", (source) => {
    expect(parseAnnouncementBody(source)).toEqual({ ok: false, error: "INVALID_ANNOUNCEMENT_LINK" });
  });

  it("accepts plain http, ports, queries and fragments", () => {
    expect(blocksOf("[[Abrir]](http://vinnot.com:8080/a?b=1#c)")).toEqual([
      { type: "button", label: "Abrir", url: "http://vinnot.com:8080/a?b=1#c" },
    ]);
  });
});

describe("emailGreeting", () => {
  it("takes the greeting the backend put before the body of the plain-text email", () => {
    expect(emailGreeting("Hola Cris,\n\nCuerpo\n\n---\nVinnot")).toBe("Hola Cris,");
    expect(emailGreeting("  Hi,  ")).toBe("Hi,");
    expect(emailGreeting("")).toBe("");
  });
});
