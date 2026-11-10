import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "@jest/globals";

const mobileRoot = join(__dirname, "../../../..");

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === "node_modules" ? [] : sourceFiles(path);
    return /\.tsx$/.test(entry.name) && !/\.test\.tsx$/.test(entry.name) ? [path] : [];
  });
}

/**
 * NativeWind wraps Pressable through react-native-css-interop. On a device the interop rebuilds `style` as an
 * object, so `style={({ pressed }) => [...]}` becomes `{}` and the element loses every style (#332). Jest never
 * runs that path, so this scan is the only guard.
 */
describe("pressable styles", () => {
  it("never passes a function as a style prop", () => {
    const offenders = [join(mobileRoot, "src"), join(mobileRoot, "app")]
      .flatMap(sourceFiles)
      .filter((file) => /\bstyle=\{\s*(?:\(|function\b|[A-Za-z_$][\w$]*\s*=>)/.test(readFileSync(file, "utf8")))
      .map((file) => relative(mobileRoot, file));

    expect(offenders).toEqual([]);
  });
});
