import { ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@components/ui/Button";
import { EmptyState } from "@components/ui/EmptyState";
import { LinkButton } from "@components/ui/LinkButton";
import { PageBanner } from "@components/ui/PageBanner";
import { PageLoader } from "@components/ui/PageLoader";
import { Pagination } from "@components/ui/Pagination";
import { formatDate } from "@utils/date";
import {
  CommunityOverviewPanel,
  ModerationShortcuts,
  ReportStatusBadge,
} from "@components/features/community/CommunityOverview";
import {
  useCommunityActions,
  useMyCommunity,
} from "@hooks/queries/community/useCommunity";
import { useAuth } from "@hooks/useAuth";
import { useUrlFilters } from "@hooks/useUrlFilters";

const PAGE_KEYS = ["reportsPage", "blocksPage"] as const;

function pageNumber(value: string): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 0;
}

export function CommunityPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  // Both list pages live in the URL so they survive Back.
  const { values, update } = useUrlFilters(PAGE_KEYS);
  const reportsPage = pageNumber(values.reportsPage);
  const blocksPage = pageNumber(values.blocksPage);
  const setReportsPage = (page: number) => update({ reportsPage: page || null });
  const setBlocksPage = (page: number) => update({ blocksPage: page || null });
  const { reports, blocks } = useMyCommunity(reportsPage, blocksPage);
  const { unblock } = useCommunityActions();
  const moderator = user?.roles.some(
    (role) => role === "ROLE_ADMIN" || role === "ROLE_MODERATOR",
  );
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageBanner title={t("community.title")} subtitle={t("community.privacy")} icon={ShieldCheck} />
      <CommunityOverviewPanel />
      {moderator && <ModerationShortcuts />}
      <section className="space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <h2 className="text-xl font-semibold">
          {reports.data
            ? t("community.sectionCount", {
                title: t("community.myReports"),
                count: reports.data.totalItems,
              })
            : t("community.myReports")}
        </h2>
        <p className="text-sm text-gray-600">{t("community.receiptHelp")}</p>
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
                title={t("community.noReportsTitle")}
                description={t("community.noReports")}
              />
            )}
            {reports.data.items.map((item) => (
              <article
                key={item.id}
                className="space-y-2 rounded-xl border border-border p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold">
                    {t(`community.targets.${item.target.type}`)}
                  </h3>
                  <ReportStatusBadge status={item.status} />
                </div>
                <p className="text-sm text-gray-600">
                  {t("community.reportDate", {
                    date: formatDate(item.createdAt),
                  })}
                </p>
                <p className="text-sm">
                  {t(
                    item.status === "OPEN" || item.status === "IN_REVIEW"
                      ? "community.waitingHelp"
                      : "community.closedHelp",
                  )}
                </p>
                <p className="break-all text-xs text-gray-500">
                  {t("community.caseId")} {item.id}
                </p>
              </article>
            ))}
            <Pagination
              page={reportsPage}
              totalPages={reports.data.totalPages}
              label={t("community.myReports")}
              onPageChange={setReportsPage}
            />
          </>
        )}
      </section>
      <section className="space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <h2 className="text-xl font-semibold">
          {blocks.data
            ? t("community.sectionCount", {
                title: t("community.blockedUsers"),
                count: blocks.data.totalItems,
              })
            : t("community.blockedUsers")}
        </h2>
        <p className="text-sm text-gray-600">{t("community.blockHelp")}</p>
        {blocks.isPending ? (
          <PageLoader compact />
        ) : blocks.isError ? (
          <Button
            variant="outline"
            onClick={() => {
              void blocks.refetch();
            }}
          >
            {t("community.error")}
          </Button>
        ) : (
          <>
            {blocks.data.items.length === 0 && (
              <p className="rounded-xl bg-surface-cream p-4 text-sm text-gray-600">
                {t("community.noBlocks")}
              </p>
            )}
            {blocks.data.items.map((item) => (
              <div
                key={item.userId}
                className="flex items-center justify-between gap-3 rounded-xl border border-border p-4"
              >
                <span className="font-medium">{item.username}</span>
                <Button
                  variant="outline"
                  disabled={unblock.isPending}
                  onClick={() => unblock.mutate(item.userId)}
                >
                  {t("community.unblock")}
                </Button>
              </div>
            ))}
            <Pagination
              page={blocksPage}
              totalPages={blocks.data.totalPages}
              label={t("community.blockedUsers")}
              onPageChange={setBlocksPage}
            />
          </>
        )}
        {unblock.isError && <p role="alert">{t("community.error")}</p>}
      </section>
      <LinkButton variant="link" to="/contact">
        {t("nav.contact", "Contacto")}
      </LinkButton>
    </div>
  );
}
