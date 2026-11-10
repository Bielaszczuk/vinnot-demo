import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "@jest/globals";

const appRoot = join(__dirname, "../../../../../app");

/** Route files read params and compose one presentation feature screen (#268). */
const ROUTE_SHELLS = [
  "(app)/(tabs)/events/[id].tsx",
  "(app)/(tabs)/profile.tsx",
  "(app)/admin/events.tsx",
  "(app)/admin/routes.tsx",
  "(app)/admin/social-posts.tsx",
  "(app)/admin/users.tsx",
  "(app)/admin/wineries.tsx",
  "(app)/admin/wines.tsx",
];

describe("Expo Router route shells", () => {
  it.each(ROUTE_SHELLS)("%s only composes a presentation feature", (route) => {
    const source = readFileSync(join(appRoot, route), "utf8");
    const imports = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map((match) => match[1]);

    expect(source.trim().split("\n").length).toBeLessThanOrEqual(8);
    expect(imports.filter((path) => path?.startsWith("@/presentation/features/"))).toHaveLength(1);
    expect(imports.every((path) => path === "expo-router" || path?.startsWith("@/presentation/features/"))).toBe(true);
  });
});
