import { useTranslation } from "react-i18next";
import { useState } from "react";
import { isInternationalPhoneInput } from "@domain/user/contactPhone";
import { registrationSubmitLabelKey } from "@domain/event/eventRegistrationFeedback";
import type { Event, RegisterForEventInput } from "@domain/event/event.types";

export function useEventRegistrationForm(
  event: Event,
  defaults: { name: string; email: string; phone?: string | null },
) {
  const { i18n } = useTranslation();
  const [attendeeCount, setAttendeeCount] = useState(1);
  const contactName = defaults.name;
  const contactEmail = defaults.email;
  // A saved phone means the user chose to remember it: keep the choice and lock the field until they change it.
  const rememberedPhone = Boolean(defaults.phone?.trim());
  const [contactPhone, setContactPhone] = useState(defaults.phone ?? "");
  const [saveContactPhone, setSaveContactPhone] = useState(rememberedPhone);
  const [phoneLocked, setPhoneLocked] = useState(rememberedPhone);
  const [error, setError] = useState<"name" | "email" | "phone" | null>(null);
  const maxTickets = Math.min(
    20,
    Math.max(1, event.registration.maxTicketsPerRegistration),
  );
  const updateAttendeeCount = (next: number) => {
    const count = Number.isFinite(next)
      ? Math.min(maxTickets, Math.max(1, Math.floor(next)))
      : 1;
    setAttendeeCount(count);
  };
  const buildInput = (): RegisterForEventInput | null => {
    if (!contactName.trim()) {
      setError("name");
      return null;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
      setError("email");
      return null;
    }
    if (!isInternationalPhoneInput(contactPhone)) {
      setError("phone");
      return null;
    }
    setError(null);
    return {
      attendeeCount,
      contactName: contactName.trim(),
      contactEmail: contactEmail.trim(),
      contactPhone: contactPhone.trim(),
      saveContactPhone,
      notificationLanguage: i18n.language?.startsWith("en") ? "en" : "es",
      paymentMethod: event.price ? "MERCADO_PAGO" : "FREE",
    };
  };
  const notice = event.price
    ? "paidNotice"
    : event.registration.approvalMode === "MANUAL"
      ? "manualNotice"
      : event.registration.attendeeConfirmationRequired
        ? "holdNotice"
        : "automaticNotice";
  // Contact name and email come from the profile; only what the person changed here counts as a draft.
  const isDirty = attendeeCount !== 1
    || contactPhone !== (defaults.phone ?? "")
    || saveContactPhone !== rememberedPhone;
  const showConditions = Boolean(event.price || event.maxAttendees || event.registration.deadline
    || event.registration.attendeeConfirmationRequired);
  return {
    isDirty,
    showConditions,
    attendeeCount,
    updateAttendeeCount,
    maxTickets,
    contactName,
    contactEmail,
    contactPhone,
    setContactPhone,
    saveContactPhone,
    setSaveContactPhone,
    phoneLocked,
    unlockPhone: () => setPhoneLocked(false),
    error,
    buildInput,
    notice,
    submitLabelKey: registrationSubmitLabelKey(event),
  };
}
