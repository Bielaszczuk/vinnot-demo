import { render, screen, within } from "@testing-library/react-native";
import type { SocialAccount } from "@/domain/admin/socialAccount";
import { SocialAccountList } from "./SocialAccountList";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key}:${Object.values(options).map(String).join(",")}` : key,
  }),
}));

const instagram: SocialAccount = {
  network: "INSTAGRAM",
  mode: "CONFIG",
  configured: true,
  connected: true,
  accountId: "1784",
  displayName: null,
  status: "CONNECTED",
  expiresAt: null,
  lastError: null,
};

const tiktok: SocialAccount = {
  network: "TIKTOK",
  mode: "OAUTH",
  configured: false,
  connected: false,
  accountId: null,
  displayName: null,
  status: null,
  expiresAt: "2027-01-01T00:00:00Z",
  lastError: null,
};

it("shows each network's state, account, mode and expiry, with the web admin hint and no action", () => {
  render(
    <SocialAccountList accounts={[instagram, tiktok]} loading={false} failed={false} retry={jest.fn()} formatDate={(iso) => `d(${iso})`} />,
  );

  expect(screen.getByText("admin.socialPosts.accounts.webHint")).toBeTruthy();
  const meta = screen.getByTestId("social-account-INSTAGRAM");
  expect(within(meta).getByText("admin.socialPosts.accounts.state.CONNECTED")).toBeTruthy();
  expect(within(meta).getByText("admin.socialPosts.accounts.account:1784")).toBeTruthy();
  expect(within(meta).getByText("admin.socialPosts.accounts.mode.CONFIG")).toBeTruthy();
  const tik = screen.getByTestId("social-account-TIKTOK");
  expect(within(tik).getByText("admin.socialPosts.accounts.state.NOT_CONFIGURED")).toBeTruthy();
  expect(within(tik).queryByText(/accounts.account/)).toBeNull();
  expect(within(tik).getByText("admin.socialPosts.accounts.expiresAt:d(2027-01-01T00:00:00Z)")).toBeTruthy();
  expect(screen.queryByRole("button")).toBeNull();
});

it("shows the loading, failed and empty states", () => {
  const view = render(<SocialAccountList accounts={[]} loading failed={false} retry={jest.fn()} formatDate={String} />);
  expect(screen.queryByText("admin.socialPosts.accounts.empty")).toBeNull();

  view.rerender(<SocialAccountList accounts={[]} loading={false} failed={false} retry={jest.fn()} formatDate={String} />);
  expect(screen.getByText("admin.socialPosts.accounts.empty")).toBeTruthy();

  view.rerender(<SocialAccountList accounts={[]} loading={false} failed retry={jest.fn()} formatDate={String} />);
  expect(screen.getByText("admin.feedback.loadError")).toBeTruthy();
});
