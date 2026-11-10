import { useAuth } from "@/presentation/hooks/useAuth";
import { useEventDraftRecovery } from "@/presentation/hooks/useEventDraftRecovery";
import { useEffect, useRef, useReducer } from "react";
import { useForm, type FieldErrors } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { ManagedEvent, EventEditorInput } from "@/domain/event/eventManagement.types";
import { validateEventDraft } from "@/domain/event/eventEditor";
import { useGeocoding } from "@/presentation/hooks/useGeocoding";
import { useToast } from "@/presentation/providers/ToastProvider";
import {
  nullable,
  nullableIso,
  numberOrNull,
  toDefaultValues,
  toIso,
  type EventSheetFormValues,
} from "./EventEditor.contracts";

/**
 * Status to send on save: never SOLD_OUT (the server sets it) and nothing when
 * it did not change, so saving a sold-out event no longer fails.
 */
function requestedStatus(status: string, currentStatus?: string | null): string | undefined {
  if (status === "SOLD_OUT" || status === currentStatus) return undefined;
  return status;
}

export function toEventEditorPayload(
  values: EventSheetFormValues,
  currentStatus?: string | null,
): EventEditorInput {
  const status = requestedStatus(values.status, currentStatus);
  return {
    title: values.title.trim(),
    description: nullable(values.description),
    type: values.type,
    ...(status ? { status } : {}),
    startDate: toIso(values.startDate),
    endDate: toIso(values.endDate),
    locationName: nullable(values.locationName),
    locationAddress: nullable(values.locationAddress),
    locationCity: nullable(values.locationCity),
    locationRegion: nullable(values.locationRegion),
    locationCountry: nullable(values.locationCountry),
    latitude: values.latitude,
    longitude: values.longitude,
    price: values.pricingMode === "FREE" ? null : numberOrNull(values.price),
    maxAttendees: numberOrNull(values.maxAttendees),
    currency: values.pricingMode === "FREE" ? "ARS" : values.currency.trim().toUpperCase(),
    registrationDeadline: nullableIso(values.registrationDeadline),
    maxTicketsPerRegistration: Number(values.maxTicketsPerRegistration),
    approvalMode: values.pricingMode === "PAID" ? "AUTOMATIC" : values.approvalMode,
    attendeeConfirmationRequired: values.pricingMode === "PAID" ? false : values.attendeeConfirmationRequired,
    registrationHoldMinutes: Number(values.registrationHoldMinutes),
    imageUrl: nullable(values.imageUrl),
    contactEmail: nullable(values.contactEmail),
    contactPhone: nullable(values.contactPhone),
    websiteUrl: nullable(values.websiteUrl),
  };
}

/** Coordinates draft validation and geocoding. Mutation authorization stays in the caller's use case. */
export function useEventEditor(visible: boolean, event?: ManagedEvent | null) {
  const { user } = useAuth();
  const ownerId = user?.id;
  const { t } = useTranslation();
  const { showError } = useToast();
  const { geocodeAddress } = useGeocoding();
  const [search, dispatchSearch] = useReducer(
    (
      state: { address: string; loading: boolean },
      action: Partial<{ address: string; loading: boolean }>,
    ) => ({ ...state, ...action }),
    { address: "", loading: false },
  );
  const searchAddress = search.address,
    isGeocoding = search.loading;
  const revision = useRef(0);
  const form = useForm<EventSheetFormValues>({
    defaultValues: toDefaultValues(),
    shouldFocusError: false,
    resolver: (values) => {
      const errors: FieldErrors<EventSheetFormValues> = {};
      for (const error of validateEventDraft(values))
        errors[error.field] = {
          type: "validate",
          message: t(`eventEditor.validation.${error.code}`),
        };
      return { values: Object.keys(errors).length ? {} : values, errors };
    },
  });
  const { reset, setValue, getValues, trigger } = form;
  // Set both coordinates before validating: validating after only one of them
  // leaves a stale "pick a valid location" error on the field set first.
  const setCoordinates = (latitude: number, longitude: number) => {
    setValue("latitude", latitude, { shouldDirty: true });
    setValue("longitude", longitude, { shouldDirty: true });
    void trigger(["latitude", "longitude"]);
  };
  const eventSnapshot = useRef(event);
  eventSnapshot.current = event;
  const eventId = event?.id;
  useEffect(() => {
    revision.current += 1;
    dispatchSearch({ loading: false });
    if (visible) {
      reset(toDefaultValues(eventSnapshot.current));
      dispatchSearch({ address: "" });
    }
    return () => {
      revision.current += 1;
    };
  }, [eventId, ownerId, reset, visible]);
  const draft = useEventDraftRecovery(visible, eventId, form);
  const changeSearch = (value: string) => {
    revision.current += 1;
    dispatchSearch({ loading: false });
    dispatchSearch({ address: value });
  };
  const selectLocation = (latitude: number, longitude: number) => {
    revision.current += 1;
    dispatchSearch({ loading: false });
    setCoordinates(latitude, longitude);
  };
  const runGeocode = async () => {
    if (!searchAddress.trim()) {
      showError(t("events.geocodeTypeAddress"));
      return;
    }
    const request = ++revision.current;
    dispatchSearch({ loading: true });
    try {
      const result = await geocodeAddress(searchAddress.trim());
      if (request !== revision.current) return;
      if (!result.ok || !result.location) {
        showError(t("events.locationNotFound"));
        return;
      }
      const location = result.location;
      setCoordinates(location.latitude, location.longitude);
      setValue("locationAddress", location.formattedAddress ?? "", { shouldDirty: true });
      if (location.city) setValue("locationCity", location.city, { shouldDirty: true });
      if (location.region) setValue("locationRegion", location.region, { shouldDirty: true });
      if (location.country) setValue("locationCountry", location.country, { shouldDirty: true });
      if (!getValues("locationName").trim())
        setValue("locationName", searchAddress.trim(), { shouldDirty: true });
    } finally {
      if (request === revision.current) dispatchSearch({ loading: false });
    }
  };
  return { form, draft, searchAddress, changeSearch, isGeocoding, runGeocode, selectLocation };
}
