import { useState, useSyncExternalStore } from "react";
import { privacyPreferencesService } from "@/application/services/privacyPreferences.service";
export function useExternalMapsPreference() {
  const allowed = useSyncExternalStore(
    privacyPreferencesService.subscribe,
    privacyPreferencesService.getExternalMaps,
    () => false,
  );
  const [saved, setSaved] = useState<boolean>();
  const setAllowed = (value: boolean) =>
    setSaved(privacyPreferencesService.setExternalMaps(value));
  return { allowed, setAllowed, saved };
}
