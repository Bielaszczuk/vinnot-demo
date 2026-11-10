/**
 * Toolbar actions of the announcement editor (#310, mobile #327): each one wraps the selection in the body's text
 * format (`## heading`, `**bold**`, `[text](https://…)` and a `[[Label]](https://…)` button line), never in HTML.
 */

export type AnnouncementFormat = "heading" | "bold" | "link" | "button";

export const ANNOUNCEMENT_FORMATS: readonly AnnouncementFormat[] = ["heading", "bold", "link", "button"];

export interface TextEdit {
  text: string;
  /** Selection to restore after the edit, so the author can keep typing. */
  selectionStart: number;
  selectionEnd: number;
}

const PLACEHOLDER_URL = "https://";

function lineStart(text: string, index: number): number {
  return text.lastIndexOf("\n", index - 1) + 1;
}

function lineEnd(text: string, index: number): number {
  const end = text.indexOf("\n", index);
  return end === -1 ? text.length : end;
}

/** Applies a toolbar action to the selection `[start, end)` of `text`; `fallback` labels an empty selection. */
export function applyAnnouncementFormat(
  text: string,
  start: number,
  end: number,
  format: AnnouncementFormat,
  fallback: string,
): TextEdit {
  const selected = text.slice(start, end);
  const label = selected.trim() || fallback;
  if (format === "heading") {
    const from = lineStart(text, start);
    const to = lineEnd(text, end);
    const line = text.slice(from, to).replace(/^##\s*/, "").trim() || fallback;
    const replacement = `## ${line}`;
    return {
      text: text.slice(0, from) + replacement + text.slice(to),
      selectionStart: from + 3,
      selectionEnd: from + replacement.length,
    };
  }
  if (format === "bold") {
    const replacement = `**${label}**`;
    return {
      text: text.slice(0, start) + replacement + text.slice(end),
      selectionStart: start + 2,
      selectionEnd: start + 2 + label.length,
    };
  }
  if (format === "link") {
    const replacement = `[${label}](${PLACEHOLDER_URL})`;
    const urlStart = start + label.length + 3;
    return {
      text: text.slice(0, start) + replacement + text.slice(end),
      selectionStart: urlStart,
      selectionEnd: urlStart + PLACEHOLDER_URL.length,
    };
  }
  const before = start > 0 && text[start - 1] !== "\n" ? "\n" : "";
  const after = end < text.length && text[end] !== "\n" ? "\n" : "";
  const replacement = `${before}[[${label}]](${PLACEHOLDER_URL})${after}`;
  const urlStart = start + before.length + label.length + 5;
  return {
    text: text.slice(0, start) + replacement + text.slice(end),
    selectionStart: urlStart,
    selectionEnd: urlStart + PLACEHOLDER_URL.length,
  };
}
