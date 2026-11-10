import { ActivityIndicator, Text, View } from "react-native";
import { CalendarDays, ClipboardList, Edit3, MapPin, Trash2, Users } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import type { PartnerEvent } from "@/domain/partner/partner.types";
import { MotionPressable } from "@/presentation/components/ui/MotionPressable";
import { vinnotColors } from "@/shared/theme/vinnotTheme";
import { formatEventPrice } from "../event/eventPresentation";
import { formatDate, statusStyle } from "./partnerEventPresentation";
import { rowStyles } from "./partnerStyles";

type Props = {
  item: PartnerEvent;
  onManageRegistrations: () => void;
  onEdit: () => void;
  onDelete: () => void;
  /** The event details for the editor are loading. */
  editPending?: boolean;
};

export function PartnerEventRow({ item, onManageRegistrations, onEdit, onDelete, editPending = false }: Props) {
  const { t, i18n } = useTranslation();
  const badge = statusStyle(item.status);
  const location = [item.locationName, item.locationCity, item.locationRegion]
    .filter(Boolean)
    .join(", ");
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const price =
    item.price != null && item.price > 0
      ? formatEventPrice(item.price, item.currency, locale)
      : t("events.free");

  return (
    <View style={rowStyles.card}>
      <View style={rowStyles.iconBubble}>
        <CalendarDays size={20} color={vinnotColors.brand} />
      </View>
      <View style={rowStyles.body}>
        <View style={rowStyles.topRow}>
          <Text numberOfLines={1} style={rowStyles.title}>
            {item.title}
          </Text>
          <View style={[rowStyles.badge, { backgroundColor: badge.bg }]}>
            <View style={[rowStyles.dot, { backgroundColor: badge.dot }]} />
            <Text style={[rowStyles.badgeText, { color: badge.color }]}>
              {t(`partner.statuses.${item.status}`, { defaultValue: item.status })}
            </Text>
          </View>
        </View>
        <Text numberOfLines={1} style={rowStyles.meta}>
          {formatDate(item.startDate, locale)} · {price}
        </Text>
        {!!location && (
          <View style={rowStyles.inlineMeta}>
            <MapPin size={12} color={vinnotColors.muted} />
            <Text numberOfLines={1} style={rowStyles.meta}>
              {location}
            </Text>
          </View>
        )}
        <View style={rowStyles.inlineMeta}>
          <Users size={12} color={vinnotColors.muted} />
          <Text style={rowStyles.meta}>
            {item.currentAttendees}
            {item.maxAttendees ? `/${item.maxAttendees}` : ""} {t("partner.attendees")}
          </Text>
        </View>
      </View>
      <View style={rowStyles.actions}>
        <MotionPressable
          onPress={onManageRegistrations}
          hitSlop={8}
          style={rowStyles.registrationsBtn}
          accessibilityRole="button"
          accessibilityLabel={t("partner.manageRegistrations")}
          pressedScale={0.92}
        >
          <ClipboardList size={15} color={vinnotColors.ink} />
        </MotionPressable>
        <MotionPressable
          onPress={onEdit}
          disabled={editPending}
          hitSlop={8}
          style={rowStyles.editBtn}
          accessibilityRole="button"
          accessibilityLabel={t("partner.editEvent")}
          accessibilityState={{ busy: editPending, disabled: editPending }}
          pressedScale={0.92}
        >
          {editPending ? (
            <ActivityIndicator testID="partner-edit-pending" size="small" color={vinnotColors.brand} />
          ) : (
            <Edit3 size={15} color={vinnotColors.brand} />
          )}
        </MotionPressable>
        <MotionPressable
          onPress={onDelete}
          disabled={["CANCELLED", "COMPLETED"].includes(item.status.toUpperCase())}
          hitSlop={8}
          style={rowStyles.deleteBtn}
          accessibilityRole="button"
          accessibilityLabel={t("partner.deleteEvent")}
          pressedScale={0.92}
        >
          <Trash2 size={15} color={vinnotColors.danger} />
        </MotionPressable>
      </View>
    </View>
  );
}
