#!/usr/bin/env node
// Rebuilds the diagram catalog (docs/<lang>/diagrams/README.md) from the Mermaid blocks in the docs.
// Usage: node scripts/docs-diagram-catalog.mjs [--write]
//   Without --write it exits 1 when a catalog is out of date. The intro and the Lucidchart section are kept.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LANGUAGES, findDiagrams, markdownPages } from "./lib/docs-diagrams.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const docsRoot = path.join(repo, "docs");
const write = process.argv.includes("--write");

const TEXT = {
  es: {
    table: "| Diagrama | Página |\n|---|---|",
    sequenceIntro: "Cada caso de uso tiene su diagrama de secuencia en su página. Por módulo:",
    useCases: (n) => `${n} ${n === 1 ? "caso de uso" : "casos de uso"}`,
    sections: {
      usecase: "Casos de uso", sequence: "Secuencia", activity: "Actividad", flow: "Flujos y arquitectura",
      deployment: "Despliegue e infraestructura", er: "Entidad-relación (DER)", state: "Estados", class: "Clases",
      package: "Paquetes", gantt: "Cronograma",
    },
  },
  en: {
    table: "| Diagram | Page |\n|---|---|",
    sequenceIntro: "Each use case has its sequence diagram on its page. By module:",
    useCases: (n) => `${n} ${n === 1 ? "use case" : "use cases"}`,
    sections: {
      usecase: "Use cases", sequence: "Sequence", activity: "Activity", flow: "Flows and architecture",
      deployment: "Deployment and infrastructure", er: "Entity-relationship (ERD)", state: "States", class: "Classes",
      package: "Packages", gantt: "Timeline",
    },
  },
};
const ORDER = ["usecase", "sequence", "activity", "flow", "deployment", "er", "state", "class", "package", "gantt"];

const title = (file) => fs.readFileSync(file, "utf8").match(/^#\s+(.+)$/m)?.[1].trim() ?? path.basename(file, ".md");

/** Which catalog section a diagram belongs to. */
function kindOf(diagram) {
  const type = diagram.source.trimStart().split(/\s/)[0];
  const name = diagram.name.toLowerCase();
  if (/^modules\/[^/]+\/use-cases\/readme\.md$/i.test(diagram.relativePath) && /^(flowchart|graph)$/.test(type)) return "usecase";
  if (type === "sequenceDiagram") return "sequence";
  if (/^stateDiagram/.test(type)) return "state";
  if (type === "classDiagram") return "class";
  if (type === "erDiagram") return "er";
  if (type === "gantt") return "gantt";
  if (/diagrama de actividad|activity diagram/.test(name)) return "activity";
  if (/diagrama de paquetes|package diagram/.test(name)) return "package";
  if (diagram.relativePath.startsWith("infra/")) return "deployment";
  return "flow";
}

function catalog(language) {
  const text = TEXT[language];
  const base = path.join(docsRoot, language);
  const moduleTitle = (slug) => title(path.join(base, "modules", slug, "README.md"));
  const pageLabel = (relativePath) => {
    const own = title(path.join(base, relativePath));
    const module = relativePath.match(/^modules\/([^/]+)\/(.+)$/);
    if (!module) return own;
    return module[2] === "README.md" ? moduleTitle(module[1]) : `${moduleTitle(module[1])} · ${own}`;
  };
  const groups = Object.fromEntries(ORDER.map((kind) => [kind, []]));
  const useCaseCounts = new Map();
  for (const { full, relativePath } of markdownPages(docsRoot, language)) {
    if (relativePath === "diagrams/README.md") continue;
    for (const diagram of findDiagrams(fs.readFileSync(full, "utf8"), language, relativePath)) {
      const kind = kindOf(diagram);
      const useCase = relativePath.match(/^modules\/([^/]+)\/use-cases\/uc-[^/]+\.md$/);
      if (kind === "sequence" && useCase) {
        useCaseCounts.set(useCase[1], new Set([...(useCaseCounts.get(useCase[1]) ?? []), relativePath]));
        continue;
      }
      const label = pageLabel(relativePath);
      const own = title(full);
      // A use-case page may split its diagram by area; the generic heading names the module alone.
      const area = /casos de uso|use cases?/i.test(diagram.name) ? "" : ` · ${diagram.name}`;
      let name = kind === "usecase" ? `${moduleTitle(relativePath.split("/")[1])}${area}` : diagram.name;
      for (const prefix of [`${label} · `, `${own} · `]) if (name.startsWith(prefix)) name = name.slice(prefix.length);
      groups[kind].push(`| ${name.replace(/\|/g, "\\|")} | [${label}](../${relativePath}) |`);
    }
  }
  const sections = [];
  for (const kind of ORDER) {
    const rows = groups[kind];
    if (kind === "sequence") {
      const modules = [...useCaseCounts.keys()].sort();
      if (!modules.length && !rows.length) continue;
      const list = modules.map((slug) => `- [${moduleTitle(slug)}](../modules/${slug}/use-cases/README.md): ${text.useCases(useCaseCounts.get(slug).size)}`);
      sections.push([`## ${text.sections[kind]}`, text.sequenceIntro, list.join("\n"), rows.length ? `${text.table}\n${rows.join("\n")}` : ""].filter(Boolean).join("\n\n"));
      continue;
    }
    if (rows.length) sections.push(`## ${text.sections[kind]}\n\n${text.table}\n${rows.join("\n")}`);
  }
  return sections.join("\n\n");
}

let stale = 0;
for (const language of LANGUAGES) {
  const file = path.join(docsRoot, language, "diagrams", "README.md");
  const current = fs.readFileSync(file, "utf8");
  const first = current.search(/^## /m);
  const lucid = current.search(/^## Lucidchart/m);
  if (first < 0 || lucid < 0) throw new Error(`${file}: expected the intro, the generated sections and ## Lucidchart`);
  const next = `${current.slice(0, first)}${catalog(language)}\n\n${current.slice(lucid)}`;
  if (next === current) continue;
  stale++;
  if (write) fs.writeFileSync(file, next);
  console.log(`${write ? "updated" : "out of date"}: docs/${language}/diagrams/README.md`);
}
if (stale && !write) process.exitCode = 1;
