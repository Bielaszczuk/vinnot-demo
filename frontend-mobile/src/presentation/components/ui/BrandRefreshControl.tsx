/** BrandRefreshControl — pull to refresh with the brand spinner on iOS and Android. */
import { RefreshControl, type RefreshControlProps } from "react-native";
import { lightTokens } from "@/shared/theme/tokens";

export type BrandRefreshControlProps = Omit<RefreshControlProps, "tintColor" | "colors" | "progressBackgroundColor">;

const ANDROID_COLORS = [lightTokens.brandPrimary];

export function BrandRefreshControl(props: BrandRefreshControlProps) {
  return (
    <RefreshControl
      {...props}
      tintColor={lightTokens.brandPrimary}
      colors={ANDROID_COLORS}
      progressBackgroundColor={lightTokens.surfaceDefault}
    />
  );
}
