import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@components/ui/Button";
import { Select } from "@components/ui/Select";
import { Textarea } from "@components/ui/Textarea";
import { reportReasons, type ReportReason } from "@domain/community/community.types";

/** Controlled report form shared by the inline links and the actions dialog. */
export function CommunityReportForm({
  reason,
  description,
  pending,
  onReasonChange,
  onDescriptionChange,
  onSubmit,
  onCancel,
  className = "space-y-3 rounded-xl border border-border bg-surface p-4",
}: {
  reason: ReportReason;
  description: string;
  pending: boolean;
  onReasonChange: (reason: ReportReason) => void;
  onDescriptionChange: (description: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  className?: string;
}) {
  const { t } = useTranslation();
  const reasonId = useId();
  return (
    <form
      className={className}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <p className="text-xs text-gray-600">{t("community.privacy")}</p>
      <Select
        id={reasonId}
        label={t("community.reason")}
        value={reason}
        disabled={pending}
        options={reportReasons.map((value) => ({ value, label: t(`community.reasons.${value}`) }))}
        onChange={(event) => onReasonChange(event.target.value as ReportReason)}
      />
      <Textarea
        label={t("community.details")}
        rows={3}
        value={description}
        maxLength={2000}
        required={reason === "OTHER"}
        disabled={pending}
        onChange={(event) => onDescriptionChange(event.target.value)}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          size="sm"
          disabled={pending || (reason === "OTHER" && !description.trim())}
        >
          {t(pending ? "community.pending" : "community.send")}
        </Button>
        <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={onCancel}>
          {t("community.cancel")}
        </Button>
      </div>
    </form>
  );
}
