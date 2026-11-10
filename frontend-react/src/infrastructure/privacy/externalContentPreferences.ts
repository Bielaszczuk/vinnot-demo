/** Only optional embedded maps are controlled here; authentication remains available. */
const key = "vinnot.external-maps.v1";
const listeners = new Set<() => void>();
let current = false;
try {
  current = localStorage.getItem(key) === "allow";
} catch {
  /* Opt out when storage is blocked. */
}
export const externalContentPreferences = {
  read: () => current,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  write(allowed: boolean): boolean {
    current = allowed;
    let persisted = true;
    try {
      localStorage.setItem(key, allowed ? "allow" : "deny");
    } catch {
      persisted = false;
    }
    listeners.forEach((listener) => listener());
    return persisted;
  },
};
if (typeof window !== "undefined")
  window.addEventListener("storage", (event) => {
    if (event.key === key || event.key === null) {
      current = event.newValue === "allow";
      listeners.forEach((listener) => listener());
    }
  });
