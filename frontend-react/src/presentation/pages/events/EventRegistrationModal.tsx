import { PhoneNumberField } from "@components/ui/PhoneNumberField";
import { useTranslation } from "react-i18next";
import { Modal } from "@components/ui/Modal";
import { Button } from "@components/ui/Button";
import { LinkButton } from "@components/ui/LinkButton";
import { Select } from "@components/ui/Select";
import { formatPrice } from "@utils/format";
import { useDiscardGuard } from "@hooks/useDiscardGuard";
import type { Event, RegisterForEventInput } from "@domain/event/event.types";
import { useEventRegistrationForm } from "./useEventRegistrationForm";

interface EventRegistrationModalProps {
  event: Event;
  isOpen: boolean;
  isSubmitting: boolean;
  defaultName: string;
  defaultEmail: string;
  defaultPhone?: string | null;
  onClose: () => void;
  onSubmit: (input: RegisterForEventInput) => Promise<void>;
}

export function EventRegistrationModal({
  event,
  isOpen,
  isSubmitting,
  defaultName,
  defaultEmail,
  defaultPhone,
  onClose,
  onSubmit,
}: EventRegistrationModalProps) {
  const { t, i18n } = useTranslation();
  const form = useEventRegistrationForm(event, {
    name: defaultName,
    email: defaultEmail,
    phone: defaultPhone,
  });
  const requestClose = useDiscardGuard({ dirty: form.isDirty, busy: isSubmitting, onClose });
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => void requestClose()}
      closeOnBackdrop={false}
      title={t("eventBooking.title", { title: event.title })}
      size="md"
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (isSubmitting) return;
          const input = form.buildInput();
          if (input) void onSubmit(input);
        }}
      >
        <p className="text-sm text-gray-600">
          {t(`eventBooking.${form.notice}`, {
            minutes: event.registration.holdMinutes,
          })}
        </p>
        <Select
          id="event-registration-quantity"
          label={t("eventBooking.quantity")}
          hint={t("eventBooking.maximum", { count: form.maxTickets })}
          value={form.attendeeCount}
          onChange={(e) => form.updateAttendeeCount(Number(e.target.value))}
          disabled={isSubmitting}
          options={Array.from({ length: form.maxTickets }, (_, index) => {
            const count = String(index + 1);
            return { value: count, label: count };
          })}
        />
        <div className="rounded-xl bg-wine-50 px-4 py-3 text-sm text-gray-700">
          <p className="font-semibold text-ink">{form.contactName}</p>
          <p className="break-all text-gray-600">{form.contactEmail}</p>
        </div>
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <PhoneNumberField value={form.contactPhone} onChange={form.setContactPhone} disabled={isSubmitting || form.phoneLocked} />
          </div>
          {form.phoneLocked ? (
            <Button type="button" variant="secondary" onClick={form.unlockPhone} disabled={isSubmitting} className="shrink-0">
              {t("contactPhone.change")}
            </Button>
          ) : null}
        </div>
        <label className="flex items-start gap-3 text-sm text-gray-700">
          <input
            className="mt-1 accent-wine-700"
            type="checkbox"
            checked={form.saveContactPhone}
            onChange={(e) => form.setSaveContactPhone(e.target.checked)}
          />
          {t("contactPhone.remember")}
        </label>
        <p className="text-xs leading-relaxed text-gray-500">
          {t("eventBooking.privacy")}
        </p>
        {form.error && (
          <p role="alert" className="text-sm text-danger">
            {t(
              form.error === "phone"
                ? "contactPhone.invalid"
                : "eventBooking.incompleteAccount",
            )}
          </p>
        )}
        {event.price ? (
          <div className="rounded-xl bg-wine-50 p-3 text-sm text-wine-900">
            {t("eventBooking.total", {
              amount: formatPrice(event.price * form.attendeeCount, event.registration.currency, i18n.language),
            })}
          </div>
        ) : null}
        {form.showConditions && (
          <LinkButton to="/legal/payments" target="_blank" rel="noopener noreferrer" variant="link">
            {t(event.price ? "eventBooking.terms" : "eventBooking.conditions")}
          </LinkButton>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => void requestClose()}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" isLoading={isSubmitting} className="min-w-32">
            {t(form.submitLabelKey)}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
