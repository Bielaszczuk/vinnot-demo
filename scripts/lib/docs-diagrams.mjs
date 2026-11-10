// Pairs every Mermaid block in the docs with a link to its full-size Excalidraw image.
// The image key carries a hash of the Mermaid source (and of the renderer changes that affect it), so a
// changed diagram or a diagram the renderer now draws differently always gets a new image.
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const DIAGRAM_BASE_URL = "https://images.vinnot.com/docs/diagrams/v1";
export const LANGUAGES = ["es", "en"];

// Headings that describe the kind of section rather than the diagram itself.
const PAGE_TITLE_HEADINGS = new Set(["diagrama", "diagram"]);
const SECTION_HEADINGS = new Set([
  "arquitectura", "architecture", "datos", "data",
  "diagrama de casos de uso", "use case diagram",
]);

const LINK_TEXT = {
  es: (name) => `Ver diagrama de «${name}» completo`,
  en: (name) => `View the full “${name}” diagram`,
};

export function normalizeSource(source) {
  return source.replace(/\r\n/g, "\n").split("\n").map((line) => line.trimEnd()).join("\n").trim();
}

// Images are cached as immutable. When tools/docs-diagrams changes how existing diagrams look, add an
// entry naming the diagrams it affects: only their keys change, every other image keeps its address.
const RENDER_CHANGES = [
  { revision: 2, affects: (source) => /\w\[\(/.test(source) }, // database nodes drawn as cylinders
  { revision: 3, affects: (source) => /^\s*gantt\b/.test(source) }, // gantt charts drawn as a project-plan grid
];

export function renderRevision(source) {
  return Math.max(1, ...RENDER_CHANGES.filter((change) => change.affects(source)).map((change) => change.revision));
}

export function sourceHash(source, revision = renderRevision(source)) {
  const normalized = normalizeSource(source);
  return createHash("sha256").update(revision === 1 ? normalized : `r${revision}\n${normalized}`).digest("hex").slice(0, 12);
}

/** docs/es/modules/reviews/README.md -> modules-reviews-readme */
export function slugFor(relativePath) {
  return relativePath
    .replace(/\.md$/, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100)
    .replace(/-+$/, "");
}

function plainHeading(text) {
  return text
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\*+/g, "")
    .replace(/(?<!\w)_+|_+(?!\w)/g, "") // emphasis underscores, never the ones inside snake_case names
    .replace(/\s+\{#[^}]+\}$/, "")
    .trim();
}

function diagramName(heading, pageTitle) {
  if (!heading) return pageTitle ?? "";
  const key = heading.toLowerCase();
  if (PAGE_TITLE_HEADINGS.has(key)) return pageTitle ?? heading;
  if (SECTION_HEADINGS.has(key) && pageTitle && pageTitle.toLowerCase() !== key) return `${pageTitle} · ${heading}`;
  return heading;
}

export function diagramUrl(language, slug, hash) {
  return `${DIAGRAM_BASE_URL}/${language}/${slug}-${hash}.svg`;
}

export function linkLine(language, name, url) {
  return `[${LINK_TEXT[language](name)}](${url})`;
}

/** Finds the Mermaid blocks of one Markdown page (relativePath is relative to docs/<language>). */
export function findDiagrams(markdown, language, relativePath) {
  const lines = markdown.split("\n");
  const slug = slugFor(relativePath);
  const diagrams = [];
  let heading = null;
  let pageTitle = null;
  let fence = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (fence) {
      if (line.trim() === fence.marker) {
        const source = lines.slice(fence.start + 1, i).join("\n");
        const hash = sourceHash(source);
        const name = diagramName(heading, pageTitle);
        const url = diagramUrl(language, slug, hash);
        diagrams.push({
          language, relativePath, slug, hash, name, url, source,
          fenceStart: fence.start, fenceEnd: i,
          key: url.slice("https://images.vinnot.com/".length),
          expectedLink: linkLine(language, name, url),
        });
        fence = null;
      }
      continue;
    }
    const open = line.match(/^(\s*)(`{3,}|~{3,})\s*([\w-]*)/);
    if (open) {
      fence = open[3] === "mermaid" ? { marker: `${open[1]}${open[2]}`.trim(), start: i } : null;
      if (!fence) {
        // Skip non-Mermaid code blocks so their contents never look like headings.
        const marker = open[2];
        const end = lines.findIndex((l, j) => j > i && l.trim() === marker);
        if (end > i) i = end;
      }
      continue;
    }
    const h = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (h) {
      heading = plainHeading(h[2]);
      if (h[1] === "#" && pageTitle === null) pageTitle = heading;
    }
  }
  return diagrams;
}

const LINK_PATTERN = /^\[[^\]]+\]\(https:\/\/images\.vinnot\.com\/docs\/diagrams\/[^)]+\)$/;

/** Returns the index of the link line that follows a diagram, or -1. */
function linkIndexAfter(lines, fenceEnd) {
  let j = fenceEnd + 1;
  while (j < lines.length && lines[j].trim() === "") j++;
  return j < lines.length && LINK_PATTERN.test(lines[j].trim()) ? j : -1;
}

/** Lists diagrams whose link is missing or stale. */
export function checkPage(markdown, language, relativePath) {
  const lines = markdown.split("\n");
  return findDiagrams(markdown, language, relativePath).flatMap((diagram) => {
    const at = linkIndexAfter(lines, diagram.fenceEnd);
    if (at === -1) return [{ ...diagram, problem: "missing link" }];
    if (lines[at].trim() !== diagram.expectedLink) return [{ ...diagram, problem: "stale link" }];
    if (lines[at + 1]?.trim()) return [{ ...diagram, problem: "link not followed by a blank line" }];
    return [];
  });
}

/** Inserts or refreshes the link below every Mermaid block, always as a paragraph of its own. */
export function writeLinks(markdown, language, relativePath) {
  const lines = markdown.split("\n");
  const diagrams = findDiagrams(markdown, language, relativePath);
  // Bottom-up so earlier indexes stay valid.
  for (const diagram of [...diagrams].reverse()) {
    const at = linkIndexAfter(lines, diagram.fenceEnd);
    if (at !== -1) {
      lines[at] = diagram.expectedLink;
      if (lines[at + 1]?.trim()) lines.splice(at + 1, 0, "");
    } else {
      const textFollows = Boolean(lines[diagram.fenceEnd + 1]?.trim());
      lines.splice(diagram.fenceEnd + 1, 0, "", diagram.expectedLink, ...(textFollows ? [""] : []));
    }
  }
  return lines.join("\n");
}

export function markdownPages(docsRoot, language) {
  const base = path.join(docsRoot, language);
  const pages = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".md")) pages.push({ full, relativePath: path.relative(base, full).split(path.sep).join("/") });
    }
  };
  walk(base);
  return pages;
}

export function allDiagrams(docsRoot) {
  return LANGUAGES.flatMap((language) => markdownPages(docsRoot, language).flatMap(({ full, relativePath }) =>
    findDiagrams(fs.readFileSync(full, "utf8"), language, relativePath)));
}
