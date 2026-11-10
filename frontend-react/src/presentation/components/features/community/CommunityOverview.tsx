import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, ButtonSpinner } from "@components/ui/Button";
import { Icon } from "@components/ui/Icon";
import { LinkButton } from "@components/ui/LinkButton";
import { PageLoader } from "@components/ui/PageLoader";
import {
  useCommunityOverview,
  useReviewPublications,
} from "@hooks/queries/community/useCommunity";
import type { ReportStatus } from "@domain/community/community.types";

export function ReportStatusBadge({ status }: { status: ReportStatus }) {
  const { t } = useTranslation();
  const pending = status === "OPEN" || status === "IN_REVIEW";
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${pending ? "bg-warning-soft text-warning" : "bg-gray-100 text-gray-700"}`}
    >
      {t(`community.statuses.${status}`)}
    </span>
  );
}

export function CommunityOverviewPanel({
  moderation = false,
}: {
  moderation?: boolean;
}) {
  const { t } = useTranslation();
  const query = useCommunityOverview(moderation);
  const counts =
    query.data && ("reports" in query.data ? query.data.reports : query.data);
  const blocks =
    query.data && "blockedUsers" in query.data
      ? query.data.blockedUsers
      : undefined;
  const metrics = [
    {
      label: t("community.waitingReports"),
      value: counts ? counts.open + counts.inReview : undefined,
    },
    {
      label: t("community.closedReports"),
      value: counts ? counts.resolved + counts.dismissed : undefined,
    },
    ...(!moderation
      ? [{ label: t("community.blockedUsers"), value: blocks }]
      : []),
  ];
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-surface-cream p-5">
      <h2 className="text-lg font-semibold text-gray-900">
        {t(
          moderation
            ? "community.moderationOverview"
            : "community.overviewTitle",
        )}
      </h2>
      <p className="text-sm text-gray-600">
        {t(
          moderation
            ? "community.moderationOverviewHelp"
            : "community.overviewHelp",
        )}
      </p>
      {query.isPending ? (
        <PageLoader compact />
      ) : query.isError ? (
        <Button
          variant="link"
          className="min-h-11"
          onClick={() => {
            void query.refetch();
          }}
        >
          {t("community.statusUnavailable")} · {t("common.retry")}
        </Button>
      ) : (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {metrics.map((metric, index) => (
            <div
              key={metric.label}
              className={`rounded-xl border p-4 ${index === 0 ? "border-wine-200 bg-wine-50" : "border-border bg-white"}`}
            >
              <dt className="text-sm text-gray-600">{metric.label}</dt>
              <dd className="mt-1 text-3xl font-semibold text-wine-800">
                {metric.value ?? "—"}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

export function ModerationShortcuts() {
  const { t } = useTranslation();
  const { publications } = useReviewPublications(0);
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-surface p-4">
      <CommunityOverviewPanel moderation />
      <div className="flex flex-wrap gap-3">
        <LinkButton variant="secondary" to="/admin/community" rightIcon={<Icon icon={ArrowRight} />}>
          {t("community.viewReports")}
        </LinkButton>
        <LinkButton variant="secondary" to="/admin/publications" rightIcon={<Icon icon={ArrowRight} />}>
          {publications.data && !publications.isError
            ? t("community.reviewQueueCount", {
                count: publications.data.totalItems,
              })
            : t("community.publications")}
        </LinkButton>
      </div>
    </section>
  );
}

export function CommunityActivityLink() {
  const { t } = useTranslation();
  const query = useCommunityOverview();
  const data = query.data && "reports" in query.data ? query.data : undefined;
  const pending = data ? data.reports.open + data.reports.inReview : undefined;
  return (
    <Link
      to="/community"
      className="my-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-wine-200 bg-wine-50 p-4 text-wine-800"
    >
      <span className="inline-flex items-center gap-1.5 font-semibold">
        {t("community.title")}
        <Icon icon={ArrowRight} />
      </span>
      <span className="inline-flex min-h-7 items-center rounded-full bg-white px-3 py-1 text-sm">
        {query.isPending
          ? <><ButtonSpinner /><span className="sr-only">{t("common.loading")}</span></>
          : query.isError || pending === undefined
            ? t("community.statusUnavailable")
            : pending
              ? t("community.waitingCount", { count: pending })
              : t("community.clearActivity")}
      </span>
    </Link>
  );
}
