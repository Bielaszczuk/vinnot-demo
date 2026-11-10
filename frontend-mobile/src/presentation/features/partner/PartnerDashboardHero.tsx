import { Text, View } from "react-native";
import { CalendarDays, Plus } from "lucide-react-native";
import { MotionPressable } from "@/presentation/components/ui/MotionPressable";
import { vinnotColors } from "@/shared/theme/vinnotTheme";
import { heroStyles } from "./partnerStyles";
import { iconStrokes } from "@/shared/theme/tokens";

type Props = {
  title: string;
  subtitle: string;
  actionLabel: string;
  onAction: () => void;
};

export function PartnerDashboardHero({
  title,
  subtitle,
  actionLabel,
  onAction,
}: Props) {
  return (
    <View style={heroStyles.container}>
      <View style={heroStyles.heading}>
        <View style={heroStyles.icon}>
          <CalendarDays size={22} color={vinnotColors.brand} strokeWidth={iconStrokes.regular} />
        </View>
        <View style={heroStyles.copy}>
          <Text style={heroStyles.title}>{title}</Text>
          <Text style={heroStyles.subtitle}>{subtitle}</Text>
        </View>
      </View>

      <MotionPressable
        accessibilityRole="button"
        accessibilityLabel={actionLabel}
        onPress={onAction}
        pressedScale={0.98}
        style={heroStyles.action}
      >
        <Plus size={18} color={vinnotColors.white} strokeWidth={iconStrokes.strong} />
        <Text style={heroStyles.actionText}>{actionLabel}</Text>
      </MotionPressable>
    </View>
  );
}
