import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import en from "@i18n/locales/en-US.json";
import { EventRegistrationModal } from "./EventRegistrationModal";
import { ConfirmProvider } from "@app/providers/ConfirmProvider";
import { ConfirmDialog } from "@components/feedback/ConfirmDialog";
import type { Event } from "@domain/event/event.types";

async function mount(overrides: Partial<Event> = {}, onClose = vi.fn(), isSubmitting = false) {
  const i18n = createInstance();
  await i18n
    .use(initReactI18next)
    .init({ lng: "en-US", resources: { "en-US": { translation: en } } });
  const submit = vi.fn().mockResolvedValue(undefined);
  const event = {
    title: "Harvest tasting",
    price: null,
    registration: {
      approvalMode: "MANUAL",
      maxTicketsPerRegistration: 4,
      holdMinutes: 30,
    },
    ...overrides,
  } as Event;
  render(
    <MemoryRouter>
      <I18nextProvider i18n={i18n}>
        <ConfirmProvider>
        <EventRegistrationModal
          event={event}
          isOpen
          isSubmitting={isSubmitting}
          defaultName="Guest"
          defaultEmail="guest@example.com"
          defaultPhone="+5491123456789"
          onClose={onClose}
          onSubmit={submit}
        />
        <ConfirmDialog />
        </ConfirmProvider>
      </I18nextProvider>
    </MemoryRouter>,
  );
  return submit;
}
it("keeps a remembered phone checked and locked until the user chooses to change it", async () => {
  const submit = await mount();
  expect(screen.getByText(en.eventBooking.manualNotice)).toBeVisible();
  expect(screen.getByRole("checkbox")).toBeChecked();
  expect(screen.getByLabelText(en.contactPhone.label)).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: en.contactPhone.change }));
  expect(screen.getByLabelText(en.contactPhone.label)).toBeEnabled();
  expect(screen.queryByRole("button", { name: en.contactPhone.change })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(en.contactPhone.label), {
    target: { value: "+1 415 555 2671" },
  });
  fireEvent.click(screen.getByRole("button", { name: en.eventBooking.submit }));
  expect(submit).toHaveBeenCalledWith(
    expect.objectContaining({
      contactPhone: "+14155552671",
      saveContactPhone: true,
    }),
  );
});
it("keeps invalid phone feedback in human language without submitting", async () => {
  const submit = await mount();
  fireEvent.click(screen.getByRole("button", { name: en.contactPhone.change }));
  fireEvent.change(screen.getByLabelText(en.contactPhone.label), {
    target: { value: "123" },
  });
  fireEvent.click(screen.getByRole("button", { name: en.eventBooking.submit }));
  expect(screen.getByRole("alert")).toHaveTextContent(en.contactPhone.invalid);
  expect(submit).not.toHaveBeenCalled();
});

it("uses account identity, a bounded selector and no companion/message fields", async () => {
  const submit = await mount();
  const quantity = screen.getByRole("combobox", { name: new RegExp(en.eventBooking.quantity) });
  expect(within(quantity).getAllByRole("option")).toHaveLength(4);
  expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
  expect(screen.queryByLabelText(en.eventBooking.name)).not.toBeInTheDocument();
  expect(screen.queryByLabelText(en.eventBooking.email)).not.toBeInTheDocument();
  expect(screen.queryByLabelText(en.eventBooking.note)).not.toBeInTheDocument();
  expect(screen.getByText("Guest")).toBeVisible();
  expect(screen.getByText("guest@example.com")).toBeVisible();
  fireEvent.change(quantity,{target:{value:"4"}});
  fireEvent.click(screen.getByRole("button",{name:en.eventBooking.submit}));
  expect(submit).toHaveBeenCalledWith(expect.objectContaining({attendeeCount:4,contactName:"Guest",contactEmail:"guest@example.com"}));
  expect(submit.mock.calls[0]?.[0]).not.toHaveProperty("companionNames");
  expect(submit.mock.calls[0]?.[0]).not.toHaveProperty("note");
});
it("hides conditions for unlimited free registration without a reservation deadline", async () => {
  await mount({maxAttendees:null,registration:{approvalMode:"AUTOMATIC",attendeeConfirmationRequired:false,maxTicketsPerRegistration:4,holdMinutes:45,deadline:null} as Event["registration"]});
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
});
it("uses the organizer reservation minutes and shows conditions for a timed hold", async () => {
  await mount({registration:{approvalMode:"AUTOMATIC",attendeeConfirmationRequired:true,maxTicketsPerRegistration:4,holdMinutes:45} as Event["registration"]});
  expect(screen.getByText(en.eventBooking.holdNotice.replace("{{minutes}}","45"))).toBeVisible();
  expect(screen.getByRole("link",{name:en.eventBooking.conditions})).toBeVisible();
});

it("uses the organizer deadline for paid reservations", async () => {
  await mount({ price: 10000, registration: { approvalMode: "AUTOMATIC", maxTicketsPerRegistration: 4, holdMinutes: 45 } as Event["registration"] });
  expect(screen.getByText(en.eventBooking.paidNotice.replace("{{minutes}}", "45"))).toBeVisible();
});
it("confirms the registration directly when the organizer approves automatically", async () => {
  await mount({
    registration: { approvalMode: "AUTOMATIC", maxTicketsPerRegistration: 4, holdMinutes: 30 },
  } as Partial<Event>);
  expect(screen.getByRole("dialog", { name: "Register for Harvest tasting" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Confirm registration" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: en.eventBooking.submit })).toBeNull();
});
it("keeps the request label for manual approval", async () => {
  await mount();
  expect(screen.getByRole("button", { name: "Send request" })).toBeInTheDocument();
});

describe("closing with a draft", () => {
  it("closes directly when nothing changed", async () => {
    const onClose = vi.fn();
    await mount({}, onClose);
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });

  it("asks before discarding a changed form, on Escape and on Cancel", async () => {
    const onClose = vi.fn();
    await mount({}, onClose);
    fireEvent.change(screen.getByRole("combobox", { name: new RegExp(en.eventBooking.quantity) }), { target: { value: "3" } });
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(await screen.findByRole("button", { name: en.common.keepEditing }));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("combobox", { name: new RegExp(en.eventBooking.quantity) })).toHaveValue("3");
    fireEvent.click(screen.getByRole("button", { name: en.common.cancel }));
    fireEvent.click(await screen.findByRole("button", { name: en.common.discardChanges }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });

  it("cannot be closed while the registration is being sent", async () => {
    const onClose = vi.fn();
    await mount({}, onClose, true);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByRole("button", { name: en.common.cancel })).toBeDisabled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
it("shows the estimated total as a price in the event currency for the chosen quantity", async () => {
  await mount({ price: 1500, registration: { approvalMode: "AUTOMATIC", maxTicketsPerRegistration: 4, holdMinutes: 30, currency: "USD" } as Event["registration"] });
  fireEvent.change(screen.getByRole("combobox", { name: new RegExp(en.eventBooking.quantity) }), { target: { value: "2" } });
  expect(screen.getByText("Estimated total: $3,000")).toBeInTheDocument();
  expect(screen.getByRole("combobox", { name: new RegExp(en.eventBooking.quantity) })).toHaveAccessibleDescription(en.eventBooking.maximum.replace("{{count}}", "4"));
});
