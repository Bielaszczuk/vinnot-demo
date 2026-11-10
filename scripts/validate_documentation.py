#!/usr/bin/env python3
"""Validate Vinnot's bilingual canonical documentation structure."""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
LANGUAGES = ("es", "en")
ALLOWED_MARKDOWN_OUTSIDE_DOCS = {
    Path("README.md"),
    Path("AGENTS.md"),  # Agent tooling discovers these instructions at the repository root.
    Path(".github/pull_request_template.md"),
}
LINK_PATTERN = re.compile(r"(?<!!)\[[^\]]+\]\(([^)]+)\)")
FENCE_PATTERN = re.compile(r"^```", re.MULTILINE)
NON_CANONICAL_PATTERNS = {
    "classroom narrative": re.compile(r"como explicarlo en clase", re.IGNORECASE),
    "dated acceptance narrative": re.compile(
        r"corrida de aceptaci[oó]n|acceptance run\s+[—-]\s+20\d{2}",
        re.IGNORECASE,
    ),
    "build transcript": re.compile(r"BUILD SUCCEEDED"),
    "ambiguous policy placeholder": re.compile(
        r"seg[uú]n (?:la )?pol[ií]tica vigente|"
        r"under (?:the )?current policy|"
        r"cuando (?:corresponde|aplica)|si corresponde|"
        r"when applicable|where appropriate|as appropriate",
        re.IGNORECASE,
    ),
}


def markdown_files(base: Path) -> list[Path]:
    # .mdx pages (MDX with React components) are documentation too.
    return sorted([*base.rglob("*.md"), *base.rglob("*.mdx")])


def relative_manifest(language: str) -> list[Path]:
    base = DOCS / language
    return [path.relative_to(base) for path in markdown_files(base)]


def tracked_markdown() -> list[Path]:
    completed = subprocess.run(
        ["git", "ls-files", "*.md", "*.mdx"],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    return [
        Path(line)
        for line in completed.stdout.splitlines()
        if line and (ROOT / line).exists()
    ]


def validate_layout(errors: list[str]) -> None:
    manifests = {language: relative_manifest(language) for language in LANGUAGES}
    if manifests["es"] != manifests["en"]:
        es_paths = set(manifests["es"])
        en_paths = set(manifests["en"])
        for path in sorted(es_paths - en_paths):
            errors.append(f"missing English mirror: docs/en/{path}")
        for path in sorted(en_paths - es_paths):
            errors.append(f"missing Spanish mirror: docs/es/{path}")

    for path in tracked_markdown():
        if path in ALLOWED_MARKDOWN_OUTSIDE_DOCS or path.parts[:1] == ("docs",):
            continue
        errors.append(f"tracked Markdown must be centralized under docs/: {path}")


def linked_documents(page: Path, base: Path) -> set[Path]:
    """Canonical Markdown pages of the same language linked from a page."""
    linked: set[Path] = set()
    for raw_target in LINK_PATTERN.findall(page.read_text(encoding="utf-8")):
        target = raw_target.split("#", 1)[0].strip()
        if not target or "://" in target or target.startswith("mailto:"):
            continue
        resolved = (page.parent / target).resolve()
        if (
            resolved.is_file()
            and resolved.suffix in {".md", ".mdx"}
            and resolved.is_relative_to(base.resolve())
        ):
            linked.add(resolved)
    return linked


def validate_index_coverage(errors: list[str]) -> None:
    """Require every canonical document to be reachable from its index.

    The root index links each section index, and section indexes link their
    pages, so a document counts when a chain of links leads to it.
    """
    for language in LANGUAGES:
        base = DOCS / language
        index = base / "README.md"
        indexed: set[Path] = set()
        pending = [index.resolve()]
        while pending:
            for page in linked_documents(pending.pop(), base) - indexed:
                indexed.add(page)
                pending.append(page)

        expected = {
            path.resolve()
            for path in markdown_files(base)
            if path.resolve() != index.resolve()
        }
        for path in sorted(expected - indexed):
            relative = path.relative_to(base.resolve())
            errors.append(
                f"document missing from {language} index: docs/{language}/{relative}"
            )


def validate_file(path: Path, errors: list[str]) -> None:
    content = path.read_text(encoding="utf-8")
    if len(FENCE_PATTERN.findall(content)) % 2:
        errors.append(f"unbalanced fenced code block: {path.relative_to(ROOT)}")

    is_canonical = (
        path.is_relative_to(DOCS / "es")
        or path.is_relative_to(DOCS / "en")
    )
    is_language_standard = path.name == "documentation-standards.md"
    if is_canonical and not is_language_standard:
        for label, pattern in NON_CANONICAL_PATTERNS.items():
            if pattern.search(content):
                errors.append(f"{label} in canonical docs: {path.relative_to(ROOT)}")

    for raw_target in LINK_PATTERN.findall(content):
        target = raw_target.split("#", 1)[0].strip()
        if not target or "://" in target or target.startswith("mailto:"):
            continue
        resolved = (path.parent / target).resolve()
        if not resolved.exists():
            errors.append(
                f"broken link in {path.relative_to(ROOT)}: {raw_target}"
            )


def main() -> int:
    errors: list[str] = []
    validate_layout(errors)
    validate_index_coverage(errors)
    canonical = [ROOT / "README.md", DOCS / "README.md"]
    canonical.extend(markdown_files(DOCS / "es"))
    canonical.extend(markdown_files(DOCS / "en"))
    for path in canonical:
        validate_file(path, errors)

    if errors:
        print("Documentation validation failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    count = len(relative_manifest("es"))
    print(f"Documentation is valid: {count} mirrored files per language.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
