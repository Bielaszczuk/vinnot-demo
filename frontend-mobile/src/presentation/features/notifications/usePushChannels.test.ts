import { renderHook } from "@testing-library/react-native";
import { usePushChannels } from "./usePushChannels";
import es from "@/shared/i18n/locales/es-AR.json";
import en from "@/shared/i18n/locales/en-US.json";

const mockT = (key: string) => key;
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: mockT }) }));

it("names every channel in the app language and keeps the same list between renders", () => {
  const view = renderHook(usePushChannels);
  const first = view.result.current;
  view.rerender({});

  expect(view.result.current).toBe(first);
  expect(first[0]).toEqual({
    id: "tickets",
    importance: "high",
    name: "pushNotifications.channels.tickets.name",
    description: "pushNotifications.channels.tickets.description",
  });
  expect(first.map((channel) => channel.id)).toEqual([
    "tickets", "community", "recommendations", "events-nearby", "reminders", "news", "default",
  ]);
});

it("both languages name every channel, tickets as tickets and account", () => {
  expect(Object.keys(es.pushNotifications.channels)).toEqual(Object.keys(en.pushNotifications.channels));
  expect(es.pushNotifications.channels.tickets.name).toBe("Entradas y cuenta");
  expect(en.pushNotifications.channels.tickets.name).toBe("Tickets and account");
  for (const copy of [...Object.values(es.pushNotifications.channels), ...Object.values(en.pushNotifications.channels)]) {
    expect(copy.name.length).toBeGreaterThan(0);
    expect(copy.description.length).toBeGreaterThan(0);
  }
});
