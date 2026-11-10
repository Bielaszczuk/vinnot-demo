import { useState } from "react";
import { Text, View, StyleSheet } from "react-native";
import { ChevronDown, Check } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { phoneCountries } from "@/domain/user/phoneCountry";
import { usePhoneNumberField } from "@/presentation/hooks/usePhoneNumberField";
import { MotionPressable } from "./MotionPressable";
import { TextField } from "./TextField";
import { vinnotColors, vinnotFonts } from "@/shared/theme/vinnotTheme";
import { fontSizes } from "@/shared/theme/typography";
import { lightTokens, radii } from "@/shared/theme/tokens";

export function PhoneNumberField({ value, onChange, disabled, error, label, hint, allowLandline }: {
  value: string; onChange: (value: string) => void; disabled?: boolean; error?: string;
  /** Defaults to the personal contact phone wording; business forms pass their own. */
  label?: string; hint?: string;
  /** Business numbers can be landlines, which never get the Argentine mobile 9. */
  allowLandline?: boolean;
}) {
  const { t } = useTranslation();
  const phone = usePhoneNumberField(value, onChange, allowLandline);
  const [expanded, setExpanded] = useState(false);
  const selected = phoneCountries.find(c => c.code === phone.country);
  const fieldLabel = label ?? t("contactPhone.label");
  const nationalHint = hint ?? t("contactPhone.nationalHint");
  return <View style={styles.group}>
    <Text style={styles.label}>{fieldLabel}</Text>
    {phone.showLine && <View accessibilityRole="radiogroup" accessibilityLabel={t("contactPhone.line")} style={styles.lines}>
      {(["mobile", "landline"] as const).map(line => <MotionPressable key={line} disabled={disabled}
        accessibilityRole="radio" accessibilityState={{ checked: phone.line === line }}
        accessibilityLabel={t(line === "mobile" ? "contactPhone.lineMobile" : "contactPhone.lineLandline")}
        onPress={() => phone.setLine(line)} style={[styles.line, phone.line === line && styles.lineSelected]}>
        <Text style={[styles.label, phone.line === line && styles.lineSelectedText]}>
          {t(line === "mobile" ? "contactPhone.lineMobile" : "contactPhone.lineLandline")}
        </Text>
      </MotionPressable>)}
    </View>}
    <View style={styles.row}>
      <MotionPressable disabled={disabled} accessibilityRole="button" accessibilityLabel={t("contactPhone.country")}
        accessibilityState={{ expanded }} onPress={() => setExpanded(!expanded)} style={styles.selector}>
        <Text style={styles.label}>{selected ? `${selected.code} +${selected.dial}` : t("contactPhone.otherCountry")}</Text>
        <ChevronDown size={16} color={vinnotColors.brand} />
      </MotionPressable>
      <TextField containerStyle={{ flex: 1 }} value={phone.national} onChangeText={phone.setNational}
        accessibilityLabel={fieldLabel} keyboardType="phone-pad" editable={!disabled}
        maxLength={30} placeholder={phone.country !== "AR" ? undefined : phone.showLine && phone.line === "landline" ? "261 412 3456" : "11 2345 6789"} />
    </View>
    {expanded && <View style={styles.options}>
      {[...phoneCountries, { code: "OTHER" as const, dial: "" }].map(c => <MotionPressable
        key={c.code} accessibilityRole="radio" accessibilityState={{ checked: c.code === phone.country }}
        onPress={() => { phone.setCountry(c.code); setExpanded(false); }} style={styles.option}>
        <Text style={styles.label}>{c.code === "OTHER" ? t("contactPhone.otherCountry") : `${c.code} +${c.dial}`}</Text>
        {c.code === phone.country && <Check size={16} color={vinnotColors.brand} />}
      </MotionPressable>)}
    </View>}
    <Text accessibilityRole={error ? "alert" : undefined} style={[styles.hint, error ? { color: vinnotColors.brand } : undefined]}>
      {error ?? (phone.country === "OTHER" ? t("contactPhone.hint")
        : phone.showLine && phone.line === "landline" ? t("contactPhone.landlineHint") : nationalHint)}
    </Text>
  </View>;
}
const styles = StyleSheet.create({
  group: { gap: 8 },
  lines: { flexDirection: "row", gap: 8 },
  line: { minHeight: 40, paddingHorizontal: 14, justifyContent: "center", borderWidth: 1,
    borderColor: lightTokens.borderDefault, backgroundColor: lightTokens.surfaceDefault, borderRadius: radii["2xl"] },
  lineSelected: { borderColor: lightTokens.brandPrimary, backgroundColor: lightTokens.brandSecondary },
  lineSelectedText: { color: lightTokens.brandPrimary },
  row: { flexDirection: "row", gap: 8, alignItems: "center" },
  label: { fontFamily: vinnotFonts.medium, color: vinnotColors.ink, fontSize: fontSizes.sm },
  selector: { minHeight: 48, paddingHorizontal: 12, gap: 6, flexDirection: "row", alignItems: "center",
    borderWidth: 1, borderColor: vinnotColors.border, borderRadius: radii.md },
  options: { borderWidth: 1, borderColor: vinnotColors.border, borderRadius: radii.lg, padding: 8 },
  option: { minHeight: 44, paddingHorizontal: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  hint: { fontFamily: vinnotFonts.regular, color: vinnotColors.muted, fontSize: fontSizes.meta, lineHeight: 16 },
});
