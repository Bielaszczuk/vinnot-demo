import { Camera, Pencil } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { Avatar, Badge } from "@/presentation/components/ui/Atoms";
import { MotionPressable } from "@/presentation/components/ui/MotionPressable";
import { lightTokens, radii, wine, iconStrokes } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";

interface ProfileRole {
  key: string;
  label: string;
}

interface ProfileHeroProps {
  displayName: string;
  email?: string;
  avatarUrl?: string;
  roles: ProfileRole[];
  editLabel: string;
  onEdit: () => void;
  onAvatarPress: () => void;
  /** Extra content under the identity row, such as the points emblem. */
  children?: React.ReactNode;
}

export function ProfileHero({
  displayName,
  email,
  avatarUrl,
  roles,
  editLabel,
  onEdit,
  onAvatarPress,
  children,
}: ProfileHeroProps) {
  return (
    <View style={styles.hero}>
      <View pointerEvents="none" style={styles.accentLarge} />
      <View pointerEvents="none" style={styles.accentSmall} />

      <View style={styles.content}>
        <MotionPressable
          accessibilityLabel={editLabel}
          accessibilityRole="button"
          onPress={onAvatarPress}
          pressedScale={0.96}
          style={styles.avatarWrap}
        >
          <Avatar uri={avatarUrl} name={displayName} size={84} />
          <View style={styles.cameraBadge}>
            <Camera size={15} color={lightTokens.surfaceDefault} strokeWidth={iconStrokes.strong} />
          </View>
        </MotionPressable>

        <View style={styles.identity}>
          <Text numberOfLines={2} style={styles.name}>
            {displayName}
          </Text>
          {!!email && (
            <Text numberOfLines={1} style={styles.email}>
              {email}
            </Text>
          )}
          <View style={styles.badges}>
            {roles.map((role) => (
              <Badge key={role.key} label={role.label} variant="brand" />
            ))}
          </View>
        </View>
      </View>

      {children}

      <MotionPressable
        accessibilityRole="button"
        onPress={onEdit}
        style={styles.editButton}
      >
        <Pencil size={16} color={wine[700]} strokeWidth={iconStrokes.strong} />
        <Text style={styles.editLabel}>{editLabel}</Text>
      </MotionPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    position: "relative",
    gap: 18,
    overflow: "hidden",
    borderRadius: radii.xl,
    padding: 20,
    backgroundColor: wine[50],
    borderWidth: 1,
    borderColor: wine[100],
  },
  accentLarge: {
    position: "absolute",
    width: 156,
    height: 156,
    right: -54,
    top: -68,
    borderRadius: radii.full,
    backgroundColor: wine[100],
    opacity: 0.7,
  },
  accentSmall: {
    position: "absolute",
    width: 76,
    height: 76,
    right: 64,
    bottom: -38,
    borderRadius: radii.full,
    backgroundColor: wine[200],
    opacity: 0.45,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatarWrap: {
    position: "relative",
  },
  cameraBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.full,
    borderWidth: 3,
    borderColor: wine[50],
    backgroundColor: wine[700],
  },
  identity: {
    flex: 1,
    gap: 4,
  },
  name: {
    ...textStyles.headingMedium,
    color: lightTokens.textPrimary,
  },
  email: {
    ...textStyles.bodySmall,
    color: lightTokens.textSecondary,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 5,
  },
  editButton: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: wine[200],
    backgroundColor: lightTokens.surfaceDefault,
  },
  editLabel: {
    ...textStyles.buttonSmall,
    color: wine[700],
  },
});
