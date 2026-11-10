import { render, screen } from "@testing-library/react-native";
import type { PartnerEvent } from "@/domain/partner/partner.types";
import { PartnerEventRow } from "./PartnerEventRow";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "es-AR", resolvedLanguage: "es-AR" } }),
}));
jest.mock("@/presentation/components/ui/MotionPressable", () => ({
  MotionPressable: jest.requireActual("react-native").Pressable,
}));

const item = (overrides: Partial<PartnerEvent> = {}) =>
  ({ id: "event", title: "Tasting", status: "PUBLISHED", startDate: "2030-01-01T20:00:00Z",
    price: 1500, currency: "ARS", currentAttendees: 0, maxAttendees: null, locationName: null,
    locationCity: null, locationRegion: null, ...overrides }) as PartnerEvent;
const handlers = { onManageRegistrations: jest.fn(), onEdit: jest.fn(), onDelete: jest.fn() };

it("formats the price with the event currency", () => {
  render(<PartnerEventRow item={item({ currency: "USD", price: 1500.5 })} {...handlers} />);
  const expected = new Intl.NumberFormat("es-AR", { style: "currency", currency: "USD" }).format(1500.5)
    .replace(/\s+/g, " ");
  expect(screen.getByText(new RegExp(expected.replace(/[.$]/g, "\\$&")))).toBeTruthy();
});

it("keeps showing free events as free", () => {
  render(<PartnerEventRow item={item({ price: 0 })} {...handlers} />);
  expect(screen.getByText(/events\.free/)).toBeTruthy();
});

it("shows a pending cue and blocks a second tap while the event opens for editing", () => {
  render(<PartnerEventRow item={item()} {...handlers} editPending />);
  const edit = screen.getByRole("button", { name: "partner.editEvent" });
  expect(edit.props.accessibilityState).toMatchObject({ busy: true, disabled: true });
  expect(screen.getByTestId("partner-edit-pending")).toBeTruthy();
});

it("keeps the edit icon when nothing is loading", () => {
  render(<PartnerEventRow item={item()} {...handlers} />);
  expect(screen.queryByTestId("partner-edit-pending")).toBeNull();
});
