import { useTranslation } from "react-i18next";
export function PublicationStatus({
  status,
}: {
  status?: "PENDING" | "APPROVED" | "REJECTED";
}) {
  const { t } = useTranslation();
  if (!status || status === "APPROVED") return null;
  return (
    <p
      className="rounded-xl bg-warning-soft px-3 py-2 text-sm text-warning"
      role="status"
    >
      {t(
        status === "PENDING"
          ? "community.publicationPending"
          : "community.publicationRejected",
      )}
    </p>
  );
}
