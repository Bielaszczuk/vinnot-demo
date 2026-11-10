import { render, screen } from "@testing-library/react-native";
import { RefreshControl, ScrollView } from "react-native";
import { BrandRefreshControl } from "./BrandRefreshControl";
import { lightTokens } from "@/shared/theme/tokens";

it("tints the pull-to-refresh spinner with the brand on iOS and Android", () => {
  const onRefresh = jest.fn();
  render(<ScrollView refreshControl={<BrandRefreshControl refreshing onRefresh={onRefresh} />} />);
  const control = screen.UNSAFE_getByType(RefreshControl);
  expect(control.props.refreshing).toBe(true);
  expect(control.props.onRefresh).toBe(onRefresh);
  expect(control.props.tintColor).toBe(lightTokens.brandPrimary);
  expect(control.props.colors).toEqual([lightTokens.brandPrimary]);
  expect(control.props.progressBackgroundColor).toBe(lightTokens.surfaceDefault);
});
