import React from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import EventsScreen from "../../../../../app/(app)/(tabs)/events/index";
import type { Event } from "@/domain/event/event.types";
import { vinnotColors } from "@/shared/theme/vinnotTheme";

const mockPush = jest.fn();
type MockGeolocation = {
  latitude: number | null;
  longitude: number | null;
  loading: boolean;
  error: string | null;
};
const locatedUser: MockGeolocation = { latitude: -32.8895, longitude: -68.8458, loading: false, error: null };
let mockGeolocation: MockGeolocation = locatedUser;

const mockEvent: Event = {
  id: "evt-1",
  title: "Cata de Malbec",
  description: "Evento test",
  type: "TASTING",
  startDate: new Date("2026-06-10T18:00:00.000Z"),
  endDate: new Date("2026-06-10T20:00:00.000Z"),
  location: {
    name: "Bodega Norte",
    address: "Ruta 40",
    city: "Mendoza",
    region: "Mendoza",
    country: "Argentina",
    latitude: -32.8895,
    longitude: -68.8458,
  },
  organizer: {
    id: "org-1",
    name: "Bodega Norte",
    email: "bodega@vinnot.com",
    phone: null,
  },
  imageUrl: null,
  mapEmbedUrl: null,
  price: null,
  maxAttendees: null,
  currentAttendees: 12,
  heldAttendees: 0,
  availableSpots: null,
  registration: {
    currency: "ARS",
    deadline: null,
    maxTicketsPerRegistration: 6,
    approvalMode: "MANUAL",
    attendeeConfirmationRequired: true,
    holdMinutes: 60,
    paymentAlias: null,
    paymentQrUrl: null,
    paymentInstructions: null,
  },
  tags: [],
  status: "PUBLISHED",
  distanceKm: null,
  isAvailable: true,
  createdAt: new Date("2026-05-30T10:00:00.000Z"),
  updatedAt: new Date("2026-05-30T10:00:00.000Z"),
};

const mockUseEvents = jest.fn((_filter?: unknown, _page?: number, _pageSize?: number) => ({
  data: { events: [mockEvent], pagination: { totalItems: 1 } },
  isLoading: false,
  isFetching: false,
  refetch: jest.fn(),
}));

const mockUseDiscoverEvents = jest.fn((_params?: unknown, _enabled?: boolean) => ({
  data: {
    nearbyEventsFound: true,
    nearbyEvents: [mockEvent],
    otherEvents: [],
    pagination: { totalItems: 1 },
  },
  isLoading: false,
  isFetching: false,
  refetch: jest.fn(),
}));

const mockUseNearbyEvents = jest.fn((_params?: unknown, _enabled?: boolean) => ({
  data: { events: [mockEvent], pagination: { totalItems: 1 } },
  isLoading: false,
  isFetching: false,
  refetch: jest.fn(),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock("@/presentation/hooks/ui", () => ({
  useDebounce: (value: string) => value,
  useGeolocation: () => mockGeolocation,
}));

jest.mock("@/presentation/hooks/queries/event", () => ({
  useEvents: (filter?: unknown, page?: number, pageSize?: number) =>
    mockUseEvents(filter, page, pageSize),
  useDiscoverEvents: (params?: unknown, enabled?: boolean) =>
    mockUseDiscoverEvents(params, enabled),
  useNearbyEvents: (params?: unknown, enabled?: boolean) =>
    mockUseNearbyEvents(params, enabled),
}));

jest.mock("@/presentation/features/event/useEventAreaFilter", () => ({
  useEventAreaFilter: () => ({
    query: "",
    setQuery: jest.fn(),
    selection: null,
    searchArea: jest.fn(),
    clearArea: jest.fn(),
    isSearching: false,
    error: null,
  }),
}));

jest.mock("@/presentation/hooks/queries/wine", () => ({
  useCountries: () => ({ data: [{ id: "ar", name: "Argentina", code: "AR" }] }),
  useRegions: () => ({ data: [{ id: "mdz", name: "Mendoza", countryId: "ar" }] }),
}));

jest.mock("@shopify/flash-list", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  return {
    FlashList: ({
      data,
      renderItem,
      ListHeaderComponent,
      ListEmptyComponent,
    }: {
      data: Event[];
      renderItem: ({ item }: { item: Event }) => React.ReactNode;
      ListHeaderComponent?: React.ReactNode;
      ListEmptyComponent?: React.ReactNode;
    }) =>
      mockReact.createElement(
        "View",
        null,
        ListHeaderComponent ?? null,
        data.length === 0
          ? (ListEmptyComponent ?? null)
          : data.map((item) =>
              mockReact.createElement("View", { key: item.id }, renderItem({ item })),
            ),
      ),
  };
});

const mockAnimateToRegion = jest.fn();
jest.mock("react-native-maps", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  // Like Apple Maps, the mock only moves the camera through the imperative API.
  const MockMapView = mockReact.forwardRef(
    (
      { children, onMapReady }: { children?: React.ReactNode; onMapReady?: () => void },
      ref: React.Ref<unknown>,
    ) => {
      mockReact.useImperativeHandle(ref, () => ({ animateToRegion: mockAnimateToRegion }));
      mockReact.useEffect(() => onMapReady?.(), [onMapReady]);
      return mockReact.createElement("View", null, children);
    },
  );
  return { __esModule: true, default: MockMapView, Marker: () => null };
});

jest.mock("@/presentation/components/ui/Feedback", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  return {
    EmptyState: () => mockReact.createElement("Text", null, "empty"),
    Skeleton: () => mockReact.createElement("Text", null, "skeleton"),
  };
});

jest.mock("@/presentation/components/ui/TextField", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  return {
    SearchField: ({ onChangeText }: { onChangeText: (value: string) => void }) =>
      mockReact.createElement(
        "Text",
        { testID: "search-input", onPress: () => onChangeText("malbec") },
        "search",
      ),
  };
});

jest.mock("@/presentation/features/event", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  return {
    EVENT_TYPE_OPTIONS: [{ value: "TASTING" }],
    EventCard: ({ event, onPress }: { event: Event; onPress: () => void }) =>
      mockReact.createElement("Text", { testID: `event-${event.id}`, onPress }, event.title),
  };
});

describe("events tab route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGeolocation = locatedUser;
  });

  it("renders nearby event and navigates to details on press", () => {
    const screen = render(<EventsScreen />);

    expect(screen.getByText("Cata de Malbec")).toBeTruthy();
    expect(mockUseEvents).toHaveBeenCalledWith(undefined, 0, 50);
    expect(mockUseDiscoverEvents).toHaveBeenCalledWith(
      {
        latitude: -32.8895,
        longitude: -68.8458,
        radiusKm: 100,
        page: 0,
        pageSize: 50,
      },
      true,
    );

    fireEvent.press(screen.getByTestId("event-evt-1"));
    expect(mockPush).toHaveBeenCalledWith("/(app)/(tabs)/events/evt-1");
  });

  it("moves the map camera close to the person's location", () => {
    render(<EventsScreen />);

    expect(mockAnimateToRegion).toHaveBeenLastCalledWith(
      { latitude: -32.8895, longitude: -68.8458, latitudeDelta: 0.3, longitudeDelta: 0.3 },
      expect.any(Number),
    );
  });

  it.each([
    ["permission_denied", "events.locationDenied"],
    ["location_unavailable", "events.locationError"],
  ])("shows a neutral notice when location fails with %s", (reason, key) => {
    mockGeolocation = { latitude: null, longitude: null, loading: false, error: reason };
    const screen = render(<EventsScreen />);

    const notice = screen.getByTestId("events-location-notice");
    expect(notice).toHaveTextContent(`${key}. events.showingAll.`);
    expect(notice).toHaveStyle({ color: vinnotColors.muted });
    expect(notice).not.toHaveStyle({ color: vinnotColors.danger });
  });

  it("shows no location notice when the location is known", () => {
    const screen = render(<EventsScreen />);

    expect(screen.queryByTestId("events-location-notice")).toBeNull();
  });

  it("says no events are nearby in the app language, not with the server text", () => {
    const original = mockUseDiscoverEvents.getMockImplementation();
    mockUseDiscoverEvents.mockImplementation(() => ({
      data: {
        nearbyEventsFound: false,
        nearbyEvents: [],
        otherEvents: [mockEvent],
        pagination: { totalItems: 1 },
        message: "No encontramos eventos cerca de tu zona actualmente.",
      } as never,
      isLoading: false,
      isFetching: false,
      refetch: jest.fn(),
    }));
    try {
      const screen = render(<EventsScreen />);

      expect(screen.getByText("events.discoveryFallbackTitle")).toBeTruthy();
      expect(screen.queryByText("No encontramos eventos cerca de tu zona actualmente.")).toBeNull();
    } finally {
      if (original) mockUseDiscoverEvents.mockImplementation(original);
    }
  });

  it("leaves the no-nearby notice out when there are no other events to show", () => {
    const original = mockUseDiscoverEvents.getMockImplementation();
    mockUseDiscoverEvents.mockImplementation(() => ({
      data: { nearbyEventsFound: false, nearbyEvents: [], otherEvents: [], pagination: { totalItems: 0 } },
      isLoading: false,
      isFetching: false,
      refetch: jest.fn(),
    }));
    try {
      const screen = render(<EventsScreen />);

      expect(screen.queryByText("events.discoveryFallbackTitle")).toBeNull();
      expect(screen.getByText("empty")).toBeTruthy();
    } finally {
      if (original) mockUseDiscoverEvents.mockImplementation(original);
    }
  });

  it("explains the empty list map in terms of the list, not a single event", () => {
    mockGeolocation = { latitude: null, longitude: null, loading: false, error: null };
    const original = mockUseEvents.getMockImplementation();
    mockUseEvents.mockImplementation(() => ({
      data: { events: [], pagination: { totalItems: 0 } },
      isLoading: false,
      isFetching: false,
      refetch: jest.fn(),
    }));
    try {
      const screen = render(<EventsScreen />);

      expect(screen.getByText("events.mapListUnavailableDesc")).toBeTruthy();
      expect(screen.queryByText("events.mapUnavailableDesc")).toBeNull();
    } finally {
      if (original) mockUseEvents.mockImplementation(original);
    }
  });
});
