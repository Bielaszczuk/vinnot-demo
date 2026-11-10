import { act, renderHook } from "@testing-library/react";
import { expect, it } from "vitest";
import { useEventRegistrationForm } from "./useEventRegistrationForm";
import type { Event } from "@domain/event/event.types";

const event = (
  overrides: Partial<Event["registration"]> = {},
  price: number | null = null,
) =>
  ({
    price,
    availableSpots: 0,
    registration: {
      maxTicketsPerRegistration: 4,
      approvalMode: "AUTOMATIC",
      attendeeConfirmationRequired: false,
      ...overrides,
    },
  }) as Event;
const defaults = {
  name: " Guest ",
  email: " guest@example.com ",
  phone: "+5491123456789",
};

it("prefills a remembered phone checked and locked until the user asks to change it", () => {
  const { result } = renderHook(() =>
    useEventRegistrationForm(event(), defaults),
  );
  expect(result.current.contactPhone).toBe(defaults.phone);
  expect(result.current.saveContactPhone).toBe(true);
  expect(result.current.phoneLocked).toBe(true);
  let input: ReturnType<typeof result.current.buildInput>;
  act(() => {
    input = result.current.buildInput();
  });
  expect(input!).toMatchObject({
    contactName: "Guest",
    contactEmail: "guest@example.com",
    saveContactPhone: true,
    paymentMethod: "FREE",
  });
  act(() => {
    result.current.setContactPhone("+1 415 555 2671");
    result.current.setSaveContactPhone(true);
  });
  act(() => {
    input = result.current.buildInput();
  });
  expect(input!).toMatchObject({
    contactPhone: "+1 415 555 2671",
    saveContactPhone: true,
  });
});
it("uses current account identity and validates the editable phone", () => {
  const { result, rerender } = renderHook(({name,email}) =>
    useEventRegistrationForm(event(), {name,email,phone:""}), {initialProps:{name:"",email:""}});
  act(() => { expect(result.current.buildInput()).toBeNull(); });
  expect(result.current.error).toBe("name");
  rerender({name:"Guest",email:""});
  act(() => { expect(result.current.buildInput()).toBeNull(); });
  expect(result.current.error).toBe("email");
  rerender({name:"Guest",email:"guest@example.com"});
  act(() => { expect(result.current.buildInput()).toBeNull(); });
  expect(result.current.error).toBe("phone");
  act(() => result.current.setContactPhone("+5491123456789"));
  act(() => { expect(result.current.buildInput()).toMatchObject({contactName:"Guest",contactEmail:"guest@example.com"}); });
  expect(result.current.error).toBeNull();
});
it("permits waitlisting a complete group while enforcing the organizer limit", () => {
  const { result } = renderHook(() =>
    useEventRegistrationForm(event(), defaults),
  );
  act(() => result.current.updateAttendeeCount(30));
  expect(result.current.attendeeCount).toBe(4);
  act(() => result.current.updateAttendeeCount(2));
  act(() => {
    const input = result.current.buildInput();
    expect(input?.attendeeCount).toBe(2);
    expect(input).not.toHaveProperty("companionNames");
    expect(input).not.toHaveProperty("note");
  });
  act(() => result.current.updateAttendeeCount(Number.NaN));
  expect(result.current.attendeeCount).toBe(1);
});
it.each([
  ["MANUAL", false, null, "manualNotice"],
  ["AUTOMATIC", false, null, "automaticNotice"],
  ["AUTOMATIC", true, 0, "holdNotice"],
  ["AUTOMATIC", false, 100, "paidNotice"],
] as const)(
  "describes %s / confirmation %s / price %s truthfully",
  (approvalMode, attendeeConfirmationRequired, price, notice) => {
    const { result } = renderHook(() =>
      useEventRegistrationForm(
        event({ approvalMode, attendeeConfirmationRequired }, price),
        defaults,
      ),
    );
    expect(result.current.notice).toBe(notice);
  },
);

it("starts unchecked and editable when no phone was remembered, and unlocks a remembered phone on change", () => {
  const { result } = renderHook(() => useEventRegistrationForm(event(), { ...defaults, phone: null }));
  expect(result.current.saveContactPhone).toBe(false);
  expect(result.current.phoneLocked).toBe(false);

  const remembered = renderHook(() => useEventRegistrationForm(event(), defaults));
  act(() => remembered.result.current.unlockPhone());
  expect(remembered.result.current.phoneLocked).toBe(false);
  expect(remembered.result.current.saveContactPhone).toBe(true);
  act(() => remembered.result.current.setContactPhone("+5491198765432"));
  expect(remembered.result.current.contactPhone).toBe("+5491198765432");
});

it("counts only changes made in the dialog as an unsaved draft", () => {
  const { result } = renderHook(() => useEventRegistrationForm(event(), defaults));
  expect(result.current.isDirty).toBe(false);
  act(() => result.current.updateAttendeeCount(2));
  expect(result.current.isDirty).toBe(true);
  act(() => result.current.updateAttendeeCount(1));
  act(() => result.current.setContactPhone("+14155552671"));
  expect(result.current.isDirty).toBe(true);
  act(() => result.current.setContactPhone(defaults.phone));
  act(() => result.current.setSaveContactPhone(false));
  expect(result.current.isDirty).toBe(true);
});

it("treats an empty profile phone as the starting value", () => {
  const { result } = renderHook(() => useEventRegistrationForm(event(), { ...defaults, phone: null }));
  expect(result.current.isDirty).toBe(false);
});
