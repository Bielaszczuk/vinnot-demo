import { Flag } from "lucide-react";
import {
  CommunityOverviewPanel,
  ReportStatusBadge,
} from "@components/features/community/CommunityOverview";
import { AdminBackLink } from "@components/features/admin/AdminBackLink";
import { AdminPageHeader } from "@components/features/admin/AdminPageHeader";
import { Button } from "@components/ui/Button";
import { EmptyState } from "@components/ui/EmptyState";
import { LinkButton } from "@components/ui/LinkButton";
import { PageLoader } from "@components/ui/PageLoader";
import { Pagination } from "@components/ui/Pagination";
import { Select } from "@components/ui/Select";
import { formatDateTime } from "@utils/date";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useCommunityModeration } from "@hooks/queries/community/useCommunity";
import { ModerationNames } from "@components/features/community/ModerationNames";
import { ReportDecisionForm } from "@components/features/community/ReportDecisionForm";
import { moderationErrorMessage } from "@components/features/community/moderationErrorMessage";
import type {
  ModerationReport,
  ReportStatus,
} from "@domain/community/community.types";

function ReportCard({
  report,
  reviewer,
  canManageAccounts,
  pending,
  onDecide,
  onRemove,
}: {
  report: ModerationReport;
  reviewer?: string;
  canManageAccounts: boolean;
  pending: boolean;
  onRemove: (input: { id: string; decision: string }) => void;
  onDecide: (input: {
    id: string;
    status: Exclude<ReportStatus, "OPEN">;
    decision: string;
  }) => void;
}) {
  const { t } = useTranslation();
  const final = report.status === "RESOLVED" || report.status === "DISMISSED";
  const disabled =
    pending || final || (!!report.reviewerId && report.reviewerId !== reviewer);
  // Catalog quality reports are filed by Vinnot itself and compare two wines.
  const catalog = report.reason === "CATALOG_QUALITY";
  const destination = {
    REVIEW: "/admin/reviews",
    COMMENT: "/admin/reviews",
    USER: "/admin/users",
    EVENT: "/admin/events",
    WINE_ROUTE: "/admin/routes",
    WINE: "/admin/wines",
  }[report.target.type];
  return (
    <article className="space-y-3 rounded-xl border border-border bg-surface p-4 shadow-sm">
      <h2 className="font-semibold">
        {t(`community.targets.${report.target.type}`)} ·{" "}
        {t(`community.reasons.${report.reason}`)}
      </h2>
      <ReportStatusBadge status={report.status} />
      <p className="break-all text-xs text-gray-500">
        {t("community.caseId")}: {report.id}
      </p>
      <p className="text-xs text-gray-500">
        {formatDateTime(report.createdAt)}
      </p>
      <ModerationNames
        fields={[
          [t("community.reportedByLabel"), catalog ? t("community.automaticReporter") : null],
          [t("community.authorLabel"), report.authorUsername],
          [
            t("community.aboutLabel"),
            report.targetLabel &&
              `${t(`community.targets.${report.target.type}`)} · ${report.targetLabel}`,
          ],
          [t("community.relatedWineLabel"), report.relatedTargetLabel],
          [t("community.reviewedByLabel"), report.reviewerUsername],
        ]}
      />
      <blockquote className="whitespace-pre-wrap rounded-xl bg-surface-cream p-3">
        {report.excerpt}
      </blockquote>
      <p className="whitespace-pre-wrap">
        {catalog ? t("community.catalogQualityDescription") : report.description}
      </p>
      {catalog && (
        <div className="flex flex-wrap gap-3">
          <LinkButton variant="link" to={`/wines/${report.target.id}`}>
            {t("community.openMatchedWine")}
          </LinkButton>
          {report.relatedTargetId && (
            <LinkButton variant="link" to={`/wines/${report.relatedTargetId}`}>
              {t("community.openChosenWine")}
            </LinkButton>
          )}
        </div>
      )}
      {report.target.type !== "USER" || canManageAccounts ? (
        <LinkButton variant="link" to={destination}>
          {t("community.reviewContent")}
        </LinkButton>
      ) : (
        <p>{t("community.adminRequired")}</p>
      )}
      {final ? (
        <p>
          {t(`community.statuses.${report.status}`)}: {report.decision}
        </p>
      ) : (
        <ReportDecisionForm
          reportId={report.id}
          targetType={report.target.type}
          disabled={disabled}
          onDecide={onDecide}
          onRemove={onRemove}
        />
      )}
    </article>
  );
}
export function CommunityModerationPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<ReportStatus>("OPEN");
  const { reports, decide, remove, user } = useCommunityModeration(
    page,
    status,
  );
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <AdminBackLink />
      <AdminPageHeader
        title={t("community.moderation")}
        subtitle={t("community.moderationHelp")}
        icon={Flag}
      />
      <CommunityOverviewPanel moderation />
      <LinkButton variant="link" to="/admin/publications">
        {t("community.publications")}
      </LinkButton>
      <Select
        aria-label={t("community.moderation")}
        containerClassName="max-w-xs"
        value={status}
        options={(["OPEN", "IN_REVIEW", "RESOLVED", "DISMISSED"] as const).map((value) => ({
          value,
          label: t(`community.statuses.${value}`),
        }))}
        onChange={(event) => {
          setPage(0);
          setStatus(event.target.value as ReportStatus);
        }}
      />
      {(decide.isError || remove.isError) && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          <p>{moderationErrorMessage(decide.isError ? decide.error : remove.error, t)}</p>
          <Button
            variant="outline"
            onClick={() => {
              void reports.refetch();
            }}
          >
            {t("community.reloadQueue")}
          </Button>
        </div>
      )}
      {reports.isPending ? (
        <PageLoader compact />
      ) : reports.isError ? (
        <Button
          variant="outline"
          onClick={() => {
            void reports.refetch();
          }}
        >
          {t("community.error")}
        </Button>
      ) : (
        <>
          {reports.data.items.length === 0 && (
            <EmptyState
              illustration="community"
              title={t("community.noCases")}
              description={t("community.noCasesHelp")}
            />
          )}
          {reports.data.items.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              reviewer={user?.id}
              canManageAccounts={!!user?.roles.includes("ROLE_ADMIN")}
              pending={decide.isPending || remove.isPending}
              onDecide={(input) => decide.mutate(input)}
              onRemove={(input) => remove.mutate(input)}
            />
          ))}
        </>
      )}
      <Pagination
        page={page}
        totalPages={reports.data?.totalPages ?? 0}
        onPageChange={setPage}
      />
    </div>
  );
}
