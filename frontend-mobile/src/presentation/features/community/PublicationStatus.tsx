import { Text } from "react-native";
import { useTranslation } from "react-i18next";
import { lightTokens } from "@/shared/theme/tokens";
export function PublicationStatus({ status }: { status?: "PENDING" | "APPROVED" | "REJECTED" }) {
  const { t } = useTranslation();
  if (!status || status === "APPROVED") return null;
  return (
    <Text
      accessibilityLiveRegion="polite"
      style={{ color: lightTokens.textSecondary, paddingVertical: 8 }}
    >
      {t(status === "PENDING" ? "community.publicationPending" : "community.publicationRejected")}
    </Text>
  );
}
