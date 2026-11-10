import { fireEvent, render, screen, within } from "@testing-library/react-native";
import type { SocialPublication } from "@/domain/admin/socialPost";
import { SocialPostPublications, type SocialPostPublicationsProps } from "./SocialPostPublications";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key}:${Object.values(options).map(String).join(",")}` : key,
  }),
}));

const failed: SocialPublication = {
  network: "FACEBOOK",
  status: "FAILED",
  externalId: null,
  permalink: null,
  attempts: 2,
  error: "BRAND_NEW_CODE",
  publishedAt: null,
  metrics: null,
};

function renderList(overrides: Partial<SocialPostPublicationsProps> = {}) {
  const props: SocialPostPublicationsProps = {
    publications: [],
    publishing: null,
    working: false,
    formatDate: (iso) => `date(${iso})`,
    formatNumber: (value) => `n(${value})`,
    onRetry: jest.fn(),
    onOpen: jest.fn(),
    ...overrides,
  };
  render(<SocialPostPublications {...props} />);
  return props;
}

it("tells when no network has a publication yet, with the publishing dates and no post error", () => {
  renderList({ publishing: { startedAt: "s", finishedAt: null, error: null } });

  expect(screen.getByText("admin.socialPosts.publications.none")).toBeTruthy();
  expect(screen.getByText("admin.socialPosts.publications.startedAt:date(s)")).toBeTruthy();
  expect(screen.queryByText(/finishedAt/)).toBeNull();
  expect(screen.queryByRole("alert")).toBeNull();
});

it("shows a TikTok draft with its hint and no link, and an unknown error code as it comes", () => {
  const props = renderList({
    publications: [
      {
        network: "TIKTOK",
        status: "DRAFT_SENT",
        externalId: "tt-1",
        permalink: null,
        attempts: 1,
        error: null,
        publishedAt: "p",
        metrics: { views: null, reach: null, likes: null, comments: null, saves: null, shares: null, follows: null },
      },
      failed,
    ],
  });

  const tiktok = screen.getByTestId("social-publication-TIKTOK");
  expect(within(tiktok).getByText("admin.socialPosts.publications.status.DRAFT_SENT")).toBeTruthy();
  expect(within(tiktok).getByText("admin.socialPosts.publications.draftHint")).toBeTruthy();
  expect(within(tiktok).getByText("admin.socialPosts.publications.publishedAt:date(p)")).toBeTruthy();
  expect(within(tiktok).queryByRole("button")).toBeNull();
  expect(within(tiktok).queryByText(/metrics/)).toBeNull();

  const facebook = screen.getByTestId("social-publication-FACEBOOK");
  expect(within(facebook).getByText("admin.socialPosts.publications.attempts:2")).toBeTruthy();
  expect(
    within(facebook).getByText(
      "admin.socialPosts.publications.error:admin.socialPosts.publications.errors.OTHER:BRAND_NEW_CODE",
    ),
  ).toBeTruthy();
  fireEvent.press(within(facebook).getByRole("button"));
  expect(props.onRetry).toHaveBeenCalledWith("FACEBOOK");
});

it("disables the retry while another action runs", () => {
  const props = renderList({ publications: [failed], working: true });

  fireEvent.press(screen.getByRole("button"));

  expect(props.onRetry).not.toHaveBeenCalled();
});
