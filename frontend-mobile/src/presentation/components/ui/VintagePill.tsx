/**
 * VintagePill — the tasted vintage shown on reviews and cellar notes.
 */
import type { ViewStyle } from "react-native";
import { useTranslation } from "react-i18next";
import { Badge } from "./Atoms";

export function VintagePill({ year, style }: { year: number; style?: ViewStyle }) {
  const { t } = useTranslation();
  return <Badge label={t("vintage.pill", { year })} variant="brand" style={style} />;
}
