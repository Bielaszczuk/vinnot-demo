import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Button } from "@/presentation/components/ui/Button";
import { Chip } from "@/presentation/components/ui/Chip";
import { Spinner } from "@/presentation/components/ui/Feedback";
import {
  ANNOUNCEMENT_DESTINATIONS,
  ANNOUNCEMENT_LANGUAGES,
  ANNOUNCEMENT_ROLES,
  type AnnouncementAudience,
  type AnnouncementDestination,
  type AnnouncementKind,
  type AnnouncementReach,
} from "@/domain/admin/announcement";
import type { AdminCountry, AdminRegion } from "@/domain/admin/admin.types";
import { lightTokens, radii } from "@/shared/theme/tokens";
import { textStyles } from "@/shared/theme/typography";
import { NotificationOptionPicker } from "./NotificationOptionPicker";
import { notificationStyles } from "./notificationStyles";

function ChipGroup<T extends string>({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: T | null;
  options: { value: T | null; label: string }[];
  disabled: boolean;
  onChange: (value: T | null) => void;
}) {
  return (
    <View style={notificationStyles.field}>
      <Text style={notificationStyles.label}>{label}</Text>
      <View style={notificationStyles.chips}>
        {options.map((option) => (
          <Chip
            key={option.value ?? "all"}
            label={option.label}
            selected={option.value === value}
            disabled={disabled}
            onPress={() => onChange(option.value)}
          />
        ))}
      </View>
    </View>
  );
}

/** Channels, segment and push destination, with the live number of accounts the announcement reaches. */
export function AnnouncementAudienceForm({
  kind,
  audience,
  destination,
  countries,
  regions,
  reach,
  reachLoading,
  reachFailed,
  onReachRetry,
  placesFailed,
  disabled,
  onAudienceChange,
  onCountryChange,
  onDestinationChange,
}: {
  kind: AnnouncementKind;
  audience: AnnouncementAudience;
  destination: AnnouncementDestination;
  countries: AdminCountry[];
  regions: AdminRegion[];
  reach: AnnouncementReach | undefined;
  reachLoading: boolean;
  reachFailed: boolean;
  onReachRetry: () => void;
  placesFailed: boolean;
  disabled: boolean;
  onAudienceChange: (patch: Partial<AnnouncementAudience>) => void;
  onCountryChange: (countryId: string | null) => void;
  onDestinationChange: (destination: AnnouncementDestination) => void;
}) {
  const { t } = useTranslation();
  const noChannel = !audience.email && !audience.push;
  return (
    <View style={notificationStyles.card}>
      <View style={notificationStyles.field}>
        <Text style={notificationStyles.heading}>{t("admin.notifications.audience.channels")}</Text>
        <View style={notificationStyles.chips}>
          {(["email", "push"] as const).map((channel) => (
            <Chip
              key={channel}
              label={t(`admin.notifications.audience.${channel}`)}
              selected={audience[channel]}
              disabled={disabled}
              onPress={() => onAudienceChange({ [channel]: !audience[channel] })}
            />
          ))}
        </View>
        <Text style={notificationStyles.help}>{t("admin.notifications.audience.channelsHelp")}</Text>
      </View>

      <ChipGroup
        label={t("admin.notifications.audience.language")}
        value={audience.language}
        disabled={disabled}
        onChange={(language) => onAudienceChange({ language })}
        options={[
          { value: null, label: t("admin.notifications.audience.allLanguages") },
          ...ANNOUNCEMENT_LANGUAGES.map((code) => ({ value: code, label: t(`admin.notifications.languages.${code}`) })),
        ]}
      />
      <ChipGroup
        label={t("admin.notifications.audience.role")}
        value={audience.role}
        disabled={disabled}
        onChange={(role) => onAudienceChange({ role })}
        options={[
          { value: null, label: t("admin.notifications.audience.allRoles") },
          ...ANNOUNCEMENT_ROLES.map((role) => ({ value: role, label: t(`admin.notifications.roles.${role}`) })),
        ]}
      />
      <NotificationOptionPicker
        label={t("admin.notifications.audience.country")}
        value={audience.countryId}
        options={countries}
        allLabel={t("admin.notifications.audience.allCountries")}
        disabled={disabled}
        onSelect={onCountryChange}
      />
      <NotificationOptionPicker
        label={t("admin.notifications.audience.region")}
        value={audience.regionId}
        options={regions}
        allLabel={t("admin.notifications.audience.allRegions")}
        disabled={disabled || !audience.countryId}
        onSelect={(regionId) => onAudienceChange({ regionId })}
      />
      {placesFailed && (
        <Text accessibilityRole="alert" style={notificationStyles.error}>
          {t("admin.notifications.audience.placesError")}
        </Text>
      )}
      {(audience.countryId || audience.regionId) && (
        <Text style={notificationStyles.help}>{t("admin.notifications.audience.regionHelp")}</Text>
      )}

      {audience.push && (
        <ChipGroup<AnnouncementDestination>
          label={t("admin.notifications.audience.destination")}
          value={destination}
          disabled={disabled}
          onChange={(value) => onDestinationChange(value ?? "HOME")}
          options={ANNOUNCEMENT_DESTINATIONS.map((value) => ({
            value,
            label: t(`admin.notifications.destinations.${value}`),
          }))}
        />
      )}

      <View style={styles.reach} accessibilityLiveRegion="polite">
        <View style={styles.reachHeader}>
          <Text style={styles.reachLabel}>{t("admin.notifications.audience.reach")}</Text>
          {reachLoading && <Spinner size="sm" />}
        </View>
        {noChannel ? (
          <Text style={styles.reachDetail}>{t("admin.notifications.audience.channelRequired")}</Text>
        ) : reachFailed && !reachLoading ? (
          <View style={styles.reachError} accessibilityRole="alert">
            <Text style={styles.reachDetail}>{t("admin.notifications.audience.reachError")}</Text>
            <Button variant="outline" size="sm" onPress={onReachRetry}>
              {t("common.retry")}
            </Button>
          </View>
        ) : (
          <>
            <Text style={styles.reachValue}>
              {reach ? t("admin.notifications.audience.accounts", { count: reach.accounts }) : "–"}
            </Text>
            {reach && (
              <Text style={styles.reachDetail}>
                {[
                  audience.email && t("admin.notifications.audience.byEmail", { count: reach.email }),
                  audience.push && t("admin.notifications.audience.byPush", { count: reach.push }),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
            )}
          </>
        )}
        <Text style={notificationStyles.help}>{t(`admin.notifications.kinds.${kind}.audience`)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  reach: { backgroundColor: lightTokens.bgSubtle, borderRadius: radii.lg, padding: 14, gap: 4 },
  reachHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  reachLabel: { ...textStyles.overline, color: lightTokens.textTertiary },
  reachValue: { ...textStyles.headingSmall, color: lightTokens.textPrimary },
  reachDetail: { ...textStyles.caption, color: lightTokens.textSecondary },
  reachError: { gap: 8, alignItems: "flex-start" },
});
