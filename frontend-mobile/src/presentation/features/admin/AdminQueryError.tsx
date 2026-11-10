import { useTranslation } from "react-i18next";
import { EmptyState } from "@/presentation/components/ui/Feedback";

export function AdminQueryError({ retry }: { retry: () => unknown }) {
  const { t } = useTranslation();
  return (
    <EmptyState
      title={t("admin.feedback.loadError")}
      description={t("admin.feedback.retryDescription")}
      action={{
        label: t("common.retry"),
        onPress: () => {
          void retry();
        },
      }}
    />
  );
}
