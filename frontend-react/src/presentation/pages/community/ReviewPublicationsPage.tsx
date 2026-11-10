import { MessageSquareText } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@components/ui/Button";
import { EmptyState } from "@components/ui/EmptyState";
import { LinkButton } from "@components/ui/LinkButton";
import { PageLoader } from "@components/ui/PageLoader";
import { Pagination } from "@components/ui/Pagination";
import { GlassRating } from "@components/ui/rating/GlassRating";
import { ReasonPicker } from "@components/ui/ReasonPicker";
import { formatDateTime } from "@utils/date";
import { AdminBackLink } from "@components/features/admin/AdminBackLink";
import { AdminPageHeader } from "@components/features/admin/AdminPageHeader";
import { useReviewPublications } from "@hooks/queries/community/useCommunity";
import { ModerationNames } from "@components/features/community/ModerationNames";
import {
  DEFAULT_PUBLICATION_REJECTION_REASON,
  MAX_PUBLICATION_NOTE_LENGTH,
  PUBLICATION_REJECTION_REASONS,
  type ReviewPublication,
  type PublicationDecision,
  type PublicationRejectionReason,
} from "@domain/community/community.types";
import { toPublicationDecision } from "@domain/community/publicationDecision";

function PublicationCard({
  item,
  pending,
  decide,
}: {
  item: ReviewPublication;
  pending: boolean;
  decide: (input: PublicationDecision) => void;
}) {
  const { t } = useTranslation();
  const [reasonCode, setReasonCode] = useState<PublicationRejectionReason>(
    DEFAULT_PUBLICATION_REJECTION_REASON,
  );
  const [note, setNote] = useState("");
  const submit = (status: PublicationDecision["status"]) =>
    decide(toPublicationDecision(item, status, reasonCode, note));
  return (
    <article className="space-y-3 rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-semibold">{t(`community.targets.${item.type}`)}</h2>
        {item.rating !== null && <GlassRating value={item.rating} size={18} showValue />}
      </div>
      <ModerationNames
        fields={[
          [t("community.authorLabel"), item.authorUsername],
          [t("community.wineLabel"), item.wineName],
        ]}
      />
      <p className="text-sm text-gray-500">{formatDateTime(item.createdAt)}</p>
      <h3 className="font-medium">{item.title}</h3>
      <p className="whitespace-pre-wrap">{item.content}</p>
      <LinkButton variant="link" to={`/wines/${item.wineId}`}>
        {t("community.reviewContent")}
      </LinkButton>
      <ReasonPicker
        legend={t("community.publicationReason")}
        reasons={PUBLICATION_REJECTION_REASONS}
        value={reasonCode}
        onChange={setReasonCode}
        getLabel={(code) => t(`community.rejectionReasons.${code}`)}
        note={note}
        onNoteChange={setNote}
        noteLabel={t("community.publicationNote")}
        maxNoteLength={MAX_PUBLICATION_NOTE_LENGTH}
        help={t("community.reasonHelp")}
        disabled={pending}
      />
      <div className="flex flex-wrap gap-3">
        <Button disabled={pending} onClick={() => submit("APPROVED")}>
          {t("community.approve")}
        </Button>
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => submit("REJECTED")}
        >
          {t("community.reject")}
        </Button>
      </div>
    </article>
  );
}
export function ReviewPublicationsPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const { publications, decide } = useReviewPublications(page);
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <AdminBackLink />
      <AdminPageHeader
        title={t("community.publications")}
        subtitle={t("community.publicationHelp")}
        icon={MessageSquareText}
      />
      <LinkButton variant="link" to="/admin/community">
        {t("community.moderation")}
      </LinkButton>
      {decide.isError && (
        <p role="alert">
          {t("community.error")}{" "}
          <Button
            variant="outline"
            onClick={() => {
              void publications.refetch();
            }}
          >
            {t("common.retry")}
          </Button>
        </p>
      )}
      {publications.isPending ? (
        <PageLoader compact />
      ) : publications.isError ? (
        <Button
          variant="outline"
          onClick={() => {
            void publications.refetch();
          }}
        >
          {t("community.error")}
        </Button>
      ) : (
        <>
          {publications.data.items.length === 0 && (
            <EmptyState
              illustration="community"
              title={t("community.queueClear")}
              description={t("community.queueClearHelp")}
            />
          )}
          {publications.data.items.map((item) => (
            <PublicationCard
              key={`${item.id}:${item.revision}`}
              item={item}
              pending={decide.isPending}
              decide={(input) => decide.mutate(input)}
            />
          ))}
        </>
      )}
      <Pagination
        page={page}
        totalPages={publications.data?.totalPages ?? 0}
        onPageChange={setPage}
      />
    </div>
  );
}
