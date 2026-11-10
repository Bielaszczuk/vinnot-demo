import { fireEvent, render, screen, within } from "@testing-library/react-native";
import type { AdminContentPillar } from "@/domain/admin/socialPost";
import { SocialPillarList, type SocialPillarListProps } from "./SocialPillarList";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key}:${Object.values(options).map(String).join(",")}` : key,
  }),
}));

const humor: AdminContentPillar = {
  code: "HUMOR",
  nameEs: "Humor",
  nameEn: "Humour",
  weight: 1,
  active: false,
  autoApprove: false,
  performance: { measuredPosts: 1, views: 50, interactions: 2, factor: 1 },
};

function renderList(overrides: Partial<SocialPillarListProps> = {}) {
  const props: SocialPillarListProps = {
    pillars: [humor],
    language: "en",
    loading: false,
    failed: false,
    retry: jest.fn(),
    switching: null,
    onToggle: jest.fn(),
    formatNumber: (value) => String(value),
    ...overrides,
  };
  const view = render(<SocialPillarList {...props} />);
  return { props, view };
}

it("shows a pillar in the app language, neutral below three measured posts, auto-approval locked while inactive", () => {
  const { props } = renderList();

  const pillar = screen.getByTestId("social-pillar-HUMOR");
  expect(within(pillar).getByText("Humour")).toBeTruthy();
  expect(within(pillar).getByText("admin.socialPosts.pillars.weight:1")).toBeTruthy();
  expect(within(pillar).getByText("admin.socialPosts.pillars.performance:1,50,2")).toBeTruthy();
  expect(within(pillar).getByText("admin.socialPosts.pillars.factor:×1.00")).toBeTruthy();
  expect(within(pillar).getByText("admin.socialPosts.pillars.neutral")).toBeTruthy();
  expect(within(pillar).getByText("admin.socialPosts.pillars.autoApproveInactive")).toBeTruthy();

  fireEvent.press(screen.getByTestId("social-pillar-HUMOR-autoApprove"));
  expect(props.onToggle).not.toHaveBeenCalled();

  fireEvent.press(screen.getByTestId("social-pillar-HUMOR-active"));
  expect(props.onToggle).toHaveBeenCalledWith(humor, "active");
});

it("locks every switch while one pillar is being switched", () => {
  const { props } = renderList({ pillars: [{ ...humor, active: true }], switching: "OTHER" });

  fireEvent.press(screen.getByTestId("social-pillar-HUMOR-active"));
  fireEvent.press(screen.getByTestId("social-pillar-HUMOR-autoApprove"));

  expect(props.onToggle).not.toHaveBeenCalled();
  expect(screen.queryByText("admin.socialPosts.pillars.autoApproveInactive")).toBeNull();
});

it("shows the loading, failed and empty states", () => {
  const { view } = renderList({ loading: true });
  expect(screen.queryByTestId("social-pillar-HUMOR")).toBeNull();

  view.rerender(
    <SocialPillarList
      pillars={[]}
      language="es"
      loading={false}
      failed={false}
      retry={jest.fn()}
      switching={null}
      onToggle={jest.fn()}
      formatNumber={String}
    />,
  );
  expect(screen.getByText("admin.socialPosts.pillars.empty")).toBeTruthy();

  view.rerender(
    <SocialPillarList
      pillars={[]}
      language="es"
      loading={false}
      failed
      retry={jest.fn()}
      switching={null}
      onToggle={jest.fn()}
      formatNumber={String}
    />,
  );
  expect(screen.getByText("admin.feedback.loadError")).toBeTruthy();
});
