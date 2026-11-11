/**
 * Follow / Following button. The view is stateless; FollowButton wires it to the
 * optimistic follow toggle for lists and suggestion cards.
 */
import { useTranslation } from "react-i18next";
import type { ViewStyle } from "react-native";
import { Button, type ButtonSize } from "@/presentation/components/ui/Button";
import { useFollowToggle } from "./useFollowToggle";

interface FollowButtonViewProps {
  name: string;
  following: boolean;
  pending?: boolean;
  onPress: () => void;
  size?: ButtonSize;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export function FollowButtonView({
  name,
  following,
  pending = false,
  onPress,
  size = "sm",
  fullWidth = false,
  style,
}: FollowButtonViewProps) {
  const { t } = useTranslation();
  return (
    <Button
      variant={following ? "outline" : "primary"}
      size={size}
      fullWidth={fullWidth}
      disabled={pending}
      onPress={onPress}
      style={style}
      accessibilityLabel={t(following ? "social.unfollowA11y" : "social.followA11y", { name })}
      testID="follow-button"
    >
      {t(following ? "social.following" : "social.follow")}
    </Button>
  );
}

export function FollowButton({
  userId,
  name,
  following,
  size,
  style,
}: {
  userId: string;
  name: string;
  following: boolean;
  size?: ButtonSize;
  style?: ViewStyle;
}) {
  const toggle = useFollowToggle(userId, following);
  return (
    <FollowButtonView
      name={name}
      following={toggle.following}
      pending={toggle.pending}
      onPress={toggle.toggle}
      size={size}
      style={style}
    />
  );
}
