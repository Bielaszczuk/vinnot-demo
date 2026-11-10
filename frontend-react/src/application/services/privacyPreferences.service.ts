import { externalContentPreferences } from "@/infrastructure/privacy/externalContentPreferences";
export const privacyPreferencesService = {
  getExternalMaps: externalContentPreferences.read,
  subscribe: externalContentPreferences.subscribe,
  setExternalMaps: externalContentPreferences.write,
};
