import { describe, expect, it } from "@jest/globals";
import { applyAnnouncementFormat } from "./announcementFormat";

describe("announcement toolbar", () => {
  it("turns the current line into a heading and selects its text", () => {
    const edit = applyAnnouncementFormat("intro\nHarvest\nend", 8, 8, "heading", "Heading");
    expect(edit.text).toBe("intro\n## Harvest\nend");
    expect(edit.text.slice(edit.selectionStart, edit.selectionEnd)).toBe("Harvest");
  });

  it("does not stack heading marks and labels an empty line", () => {
    expect(applyAnnouncementFormat("## Title", 3, 3, "heading", "Heading").text).toBe("## Title");
    expect(applyAnnouncementFormat("", 0, 0, "heading", "Heading").text).toBe("## Heading");
  });

  it("wraps the selection in bold, or a fallback label when nothing is selected", () => {
    const edit = applyAnnouncementFormat("a wine b", 2, 6, "bold", "text");
    expect(edit.text).toBe("a **wine** b");
    expect(edit.text.slice(edit.selectionStart, edit.selectionEnd)).toBe("wine");
    expect(applyAnnouncementFormat("", 0, 0, "bold", "text").text).toBe("**text**");
  });

  it("writes a link and selects its https:// placeholder", () => {
    const edit = applyAnnouncementFormat("see more", 4, 8, "link", "link text");
    expect(edit.text).toBe("see [more](https://)");
    expect(edit.text.slice(edit.selectionStart, edit.selectionEnd)).toBe("https://");
  });

  it("puts a button on its own line and selects its https:// placeholder", () => {
    const edit = applyAnnouncementFormat("beforeafter", 6, 6, "button", "Learn more");
    expect(edit.text).toBe("before\n[[Learn more]](https://)\nafter");
    expect(edit.text.slice(edit.selectionStart, edit.selectionEnd)).toBe("https://");
    expect(applyAnnouncementFormat("x\n", 2, 2, "button", "Go").text).toBe("x\n[[Go]](https://)");
  });
});
