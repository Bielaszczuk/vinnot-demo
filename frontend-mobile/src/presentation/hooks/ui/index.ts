/**
 * Utility hooks — UI infrastructure, domain-agnostic.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import {
  hapticsService,
  type HapticImpact,
  type HapticNotification,
} from "@/application/services/haptics.service";
import { locationService } from "@/application/services/location.service";

// ─── useDebounce ──────────────────────────────────────────────────────────────
export function useDebounce<T>(value: T, delay = 400): T {
  const [debouncedValue, updateDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => updateDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// ─── useDebouncedCallback ─────────────────────────────────────────────────────
export function useDebouncedCallback<T extends (...args: unknown[]) => void>(fn: T, delay = 400): T {
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  return useCallback(
    ((...args: unknown[]) => {
      if (timeout.current) clearTimeout(timeout.current);
      timeout.current = setTimeout(() => fn(...args), delay);
    }) as T,
    [fn, delay],
  );
}

// ─── useHaptics ───────────────────────────────────────────────────────────────
export function useHaptics() {
  const impact = useCallback((style: HapticImpact = "light") => {
    hapticsService.impact(style);
  }, []);

  const selection = useCallback(() => {
    hapticsService.selection();
  }, []);

  const notification = useCallback((type: HapticNotification) => {
    hapticsService.notification(type);
  }, []);

  return { impact, selection, notification };
}

// ─── useBoolean ───────────────────────────────────────────────────────────────
export function useBoolean(initial = false) {
  const [value, updateValue] = useState(initial);
  const setTrue = useCallback(() => updateValue(true), []);
  const setFalse = useCallback(() => updateValue(false), []);
  const toggle = useCallback(() => updateValue((v) => !v), []);
  return { value, setTrue, setFalse, toggle, updateValue };
}

// ─── useTimeout ───────────────────────────────────────────────────────────────
export function useTimeout(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);
  useEffect(() => { savedCallback.current = callback; }, [callback]);
  useEffect(() => {
    if (delay === null) return;
    const id = setTimeout(() => savedCallback.current(), delay);
    return () => clearTimeout(id);
  }, [delay]);
}

// ─── useGeolocation ───────────────────────────────────────────────────────────
export type GeolocationState = {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
};

export function useGeolocation(): GeolocationState {
  const [state, updateGeoState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: false,
  });

  useEffect(() => {
    let mounted = true;

    async function resolveLocation() {
      updateGeoState((s) => ({ ...s, loading: true, error: null }));
      const result = await locationService.getCurrentLocation();
      if (!mounted) return;

      if (result.ok) {
        updateGeoState({
          latitude: result.latitude,
          longitude: result.longitude,
          error: null,
          loading: false,
        });
        return;
      }

      updateGeoState({
        latitude: null,
        longitude: null,
        error: result.reason,
        loading: false,
      });
    }

    void resolveLocation();
    return () => {
      mounted = false;
    };
  }, []);

  return state;
}
