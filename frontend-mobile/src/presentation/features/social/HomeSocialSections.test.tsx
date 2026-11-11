import { fireEvent, render, screen } from "@testing-library/react-native";
import { HomeSocialSections, type HomeSocialSectionsProps } from "./HomeSocialSections";
import type { SuggestedUser, UserReview } from "@/domain/social/social.types";

const mockMutate = jest.fn();
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options && "name" in options ? `${key}:${String(options.name)}` : options && "count" in options ? `${key}:${String(options.count)}` : options && "percent" in options ? `${key}:${String(options.percent)}` : key,
    i18n: { language: "es-AR" },
  }),
}));
jest.mock("@/presentation/providers/ToastProvider", () => ({ useToast: () => ({ showError: jest.fn() }) }));
jest.mock("@/presentation/features/points/NameBadge", () => ({ NameBadge: () => null }));
jest.mock("@/presentation/store/mutationAdapter", () => ({
  useOperationMutation: (factory: (arg: unknown) => unknown) => ({
    mutate: (arg: unknown) => mockMutate(factory(arg)),
    isPending: false,
  }),
}));

const review = (id: string): UserReview => ({
  id,
  rating: 4,
  title: null,
  comment: `Comment ${id}`,
  vintage: null,
  createdAt: new Date("2026-11-01"),
  reviewer: { id: `author-${id}`, username: "bruno", displayName: `Author ${id}`, avatarUrl: null, tier: null },
  wine: { id: `wine-${id}`, name: `Wine ${id}`, imageUrl: null, type: "red", wineryName: null },
});
const suggestion: SuggestedUser = {
  id: "u-9",
  username: "caro",
  displayName: "Caro",
  avatarUrl: null,
  tier: null,
  affinityPercent: 81,
  reviewsCount: 6,
};

function renderSections(overrides: Partial<HomeSocialSectionsProps> = {}) {
  const props: HomeSocialSectionsProps = {
    feed: [review("r-1"), review("r-2")],
    feedLoading: false,
    onRetryFeed: jest.fn(),
    suggestions: [suggestion],
    suggestionsLoading: false,
    onSeeAllFeed: jest.fn(),
    onUserPress: jest.fn(),
    onWinePress: jest.fn(),
    ...overrides,
  };
  render(<HomeSocialSections {...props} />);
  return props;
}

beforeEach(() => jest.clearAllMocks());

it("previews the latest reviews of people the user follows with «Ver todo»", () => {
  const props = renderSections();
  expect(screen.getByText("social.feedTitle")).toBeTruthy();
  expect(screen.getByText("Wine r-1")).toBeTruthy();
  expect(screen.getByText("Wine r-2")).toBeTruthy();
  fireEvent.press(screen.getByLabelText("social.seeAll"));
  expect(props.onSeeAllFeed).toHaveBeenCalled();
  fireEvent.press(screen.getByLabelText("social.openProfileA11y:Author r-1"));
  expect(props.onUserPress).toHaveBeenCalledWith("author-r-1");
});

it("suggests people to follow with a Follow button", () => {
  const props = renderSections();
  expect(screen.getByText("social.suggestionsTitle")).toBeTruthy();
  expect(screen.getByText("Caro")).toBeTruthy();
  expect(screen.getByText("social.suggestionAffinity:81")).toBeTruthy();
  fireEvent.press(screen.getByText("social.follow"));
  expect(mockMutate).toHaveBeenCalledWith({ key: "social.follow", params: { userId: "u-9" } });
  fireEvent.press(screen.getByLabelText("social.openProfileA11y:Caro"));
  expect(props.onUserPress).toHaveBeenCalledWith("u-9");
});

it("keeps each review compact: the wine, its reviewer and two lines of text", () => {
  const props = renderSections();
  const text = screen.getByText("Comment r-1");
  expect(text.props.numberOfLines).toBe(2);
  fireEvent.press(screen.getByText("Wine r-1"));
  expect(props.onWinePress).toHaveBeenCalledWith("wine-r-1");
});

it("shows the affinity chip only when there is one", () => {
  renderSections({ suggestions: [{ ...suggestion, affinityPercent: null }] });
  expect(screen.queryByText(/social\.suggestionAffinity/)).toBeNull();
  expect(screen.getByText("Caro")).toBeTruthy();
});

it("explains an empty feed and hides the suggestions when there are none", () => {
  renderSections({ feed: [], suggestions: [] });
  expect(screen.getByText("social.feedEmptyTitle")).toBeTruthy();
  expect(screen.queryByText("social.suggestionsTitle")).toBeNull();
});

it("shows each reviewer's @username under their name", () => {
  renderSections();
  expect(screen.getByText("Author r-1")).toBeTruthy();
  expect(screen.getAllByText("@bruno")).toHaveLength(2);
});
