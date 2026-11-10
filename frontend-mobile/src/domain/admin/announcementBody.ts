/**
 * The body format of an administrator's announcement (#310), read the way the backend reads it
 * (`notification/domain/model/AnnouncementBody.java`), so the app can draw the email without a web view (#490):
 *
 * - a line starting with `## ` is a heading;
 * - a line that is only `[[Label]](https://…)` is a button;
 * - other lines form paragraphs, separated by a blank line; a single line break stays a line break;
 * - inside a paragraph, `**text**` is bold and `[text](https://…)` is a link.
 *
 * Links and buttons must be absolute HTTP(S) addresses without credentials. Nothing here is ever HTML.
 */
import { MAX_ANNOUNCEMENT_BODY_LENGTH } from "./announcement";

export type AnnouncementSpan = { type: "text"; text: string; bold: boolean } | { type: "link"; text: string; url: string };

export type AnnouncementBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; spans: AnnouncementSpan[] }
  | { type: "button"; label: string; url: string };

export type AnnouncementBodyError = "ANNOUNCEMENT_BODY_REQUIRED" | "ANNOUNCEMENT_BODY_TOO_LONG" | "INVALID_ANNOUNCEMENT_LINK";

export type AnnouncementBodyParse = { ok: true; blocks: AnnouncementBlock[] } | { ok: false; error: AnnouncementBodyError };

const HEADING = "## ";
/** Java's `Character.isWhitespace`, which `String.strip()` and `isBlank()` use: no non-breaking spaces. */
const WHITESPACE = "\\t\\n\\u000B\\f\\r\\u001C-\\u001F \\u1680\\u2000-\\u2006\\u2008-\\u200A\\u2028\\u2029\\u205F\\u3000";
const EDGES = new RegExp(`^[${WHITESPACE}]+|[${WHITESPACE}]+$`, "g");
const VISIBLE = new RegExp(`[^${WHITESPACE}]`);
/** An address, allowing one level of balanced parentheses as in `…/Malbec_(grape)`; Java's ASCII `\s`. */
const URL = "((?:[^ \\t\\n\\u000B\\f\\r()]|\\([^ \\t\\n\\u000B\\f\\r()]*\\))+)";
const BUTTON = new RegExp(`^\\[\\[([^\\]\\n]{1,60})\\]\\]\\(${URL}\\)$`);
const INLINE = new RegExp(`\\*\\*(.+?)\\*\\*|\\[([^\\]\\n]+)\\]\\(${URL}\\)`, "g");

/** What `java.net.URI` accepts as an http(s) address with a server host and no user information. */
const WEB_URL = /^https?:\/\/([^/?#]*)(.*)$/;
const LABEL = "[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?";
const TOP_LABEL = "[A-Za-z](?:[A-Za-z0-9-]*[A-Za-z0-9])?";
const HOST = new RegExp(
  `^(?:(?:${LABEL}\\.)*${TOP_LABEL}\\.?|\\d{1,3}(?:\\.\\d{1,3}){3}|\\[[0-9A-Fa-f:.]+\\])(?::\\d*)?$`,
);
const URI_CHAR = '(?:[^\\s"<>\\\\^`{|}%#\\[\\]]|%[0-9A-Fa-f]{2})';
const REST = new RegExp(`^${URI_CHAR}*(?:#${URI_CHAR}*)?$`);

class InvalidLink extends Error {}

function strip(value: string): string {
  return value.replace(EDGES, "");
}

function webUrl(value: string): string {
  const match = WEB_URL.exec(value);
  if (match && HOST.test(match[1] ?? "") && REST.test(match[2] ?? "")) return value;
  throw new InvalidLink(value);
}

function spans(text: string): AnnouncementSpan[] {
  const result: AnnouncementSpan[] = [];
  let start = 0;
  for (const match of text.matchAll(INLINE)) {
    const index = match.index ?? 0;
    if (index > start) result.push({ type: "text", text: text.slice(start, index), bold: false });
    if (match[1] !== undefined) result.push({ type: "text", text: match[1], bold: true });
    else result.push({ type: "link", text: match[2] ?? "", url: webUrl(match[3] ?? "") });
    start = index + match[0].length;
  }
  if (start < text.length) result.push({ type: "text", text: text.slice(start), bold: false });
  return result;
}

function blocksOf(text: string): AnnouncementBlock[] {
  const blocks: AnnouncementBlock[] = [];
  let paragraph: string[] = [];
  const closeParagraph = () => {
    if (paragraph.length > 0) blocks.push({ type: "paragraph", spans: spans(paragraph.join("\n")) });
    paragraph = [];
  };
  for (const raw of text.split("\n")) {
    const line = strip(raw);
    const button = BUTTON.exec(line);
    if (!line || line.startsWith(HEADING) || button) closeParagraph();
    if (line.startsWith(HEADING)) blocks.push({ type: "heading", text: strip(line.slice(HEADING.length)) });
    else if (button) blocks.push({ type: "button", label: strip(button[1] ?? ""), url: webUrl(button[2] ?? "") });
    else if (line) paragraph.push(line);
  }
  closeParagraph();
  return blocks;
}

/** Parses the author's text; an empty, too long or badly linked text is refused with the backend's code. */
export function parseAnnouncementBody(source: string | null | undefined): AnnouncementBodyParse {
  const text = strip((source ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n"));
  if (!text) return { ok: false, error: "ANNOUNCEMENT_BODY_REQUIRED" };
  if (text.length > MAX_ANNOUNCEMENT_BODY_LENGTH) return { ok: false, error: "ANNOUNCEMENT_BODY_TOO_LONG" };
  let blocks: AnnouncementBlock[];
  try {
    blocks = blocksOf(text);
  } catch (error) {
    if (error instanceof InvalidLink) return { ok: false, error: "INVALID_ANNOUNCEMENT_LINK" };
    throw error;
  }
  if (!VISIBLE.test(announcementPlainText(blocks))) return { ok: false, error: "ANNOUNCEMENT_BODY_REQUIRED" };
  return { ok: true, blocks };
}

/** The content as plain text: links as "text (address)", buttons as "label: address", like the email's text part. */
export function announcementPlainText(blocks: AnnouncementBlock[]): string {
  return blocks
    .map((block) => {
      if (block.type === "heading") return block.text;
      if (block.type === "button") return `${block.label}: ${block.url}`;
      return block.spans.map((span) => (span.type === "link" ? `${span.text} (${span.url})` : span.text)).join("");
    })
    .join("\n\n");
}

/** The paragraphs' words without addresses, as the push body and the email preheader use them. */
export function announcementSummary(blocks: AnnouncementBlock[]): string {
  return blocks
    .flatMap((block) => (block.type === "paragraph" ? [block.spans.map((span) => span.text).join("").replace(/\n/g, " ")] : []))
    .join(" ");
}

/** The greeting the backend writes before the body of the plain-text email ("Hola Cris,"). */
export function emailGreeting(text: string): string {
  return (text.split("\n\n")[0] ?? "").trim();
}
