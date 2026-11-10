// Pure part of the gantt renderer: parsing the Mermaid source and deciding how each kind of task looks.
// It has no browser or Excalidraw dependency, so scripts/test/docs-diagrams.test.mjs can test it under Node.

export const DAY = 86400000;
export const toDay = (iso) => Date.UTC(...iso.split("-").map((n, i) => Number(n) - (i === 1 ? 1 : 0))) / DAY;

/** Mixes a hex colour with white; amount 0 keeps the colour, 1 gives white. */
export function tint(hex, amount) {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `#${channels.map((c) => Math.round(c + (255 - c) * amount).toString(16).padStart(2, "0")).join("")}`;
}

/** Parses the subset of Mermaid gantt syntax the documentation uses: dates, durations in days or weeks, `after`. */
export function parseGantt(source) {
  const chart = { title: "", sections: [] };
  const byId = new Map();
  for (const raw of source.split("\n").slice(1)) {
    const line = raw.trim();
    if (!line || line.startsWith("%%")) continue;
    const keyword = line.match(/^(title|dateFormat|axisFormat|todayMarker|excludes|tickInterval|weekday)\b\s*(.*)$/);
    if (keyword) { if (keyword[1] === "title") chart.title = keyword[2]; continue; }
    const section = line.match(/^section\s+(.*)$/);
    if (section) { chart.sections.push({ name: section[1], tasks: [] }); continue; }
    const task = line.match(/^(.*?)\s*:(.*)$/);
    if (!task) continue;
    if (!chart.sections.length) chart.sections.push({ name: "", tasks: [] });
    const parts = task[2].split(",").map((part) => part.trim()).filter(Boolean);
    const tags = new Set(parts.filter((part) => /^(done|active|crit|milestone)$/.test(part)));
    const rest = parts.filter((part) => !tags.has(part));
    const id = rest.length >= 3 || (rest.length === 2 && !/^\d{4}-|^after\s/.test(rest[0])) ? rest.shift() : null;
    const previous = chart.sections.flatMap((s) => s.tasks).at(-1);
    const startOf = (value) => value?.startsWith("after ")
      ? Math.max(...value.slice(6).split(/\s+/).map((ref) => byId.get(ref)?.end ?? 0))
      : value ? toDay(value) : previous?.end ?? 0;
    const start = startOf(rest.length >= 2 ? rest[0] : rest.length === 1 && /^\d{4}-|^after\s/.test(rest[0]) ? rest[0] : null);
    const last = rest.at(-1);
    const length = last?.match(/^(\d+(?:\.\d+)?)([dw])$/);
    const end = length ? start + Number(length[1]) * (length[2] === "w" ? 7 : 1)
      : last && /^\d{4}-/.test(last) && rest.length >= 2 ? toDay(last) + 1 : start; // an end date includes that day
    const milestone = tags.has("milestone"), active = tags.has("active"), done = tags.has("done");
    // A task with no status tag is planned work (docs/<lang>/governance/documentation-standards.md).
    const entry = { name: task[1], start, end, milestone, active, done, planned: !milestone && !active && !done, crit: tags.has("crit") };
    chart.sections.at(-1).tasks.push(entry);
    if (id) byId.set(id, entry);
  }
  return chart;
}

/** Outline of the tasks on the critical path, in the bars and in the legend. */
export const CRITICAL_COLOR = "#c62828";

/** Kinds the legend shows, in order, only when the chart has a task of that kind. */
export function ganttLegendKinds(tasks) {
  const bars = tasks.filter((t) => !t.milestone);
  return [
    ["done", bars.some((t) => t.done && !t.active)],
    ["active", bars.some((t) => t.active)],
    ["planned", bars.some((t) => t.planned)],
    ["critical", tasks.some((t) => t.crit)],
    ["milestone", tasks.some((t) => t.milestone)],
  ].filter(([, used]) => used).map(([kind]) => kind);
}

/**
 * Look of a task bar in its section colour: done is solid, active is hatched, planned is pale with a dashed
 * outline, and a critical-path task keeps its status fill with a thick red outline.
 */
export function ganttBarStyle(task, color) {
  const style = task.active ? { backgroundColor: tint(color, 0.35), fillStyle: "hachure", strokeColor: color, strokeWidth: 2 }
    : task.planned ? { backgroundColor: tint(color, 0.8), fillStyle: "solid", strokeColor: color, strokeWidth: 2, strokeStyle: "dashed" }
      : { backgroundColor: tint(color, 0.15), fillStyle: "solid", strokeColor: color, strokeWidth: 2 };
  return task.crit ? { ...style, strokeColor: CRITICAL_COLOR, strokeWidth: 4 } : style;
}

/** Week column width: 26 px, widened on short horizons so the grid is at least about 1100 px wide. */
export function ganttWeekWidth(weeks) {
  return Math.max(26, Math.floor(1100 / weeks));
}
