import { useEffect, useRef, useState } from "react";
import { applicationLifecycleService } from "@/application/services/applicationLifecycle.service";
import { usersService } from "@/application/services/users.service";
import { useAuthStore } from "@/presentation/store/auth.store";
import { useUiHydrating, useUiStore } from "@/presentation/store/ui.store";

/**
 * Keeps the account language and time zone in step with the app.
 * Runs after every login or restored session, whenever the language changes, and
 * when the app returns to the foreground with a different device time zone,
 * once the persisted language has been hydrated. The sync is fire-and-forget:
 * a failure never blocks signing in or switching language.
 */
export function useAccountLocaleSync(): void {
  const userId = useAuthStore((state) => (state.accessToken ? state.user?.id ?? null : null));
  const language = useUiStore((state) => state.language);
  const isHydrating = useUiHydrating();
  const lastSynced = useRef<string | null>(null);
  const [foregroundCount, setForegroundCount] = useState(0);

  useEffect(
    () =>
      applicationLifecycleService.subscribe({
        onFocus: () => setForegroundCount((count) => count + 1),
        onFocusLost: () => undefined,
      }),
    [],
  );

  useEffect(() => {
    if (!userId) {
      lastSynced.current = null;
      return;
    }
    if (isHydrating) return;
    const key = `${userId}|${language}|${usersService.deviceTimezone() ?? ""}`;
    if (lastSynced.current === key) return;
    lastSynced.current = key;
    usersService.syncAccountLocale(language).catch(() => {
      // Best effort: the next login, language switch or time zone change retries.
    });
  }, [userId, language, isHydrating, foregroundCount]);
}
