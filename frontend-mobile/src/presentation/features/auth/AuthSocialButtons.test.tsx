import { fireEvent, render } from "@testing-library/react-native";
import { AuthSocialButtons } from "./AuthSocialButtons";
import { env } from "@/shared/config/env";

jest.mock("@/shared/config/env", () => ({ env: { facebookLoginEnabled: true } }));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe("social authentication availability", () => {
  afterEach(() => {
    env.facebookLoginEnabled = true;
  });

  it("keeps Facebook functional in development", () => {
    const onSocial = jest.fn();
    const screen = render(<AuthSocialButtons isSubmitting={false} onSocial={onSocial} />);
    fireEvent.press(screen.getByLabelText("Facebook"));
    expect(onSocial).toHaveBeenCalledWith("FACEBOOK");
  });

  it("removes unavailable Facebook without blocking the remaining providers", () => {
    env.facebookLoginEnabled = false;
    const onSocial = jest.fn();
    const screen = render(<AuthSocialButtons isSubmitting={false} onSocial={onSocial} />);
    expect(screen.queryByLabelText("Facebook")).toBeNull();
    fireEvent.press(screen.getByLabelText("Google"));
    expect(onSocial).toHaveBeenCalledWith("GOOGLE");
  });
});

it("places the email separator after social providers in registration without changing OAuth", () => {
  const onSocial = jest.fn();
  const screen = render(
    <AuthSocialButtons placement="before-form" isSubmitting={false} onSocial={onSocial} />,
  );
  expect(screen.queryByText("auth.orContinueWith")).toBeNull();
  expect(screen.getByText("auth.orRegisterWithEmail")).toBeTruthy();
  fireEvent.press(screen.getByLabelText("Google"));
  expect(onSocial).toHaveBeenCalledWith("GOOGLE");
  screen.rerender(
    <AuthSocialButtons
      placement="before-form"
      isSubmitting
      busyProvider="GOOGLE"
      onSocial={onSocial}
    />,
  );
  fireEvent.press(screen.getByLabelText("Google"));
  expect(onSocial).toHaveBeenCalledTimes(1);
});

it("offers only the requested providers without separators for identity confirmation", () => {
  const onSocial = jest.fn();
  const screen = render(
    <AuthSocialButtons isSubmitting={false} placement="inline" providers={["GOOGLE"]} onSocial={onSocial} />,
  );
  expect(screen.queryByLabelText("Facebook")).toBeNull();
  expect(screen.queryByLabelText("Apple")).toBeNull();
  expect(screen.queryByText("auth.orContinueWith")).toBeNull();
  fireEvent.press(screen.getByLabelText("Google"));
  expect(onSocial).toHaveBeenCalledWith("GOOGLE");
});
