// Runs inside headless Chromium: Mermaid source -> Excalidraw scene -> SVG, in the documentation style.
import { parseMermaidToExcalidraw } from "@excalidraw/mermaid-to-excalidraw";
import { convertToExcalidrawElements, exportToSvg, Excalidraw, FONT_FAMILY } from "@excalidraw/excalidraw";
import mermaid from "mermaid";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { CRITICAL_COLOR, DAY, ganttBarStyle, ganttLegendKinds, ganttWeekWidth, parseGantt, tint } from "./gantt-model.js";

// Since Mermaid 11.13 every element id in the SVG starts with the render id ("<render-id>-entity-USERS-0"), but the
// converter looks elements up by the bare id it reads from the diagram model. Dropping that prefix (ids and the
// url(#…) references to them alike) gives the converter the ids it expects; markers ("<render-id>_…") and the
// root id are untouched.
const renderMermaid = mermaid.render.bind(mermaid);
mermaid.render = async (id, text, container) => {
  const result = await renderMermaid(id, text, container);
  return { ...result, svg: result.svg.replaceAll(`${id}-`, "") };
};

// Vinnot documentation palette (docs-site/src/css/custom.css).
const WINE = { 50: "#fdf2f4", 100: "#fce7eb", 200: "#f9d0d9", 600: "#cb2d5d", 700: "#ab214c" };
const INK = "#30262c";
const CREAM = "#fcf8f6";
const FONT = { name: "Excalifont", family: FONT_FAMILY.Excalifont };
const MERMAID_CONFIG = {
  themeVariables: { fontSize: "20px", fontFamily: FONT.name },
  sequence: { messageMargin: 48, boxMargin: 12, noteMargin: 14, actorMargin: 70 },
  gantt: { useWidth: 1600, leftPadding: 150, rightPadding: 60, topPadding: 70, barHeight: 30, barGap: 10, fontSize: 18, sectionFontSize: 20 },
};

// Excalidraw 0.18 draws crow's feet but has no optional variant; a small ring marks "zero or".
const CARDINALITY = {
  cardinality_one: { head: "crowfoot_one" },
  cardinality_exactly_one: { head: "crowfoot_one" },
  cardinality_many: { head: "crowfoot_many" },
  cardinality_one_or_many: { head: "crowfoot_one_or_many" },
  cardinality_zero_or_one: { head: "crowfoot_one", optional: true },
  cardinality_zero_or_many: { head: "crowfoot_many", optional: true },
};

function style(el) {
  const s = { ...el, roughness: 1, strokeWidth: 2 };
  if (s.type === "text") return { ...s, fontFamily: FONT.family, strokeColor: INK };
  if (s.label) s.label = { ...s.label, fontFamily: FONT.family, strokeColor: INK };
  if (s.type === "arrow" || s.type === "line") {
    return { ...s, strokeColor: WINE[600], strokeWidth: s.type === "line" ? 1 : 2 };
  }
  const filled = s.backgroundColor && s.backgroundColor !== "transparent";
  return { ...s, strokeColor: WINE[700], backgroundColor: filled ? WINE[100] : WINE[50], fillStyle: "solid" };
}

const diagramType = (source) => source.trimStart().split(/\s/)[0];
const GRAPHS = new Set(["flowchart", "graph", "stateDiagram", "stateDiagram-v2"]);

/** Ring drawn just before an arrow end to mark an optional relationship. */
function optionalRing(arrow, atStart) {
  const pts = arrow.points ?? [[0, 0], [arrow.width ?? 0, arrow.height ?? 0]];
  const [end, prev] = atStart ? [pts[0], pts[1]] : [pts.at(-1), pts.at(-2)];
  const dx = end[0] - prev[0];
  const dy = end[1] - prev[1];
  const len = Math.hypot(dx, dy) || 1;
  const cx = arrow.x + end[0] - (dx / len) * 30;
  const cy = arrow.y + end[1] - (dy / len) * 30;
  return { type: "ellipse", x: cx - 6, y: cy - 6, width: 12, height: 12, strokeColor: WINE[600], backgroundColor: CREAM, fillStyle: "solid", strokeWidth: 2, roughness: 1 };
}

const measure = document.createElement("canvas").getContext("2d");
function textWidth(text, fontSize) {
  measure.font = `${fontSize}px ${FONT.name}`;
  return measure.measureText(text).width;
}

/** Greedy word wrap that never breaks inside a word. */
function wrap(text, maxWidth, fontSize) {
  return text.split("\n").flatMap((paragraph) => {
    const lines = [];
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = lines.length ? `${lines.at(-1)} ${word}` : word;
      if (lines.length && textWidth(candidate, fontSize) <= maxWidth) lines[lines.length - 1] = candidate;
      else lines.push(word);
    }
    return lines;
  }).join("\n");
}

const lineHeight = (fontSize) => fontSize * 1.25;

/** Text centred on a point; the exact position is applied once Excalidraw has measured it. */
function centredText(text, centerX, centerY, fontSize) {
  return style({ type: "text", x: centerX, y: centerY, text, fontSize, textAlign: "center", customData: { centerX, centerY } });
}

// Excalidraw wraps a label to its container and splits words that do not fit. Diamonds only lend half
// their width to labels, so their text is centred freely instead; other shapes shrink the font.
function containerWithLabel(el) {
  if (!el.label?.text || !el.width || !["rectangle", "diamond", "ellipse"].includes(el.type)) return [style(el)];
  const fontSize = el.label.fontSize ?? 20;
  const widest = Math.max(...el.label.text.split(/\s+/).map((word) => textWidth(word, fontSize)));
  if (el.type === "diamond" && widest > el.width / 2 - 14) {
    const { label, ...shape } = el;
    const size = widest > el.width * 0.72 ? Math.max(12, Math.floor((fontSize * el.width * 0.72) / widest)) : fontSize;
    const text = wrap(label.text, Math.max(widest, el.width * 0.55), size);
    return [style(shape), centredText(text, el.x + el.width / 2, el.y + el.height / 2, size)];
  }
  const room = el.width - (el.type === "ellipse" ? el.width * 0.3 : 0) - 14;
  if (widest <= room) return [style(el)];
  return [style({ ...el, label: { ...el.label, fontSize: Math.max(12, Math.floor((fontSize * room) / widest)) } })];
}

// The converter keeps Mermaid's edge routes but not where Mermaid placed their labels, so Excalidraw
// would stack them on the arrow midpoints. Read those positions from Mermaid's own render instead.
const normalizeLabel = (text) => text.replace(/\s+/g, "").toLowerCase();
let renders = 0;
/** Renders Mermaid's own SVG into the page so its layout can be measured; call the returned cleanup after. */
async function mermaidLayout(source) {
  const host = document.getElementById("mermaid");
  mermaid.initialize({ startOnLoad: false, ...MERMAID_CONFIG });
  host.innerHTML = (await mermaid.render(`layout-${++renders}`, source)).svg;
  return { root: host.querySelector("svg"), done: () => { host.innerHTML = ""; } };
}

/** Sum of the translate() transforms from an element up to the SVG root. */
function offsetIn(root, element) {
  let x = 0;
  let y = 0;
  for (let node = element; node && node !== root; node = node.parentElement) {
    const move = node.getAttribute("transform")?.match(/translate\(\s*([-\d.e]+)[\s,]*([-\d.e]+)?/);
    if (move) { x += Number(move[1]); y += Number(move[2] ?? 0); }
  }
  return { x, y };
}

/** Every vertex of an SVG path made of M, L and C commands (curve end points included). */
function pathVertices(d) {
  const points = [];
  for (const [, command, args] of d.matchAll(/([MLC])([^MLCZ]*)/gi)) {
    const numbers = args.trim().split(/[\s,]+/).filter(Boolean).map(Number);
    const take = command.toUpperCase() === "C" ? numbers.slice(-2) : numbers.slice(0, 2);
    if (take.length === 2) points.push(take);
  }
  return points;
}

// Mermaid edges are curves (M, L, C...) and the converter keeps only their first and last straight
// segments, so long edges turn into straight lines through other shapes. Keep Mermaid's whole route.
function mermaidRoutes(root) {
  const routes = [];
  for (const path of root.querySelectorAll("g.edgePaths path, path.relationshipLine")) {
    const at = offsetIn(root, path);
    const points = pathVertices(path.getAttribute("d") ?? "").map(([x, y]) => [x + at.x, y + at.y]);
    if (points.length < 2) continue;
    // A self-transition is drawn as three consecutive paths: join them.
    const previous = routes.at(-1);
    if (/-cyclic-special-(mid|2)$/.test(path.id) && previous) previous.points.push(...points);
    else routes.push({ points, selfLoop: /-cyclic-special-1$/.test(path.id) });
  }
  return routes.map((route) => ({ ...route, points: simplify(route.points) }));
}

// Mermaid ends each edge with a few-pixel segment and Excalidraw scales the arrowhead to the last
// segment, so drop vertices that sit too close to the previous one.
function simplify(points) {
  const kept = [points[0]];
  for (const point of points.slice(1)) {
    if (Math.hypot(point[0] - kept.at(-1)[0], point[1] - kept.at(-1)[1]) >= 16) kept.push(point);
  }
  const last = points.at(-1);
  if (kept.length > 1 && Math.hypot(last[0] - kept.at(-1)[0], last[1] - kept.at(-1)[1]) < 16) kept.pop();
  if (kept.length > 1 || kept[0] !== last) kept.push(last);
  return kept;
}

/** Distance from a point to a polyline. */
function distanceToRoute([x, y], points) {
  let best = Infinity;
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = points[i - 1];
    const [bx, by] = points[i];
    const length = (bx - ax) ** 2 + (by - ay) ** 2 || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / length));
    best = Math.min(best, Math.hypot(x - (ax + t * (bx - ax)), y - (ay + t * (by - ay))));
  }
  return best;
}

/** Of the labels with this text, the one Mermaid placed closest to the arrow. */
function takeLabel(labels, text, arrow) {
  const points = arrow.points.map(([px, py]) => [arrow.x + px, arrow.y + py]);
  const candidates = labels.filter((label) => label.key === normalizeLabel(text));
  if (!candidates.length) return null;
  const spot = candidates.reduce((a, b) => (distanceToRoute([a.x, a.y], points) <= distanceToRoute([b.x, b.y], points) ? a : b));
  labels.splice(labels.indexOf(spot), 1);
  return spot;
}

function routeArrow(points, extra = {}) {
  const [x, y] = points[0];
  const relative = points.map(([px, py]) => [px - x, py - y]);
  const xs = relative.map(([px]) => px);
  const ys = relative.map(([, py]) => py);
  return { ...extra, x, y, points: relative, width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
}

/** Replaces a converter arrow's points with the Mermaid route that starts and ends where it does. */
function followRoute(el, routes) {
  if (!routes.length || !el.points?.length) return el;
  const start = [el.x + el.points[0][0], el.y + el.points[0][1]];
  const end = [el.x + el.points.at(-1)[0], el.y + el.points.at(-1)[1]];
  const gap = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  let best = null;
  for (const route of routes) {
    const score = gap(start, route.points[0]) + gap(end, route.points.at(-1));
    if (!best || score < best.score) best = { route, score };
  }
  if (best.score > 24) return el;
  routes.splice(routes.indexOf(best.route), 1);
  return routeArrow(best.route.points, el);
}

async function mermaidGraph(source) {
  const { root, done } = await mermaidLayout(source);
  const routes = mermaidRoutes(root);
  const labels = [...root.querySelectorAll("g.edgeLabel")].flatMap((group) => {
    // innerText keeps the line breaks the author wrote; the converter's own wrapping can split words.
    const text = (group.querySelector("foreignObject div, foreignObject span")?.innerText ?? group.textContent).trim();
    if (!text) return [];
    const box = group.getBBox();
    const offset = offsetIn(root, group);
    return [{ key: normalizeLabel(text), text, x: offset.x + box.x + box.width / 2, y: offset.y + box.y + box.height / 2, width: box.width }];
  });
  // Database nodes ([(…)]) are drawn by Mermaid as a path of arcs; the converter turns them into rectangles.
  const cylinders = [...root.querySelectorAll("g.node")]
    .filter((node) => /\ba[\d.]+,[\d.]+/.test(node.querySelector(":scope > path.label-container")?.getAttribute("d") ?? ""))
    .map((node) => {
      const box = node.getBBox();
      const offset = offsetIn(root, node);
      return { x: offset.x + box.x, y: offset.y + box.y, width: box.width, height: box.height };
    });
  done();
  return { labels, routes, cylinders };
}

// Hand-drawn cylinder under the converter's rectangle. The rectangle stays, invisible and drawn last, so
// arrows keep their bindings and its label (painted with it) stays centred on top of the cylinder.
function drawCylinders(out, cylinders) {
  const near = (a, b) => Math.abs(a - b) < 6;
  for (const box of cylinders) {
    const rect = out.find((e) => e.type === "rectangle" && near(e.x, box.x) && near(e.y, box.y) && near(e.width, box.width) && near(e.height, box.height));
    if (!rect) continue;
    const { id, label, roundness, ...shape } = rect;
    const { x, y, width, height } = shape;
    const ry = Math.min(12, height / 6);
    const edge = (left) => ({ ...style({ type: "line", x: left, y: y + ry, width: 0, height: height - 2 * ry, points: [[0, 0], [0, height - 2 * ry]] }), strokeColor: rect.strokeColor, strokeWidth: 2 });
    out.splice(out.indexOf(rect), 1);
    out.push(
      { ...shape, type: "ellipse", y: y + height - 2 * ry, height: 2 * ry },
      { ...shape, y: y + ry, height: height - 2 * ry, strokeColor: "transparent", roughness: 0 },
      edge(x),
      edge(x + width),
      { ...shape, type: "ellipse", height: 2 * ry },
      // The converter gives cylinder labels a smaller font than other nodes: size them like the rest.
      { ...containerWithLabel({ ...rect, label: label && { ...label, fontSize: 20 } })[0],
        strokeColor: "transparent", backgroundColor: "transparent", customData: { ...rect.customData, cylinder: true } },
    );
  }
}

// Gantt charts are drawn as a project-plan grid: activity, start and end columns on the left, a month and
// week header, one coloured band per section, bars in the colour of their section and diamonds for milestones.
const GANTT_PALETTE = ["#245f7f", "#1599a8", "#d99a12", "#e0604a", WINE[700], "#5b8c3a", "#6d5aa6"];
const GANTT_TEXT = {
  es: { activity: "Actividad", start: "Inicio", end: "Fin", done: "Terminado", active: "En curso", planned: "Planificado",
    critical: "Camino crítico", milestone: "Hito",
    months: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"] },
  en: { activity: "Activity", start: "Start", end: "End", done: "Done", active: "In progress", planned: "Planned",
    critical: "Critical path", milestone: "Milestone",
    months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] },
};
function leftText(text, x, centerY, fontSize, color = INK) {
  return { type: "text", x, y: centerY - lineHeight(fontSize) / 2, text, fontSize, fontFamily: FONT.family, strokeColor: color, roughness: 1 };
}

function ganttSkeletons(source, lang = "es") {
  const words = GANTT_TEXT[lang] ?? GANTT_TEXT.es;
  const chart = parseGantt(source);
  const tasks = chart.sections.flatMap((section) => section.tasks);
  const first = Math.min(...tasks.map((t) => t.start));
  const last = Math.max(...tasks.map((t) => Math.max(t.end, t.start + 1)));
  // Weeks start on Monday (1970-01-01, day 0, was a Thursday).
  const firstWeek = first - ((first + 3) % 7);
  const weeks = Math.ceil((last - firstWeek) / 7) + 1; // one spare week keeps the last bars off the border
  const ROW = 36, HEADER = 34, WEEK = ganttWeekWidth(weeks), PAD = 14, FONT_SIZE = 18;
  const dateLabel = (day) => { const d = new Date(day * DAY); return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`; };
  const nameWidth = Math.max(300, ...tasks.map((t) => textWidth(t.name, FONT_SIZE)), ...chart.sections.map((s) => textWidth(s.name, 20))) + 2 * PAD + 10;
  const dateWidth = Math.max(textWidth("00/00", FONT_SIZE), textWidth(words.start, FONT_SIZE), textWidth(words.end, FONT_SIZE)) + 2 * PAD;
  const left = 0, gridX = nameWidth + 2 * dateWidth, width = gridX + weeks * WEEK;
  const titleSize = 32, top = titleSize * 2;
  const dayX = (day) => gridX + ((day - firstWeek) / 7) * WEEK;
  const out = [];
  const rect = (x, y, w, h, fill, extra = {}) => out.push({ type: "rectangle", x, y, width: w, height: h, backgroundColor: fill,
    fillStyle: "solid", strokeColor: "transparent", strokeWidth: 1, roughness: 0, ...extra });
  const line = (x1, y1, x2, y2, color, strokeWidth = 1) => out.push({ type: "line", x: x1, y: y1, points: [[0, 0], [x2 - x1, y2 - y1]],
    strokeColor: color, strokeWidth, roughness: 0 });

  out.push(centredText(chart.title, width / 2, titleSize * 0.75, titleSize));
  // Header: column titles on the left, months over their weeks, then the day each week starts.
  const headerY = top;
  rect(left, headerY, gridX, HEADER * 2, INK);
  out.push(leftText(words.activity, left + PAD, headerY + HEADER, 20, CREAM));
  out.push({ ...centredText(words.start, nameWidth + dateWidth / 2, headerY + HEADER, 18), strokeColor: CREAM });
  out.push({ ...centredText(words.end, nameWidth + dateWidth * 1.5, headerY + HEADER, 18), strokeColor: CREAM });
  let monthStart = 0;
  for (let w = 0; w <= weeks; w++) {
    const month = w < weeks ? new Date((firstWeek + w * 7 + 3) * DAY).getUTCMonth() : -1;
    const startMonth = new Date((firstWeek + monthStart * 7 + 3) * DAY).getUTCMonth();
    if (w === weeks || month !== startMonth) {
      const x = gridX + monthStart * WEEK, span = (w - monthStart) * WEEK;
      rect(x, headerY, span, HEADER, startMonth % 2 ? WINE[700] : INK);
      if (span >= 40) out.push({ ...centredText(words.months[startMonth], x + span / 2, headerY + HEADER / 2, 18), strokeColor: CREAM });
      monthStart = w;
    }
  }
  for (let w = 0; w < weeks; w++) {
    const x = gridX + w * WEEK;
    rect(x, headerY + HEADER, WEEK, HEADER, w % 2 ? WINE[100] : WINE[50]);
    out.push(centredText(String(new Date((firstWeek + w * 7) * DAY).getUTCDate()), x + WEEK / 2, headerY + HEADER * 1.5, 12));
  }

  let y = headerY + HEADER * 2;
  const bodyTop = y;
  const bars = [];
  chart.sections.forEach((section, index) => {
    const color = GANTT_PALETTE[index % GANTT_PALETTE.length];
    const from = Math.min(...section.tasks.map((t) => t.start));
    const to = Math.max(...section.tasks.map((t) => Math.max(t.end, t.start + 1)));
    rect(left, y, width, ROW, tint(color, 0.82));
    rect(left, y, gridX, ROW, color);
    out.push(leftText(section.name, left + PAD, y + ROW / 2, 20, "#ffffff"));
    if (section.tasks.some((t) => !t.milestone)) bars.push({ type: "rectangle", x: dayX(from), y: y + ROW * 0.3, width: Math.max(10, dayX(to) - dayX(from)), height: ROW * 0.4,
      backgroundColor: color, fillStyle: "solid", strokeColor: color, strokeWidth: 1, roughness: 0 });
    y += ROW;
    section.tasks.forEach((task, row) => {
      rect(left, y, width, ROW, row % 2 ? "#ffffff" : CREAM);
      rect(left, y, 8, ROW, color);
      out.push(leftText(task.name, left + PAD + 8, y + ROW / 2, FONT_SIZE));
      out.push(centredText(dateLabel(task.start), nameWidth + dateWidth / 2, y + ROW / 2, 16));
      out.push(centredText(task.milestone ? "—" : dateLabel(Math.max(task.start, task.end - 1)), nameWidth + dateWidth * 1.5, y + ROW / 2, 16));
      if (task.milestone) {
        const size = ROW * 0.62;
        bars.push({ type: "diamond", x: dayX(task.start + 0.5) - size / 2, y: y + (ROW - size) / 2, width: size, height: size,
          backgroundColor: color, fillStyle: "solid", strokeColor: task.crit ? CRITICAL_COLOR : INK, strokeWidth: task.crit ? 3 : 2, roughness: 1 });
      } else {
        const x = dayX(task.start), w = Math.max(10, dayX(Math.max(task.end, task.start + 1)) - x);
        bars.push({ type: "rectangle", x, y: y + ROW * 0.18, width: w, height: ROW * 0.64, roundness: { type: 3 },
          ...ganttBarStyle(task, color), roughness: 1 });
      }
      y += ROW;
    });
  });
  const bodyBottom = y;
  // Grid: a light line per week, a darker one where a month starts, and row and column rules.
  for (let w = 0; w <= weeks; w++) {
    const monthEdge = w === 0 || w === weeks || new Date((firstWeek + w * 7 + 3) * DAY).getUTCMonth() !== new Date((firstWeek + (w - 1) * 7 + 3) * DAY).getUTCMonth();
    line(gridX + w * WEEK, bodyTop, gridX + w * WEEK, bodyBottom, monthEdge ? "#bfb2b8" : "#e6dde1", monthEdge ? 1.5 : 1);
  }
  for (let rowY = bodyTop; rowY <= bodyBottom; rowY += ROW) line(left, rowY, width, rowY, "#e6dde1");
  for (const x of [nameWidth, nameWidth + dateWidth, gridX]) line(x, headerY, x, bodyBottom, "#bfb2b8", 1.5);
  out.push({ type: "rectangle", x: left, y: headerY, width, height: bodyBottom - headerY, backgroundColor: "transparent",
    strokeColor: INK, strokeWidth: 2, roughness: 1 });
  out.push(...bars);

  // Legend.
  const legendY = bodyBottom + 34, sample = GANTT_PALETTE[1];
  let x = left;
  // The critical-path sample keeps the status of the first critical task, so it matches the bars it explains.
  const firstCritical = tasks.find((t) => t.crit && !t.milestone) ?? { planned: true };
  const samples = { done: { done: true }, active: { active: true }, planned: { planned: true }, critical: { ...firstCritical, crit: true } };
  for (const shape of ganttLegendKinds(tasks)) {
    const label = words[shape];
    if (shape === "milestone") out.push({ type: "diamond", x, y: legendY - 11, width: 22, height: 22, backgroundColor: sample, fillStyle: "solid", strokeColor: INK, strokeWidth: 2, roughness: 1 });
    else out.push({ type: "rectangle", x, y: legendY - 11, width: 44, height: 22, roundness: { type: 3 }, ...ganttBarStyle(samples[shape], sample), roughness: 1 });
    const offset = shape === "milestone" ? 32 : 54;
    out.push(leftText(label, x + offset, legendY, 18));
    x += offset + textWidth(label, 18) + 40;
  }
  return out;
}

// Mermaid laid labels out at 20px; 18px wrapped to the same width always fits the room Mermaid reserved.
const EDGE_LABEL_SIZE = 18;

/** Edge label written where Mermaid put it, on a cream patch so the lines behind it never cross the words. */
function placedLabel(spot) {
  const fontSize = EDGE_LABEL_SIZE;
  const lines = wrap(spot.text, spot.width, fontSize);
  const width = Math.max(...lines.split("\n").map((line) => textWidth(line, fontSize)));
  const height = lines.split("\n").length * lineHeight(fontSize);
  const patch = { type: "rectangle", x: spot.x - width / 2 - 6, y: spot.y - height / 2 - 3, width: width + 12, height: height + 6,
    strokeColor: "transparent", backgroundColor: CREAM, fillStyle: "solid", roughness: 0, roundness: { type: 3 }, customData: { patch: true } };
  return [patch, centredText(lines, spot.x, spot.y, fontSize)];
}

// Mermaid lays a self-transition out through two hidden nodes, which draws a wide detour. Draw a small
// loop instead, on the free side of the state closest to where Mermaid put it, with the label outside.
const LOOP_REACH = 36;
function compactSelfLoop(points, scene, label) {
  const shapes = scene.filter((e) => ["rectangle", "diamond", "ellipse"].includes(e.type) && e.width && e.height && !e.customData?.patch);
  const [sx, sy] = points[0];
  const node = shapes.filter((n) => sx >= n.x - 6 && sx <= n.x + n.width + 6 && sy >= n.y - 6 && sy <= n.y + n.height + 6)
    .sort((a, b) => a.width * a.height - b.width * b.height)[0];
  if (!node) return null;
  const cx = node.x + node.width / 2;
  const cy = node.y + node.height / 2;
  const dx = points.reduce((sum, [x]) => sum + x, 0) / points.length - cx;
  const dy = points.reduce((sum, [, y]) => sum + y, 0) / points.length - cy;
  const [size] = label ? placedLabel(label) : [{ width: 0, height: 0 }];
  const loops = {
    right: () => loopBeside(node.x + node.width, 1),
    left: () => loopBeside(node.x, -1),
    bottom: () => loopAround(node.y + node.height, 1),
    top: () => loopAround(node.y, -1),
  };
  function loopBeside(x0, side) {
    const far = x0 + side * LOOP_REACH;
    const labelX = far + side * (size.width / 2 + 4);
    return { points: [[x0, cy - 10], [far, cy - 18], [far, cy + 18], [x0, cy + 10]], label: label && { ...label, x: labelX, y: cy },
      box: box(Math.min(x0, labelX - size.width / 2), cy - Math.max(20, size.height / 2), LOOP_REACH + size.width + 4, Math.max(40, size.height)) };
  }
  function loopAround(y0, side) {
    const far = y0 + side * LOOP_REACH;
    const labelY = far + side * (size.height / 2 + 4);
    const width = Math.max(56, size.width);
    return { points: [[cx - 12, y0], [cx - 24, far], [cx + 24, far], [cx + 12, y0]], label: label && { ...label, x: cx, y: labelY },
      box: box(cx - width / 2, Math.min(y0, labelY - size.height / 2), width, LOOP_REACH + size.height + 4) };
  }
  const horizontal = Math.abs(dx) / node.width > Math.abs(dy) / node.height;
  const preferred = horizontal ? (dx > 0 ? "right" : "left") : (dy > 0 ? "bottom" : "top");
  const order = [preferred, ...Object.keys(loops).filter((k) => k !== preferred)];
  const others = scene.filter((e) => e !== node && !(shapes.includes(e) && holds(e, node)));
  const ranked = order.map((key, rank) => ({ loop: loops[key](), rank }))
    .map((c) => ({ ...c, hits: others.filter((e) => touches(c.loop.box, e)).length }))
    .sort((a, b) => a.hits - b.hits || a.rank - b.rank);
  return ranked[0].loop;
}

const box = (x, y, width, height) => ({ x, y, width, height });
/** Whether an element (a shape, a text or any point of an arrow) falls inside the area. */
function touches(area, el) {
  const inside = (x, y) => x >= area.x && x <= area.x + area.width && y >= area.y && y <= area.y + area.height;
  if (el.points?.length) return el.points.some(([px, py]) => inside(el.x + px, el.y + py));
  const width = el.width ?? 0;
  const height = el.height ?? 0;
  return el.x < area.x + area.width && el.x + width > area.x && el.y < area.y + area.height && el.y + height > area.y;
}

const holds = (outer, inner) => outer !== inner && inner.x >= outer.x && inner.y >= outer.y
  && inner.x + inner.width <= outer.x + outer.width && inner.y + inner.height <= outer.y + outer.height;

/** A group whose title would touch the shapes inside it grows upwards until the title clears them. */
function clearGroupTitles(skeletons) {
  const shapes = skeletons.filter((e) => ["rectangle", "diamond", "ellipse"].includes(e.type) && e.width && e.height && !e.customData?.patch);
  const groups = shapes.filter((e) => e.label?.text && shapes.some((inner) => holds(e, inner)))
    .sort((a, b) => a.width * a.height - b.width * b.height);
  for (const group of groups) {
    const titleRoom = lineHeight(group.label.fontSize ?? 20) * group.label.text.split("\n").length + 14;
    const closest = Math.min(...shapes.filter((inner) => holds(group, inner)).map((inner) => inner.y - group.y));
    if (closest < titleRoom) {
      group.y -= titleRoom - closest;
      group.height += titleRoom - closest;
    }
  }
}

/** Mermaid occasionally places two labels on top of each other: push the lower one down until they clear. */
function separateLabels(placed) {
  const gap = 4;
  for (let pass = 0; pass < 20; pass++) {
    let moved = false;
    placed.sort((a, b) => a.patch.y - b.patch.y);
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const [a, b] = [placed[i].patch, placed[j].patch];
        const overlapX = a.x < b.x + b.width + gap && b.x < a.x + a.width + gap;
        const shift = a.y + a.height + gap - b.y;
        if (!overlapX || shift <= 0) continue;
        b.y += shift;
        placed[j].text.customData.centerY += shift;
        moved = true;
      }
    }
    if (!moved) return;
  }
}

function toSkeletons(source, elements, { labels: edgeLabels, routes, cylinders = [] }) {
  const isSequence = diagramType(source) === "sequenceDiagram";
  const out = [];
  const placed = [];
  for (const original of elements) {
    const el = original.type === "arrow" ? followRoute(original, routes) : original;
    if (el.type === "arrow") {
      const start = CARDINALITY[el.startArrowhead];
      const end = CARDINALITY[el.endArrowhead];
      if (start || end) {
        const spot = el.label?.text && takeLabel(edgeLabels, el.label.text, el);
        const arrow = { ...el, label: spot ? undefined : el.label, startArrowhead: start?.head ?? el.startArrowhead, endArrowhead: end?.head ?? el.endArrowhead };
        out.push(style(arrow));
        if (spot) {
          const [patch, text] = placedLabel(spot);
          placed.push({ patch, text });
          out.push(patch, text);
        }
        if (start?.optional) out.push(optionalRing(el, true));
        if (end?.optional) out.push(optionalRing(el, false));
        continue;
      }
      // A self-message loop would hide its label at the arrow midpoint: write it right of the loop.
      if (isSequence && el.label?.text && (el.points?.length ?? 0) > 2) {
        const { label, ...loop } = el;
        out.push(style(loop));
        const right = Math.max(...el.points.map(([x]) => x));
        const middle = (Math.min(...el.points.map(([, y]) => y)) + Math.max(...el.points.map(([, y]) => y))) / 2;
        const fontSize = label.fontSize ?? 16;
        out.push(style({ type: "text", x: el.x + right + 12, y: el.y + middle - (fontSize * 1.25) / 2, text: label.text, fontSize }));
        continue;
      }
      const spot = el.label?.text && el.points && takeLabel(edgeLabels, el.label.text, el);
      if (spot) {
        const [patch, text] = placedLabel(spot);
        placed.push({ patch, text });
        out.push(style({ ...el, label: undefined }), patch, text);
        continue;
      }
      // Sequence messages read like Mermaid: the label sits above a horizontal line, never across it.
      if (isSequence && el.label?.text && Math.abs(el.height ?? 0) < 1) {
        const { label, ...line } = el;
        out.push(style(line));
        const centerX = el.x + (el.points?.at(-1)?.[0] ?? el.width) / 2;
        const fontSize = label.fontSize ?? 16;
        out.push(style({ type: "text", x: centerX, y: el.y - fontSize - 12, text: label.text, fontSize, textAlign: "center", customData: { centerX } }));
        continue;
      }
    }
    out.push(...containerWithLabel(el));
  }
  // The converter skips self-transitions; draw them from Mermaid's route with the nearest free label.
  const arrowStyle = out.find((e) => e.type === "arrow");
  for (const route of routes.filter((r) => r.selfLoop)) {
    const near = edgeLabels.filter((label) => distanceToRoute([label.x, label.y], route.points) < 80)
      .sort((a, b) => distanceToRoute([a.x, a.y], route.points) - distanceToRoute([b.x, b.y], route.points))[0];
    if (near) edgeLabels.splice(edgeLabels.indexOf(near), 1);
    const loop = compactSelfLoop(route.points, out, near);
    out.push(style(routeArrow(loop?.points ?? route.points,
      { type: "arrow", endArrowhead: "arrow", strokeStyle: arrowStyle?.strokeStyle, ...(loop && { roundness: { type: 2 } }) })));
    if (near) {
      const [patch, text] = placedLabel(loop?.label ?? near);
      placed.push({ patch, text });
      out.push(patch, text);
    }
  }
  clearGroupTitles(out);
  drawCylinders(out, cylinders);
  separateLabels(placed);
  return out;
}

// Mermaid wraps long class members while the converter draws them on one line, which leaves gaps
// and overlaps. Restack the attribute and method compartments of every class with an even step.
function restackClassMembers(scene) {
  const texts = scene.filter((e) => e.type === "text" && !e.containerId);
  const separators = scene.filter((e) => e.type === "line" && e.points?.length === 2 && e.points[1][1] === 0);
  for (const box of scene.filter((e) => e.type === "rectangle")) {
    const lines = separators
      .filter((l) => Math.abs(l.x - box.x) < 1 && Math.abs(l.points[1][0] - box.width) < 1 && l.y > box.y && l.y < box.y + box.height)
      .map((l) => l.y)
      .sort((a, b) => a - b);
    if (lines.length !== 2) continue;
    const inBox = texts.filter((t) => t.x >= box.x - 1 && t.x < box.x + box.width);
    for (const [top, bottom] of [[lines[0], lines[1]], [lines[1], box.y + box.height]]) {
      const center = (t) => t.y + t.height / 2;
      const members = inBox.filter((t) => center(t) > top && center(t) <= bottom).sort((a, b) => a.y - b.y);
      let y = top + 9;
      for (const t of members) {
        t.y = y;
        if (t.width + 24 <= box.width) t.x = box.x + 12;
        y += t.height + 7.5;
      }
    }
  }
  return scene;
}

// Mermaid routes may run across other shapes; drawing them behind solid shapes hides those crossings.
// Groups (shapes holding other shapes) stay underneath, and every text stays on top.
function layerArrowsBehindShapes(scene) {
  const shapes = scene.filter((e) => ["rectangle", "diamond", "ellipse"].includes(e.type) && !e.customData?.patch);
  const groups = new Set(shapes.filter((outer) => !outer.customData?.cylinder && shapes.some((inner) => holds(outer, inner))));
  const rank = (e) => (groups.has(e) ? 0 : e.type === "arrow" ? 1 : e.type === "text" ? 3 : 2);
  return scene.map((e, i) => [e, i]).sort(([a, i], [b, j]) => rank(a) - rank(b) || i - j).map(([e]) => e);
}

// Mounting the editor registers Excalidraw's font faces, so Mermaid and Excalidraw measure text with the real font.
async function registerFonts() {
  const host = document.getElementById("editor");
  const elements = convertToExcalidrawElements([{ type: "text", x: 0, y: 0, text: "Ag áéñ", fontFamily: FONT.family }]);
  createRoot(host).render(createElement(Excalidraw, { initialData: { elements } }));
  for (let i = 0; i < 100 && ![...document.fonts].some((f) => f.family.includes(FONT.name)); i++) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  await document.fonts.load(`20px "${FONT.name}"`, "Agáéñ¿→");
  await document.fonts.ready;
}

const ready = registerFonts();

window.renderDiagram = async (source, { lang = "es" } = {}) => {
  await ready;
  const type = diagramType(source);
  const { elements, files } = type === "gantt" ? { elements: [], files: {} } : await parseMermaidToExcalidraw(source, MERMAID_CONFIG);
  const graph = GRAPHS.has(type) || type === "erDiagram" ? await mermaidGraph(source) : { labels: [], routes: [] };
  const skeletons = type === "gantt" ? ganttSkeletons(source, lang) : toSkeletons(source, elements, graph);
  let scene = convertToExcalidrawElements(skeletons, { regenerateIds: true }).map((e) => {
    if (e.type !== "text" || e.customData?.centerX === undefined) return e;
    const { centerX, centerY } = e.customData;
    return { ...e, x: centerX - e.width / 2, y: centerY === undefined ? e.y : centerY - e.height / 2, customData: undefined };
  });
  if (type === "classDiagram") scene = restackClassMembers(scene);
  if (GRAPHS.has(type) || type === "erDiagram" || type === "classDiagram") scene = layerArrowsBehindShapes(scene);
  const appState = { exportBackground: true, viewBackgroundColor: CREAM, exportWithDarkMode: false };
  const svg = await exportToSvg({ elements: scene, appState, files: files ?? {}, exportPadding: 48 });
  // Mermaid diagram types the converter cannot draw arrive as an embedded image file.
  const native = Object.keys(files ?? {}).length === 0;
  return {
    native,
    svg: svg.outerHTML,
    scene: JSON.stringify({ type: "excalidraw", version: 2, source: "https://docs.vinnot.com", elements: scene, appState: { viewBackgroundColor: CREAM }, files: files ?? {} }),
  };
};
/** Mermaid's own SVG for the same source and configuration, for side-by-side review. */
window.mermaidSvg = async (source) => {
  await ready;
  mermaid.initialize({ startOnLoad: false, ...MERMAID_CONFIG });
  return (await mermaid.render(`review-${++renders}`, source)).svg;
};
/** Edge label positions and widths as Mermaid laid them out, for review. */
window.mermaidEdgeLabels = async (source) => {
  await ready;
  return (await mermaidGraph(source)).labels;
};
window.rendererReady = ready.then(() => true);
