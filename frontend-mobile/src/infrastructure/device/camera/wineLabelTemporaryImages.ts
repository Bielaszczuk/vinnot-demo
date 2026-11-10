import { cacheDirectory, deleteAsync } from "expo-file-system/legacy";

// Only URIs produced by this camera flow are owned. Never sweep the shared cache.
const references = new Map<string, number>();

export function ownWineLabelImage(uri: string): void {
  if (cacheDirectory && uri.startsWith(cacheDirectory) && !uri.includes("..")) {
    references.set(uri, (references.get(uri) ?? 0) + 1);
  }
}

export function releaseWineLabelImage(uri: string): void {
  const count = references.get(uri);
  if (count === undefined) return;
  if (count > 1) {
    references.set(uri, count - 1);
    return;
  }
  references.delete(uri);
  // A cleanup failure must not hide the user's recognition/submission result.
  void deleteAsync(uri, { idempotent: true }).catch(() => undefined);
}

/** A native operation may finish after its UI timeout or screen unmount. */
export function retainWineLabelImage(uri: string): () => void {
  const owned = references.has(uri);
  if (owned) ownWineLabelImage(uri);
  let released = false;
  return () => {
    if (!released) {
      released = true;
      if (owned) releaseWineLabelImage(uri);
    }
  };
}
