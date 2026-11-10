import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useCommunityActions } from "@hooks/queries/community/useCommunity";
import { useConfirm } from "@hooks/useConfirm";
import { useToast } from "@hooks/useToast";
import { Button } from "@components/ui/Button";
import { Modal } from "@components/ui/Modal";
import { communityErrorMessage } from "@presentation/feedback/communityErrorMessage";
import type { ReportReason, ReportTargetType } from "@domain/community/community.types";
import { CommunityReportForm } from "./CommunityReportForm";
import { CommunityActionsMenu, type CommunityMenuItem } from "./CommunityActionsMenu";

interface CommunityActionsProps {
  targetType: ReportTargetType;
  targetId: string;
  authorId?: string;
  /** Owner of a shared item (an event organizer): hides the actions from them only. */
  ownerId?: string;
  allowBlock?: boolean;
}

/**
 * Contextual actions share the same server policy on all public surfaces.
 * `links` renders inline text actions; `menu` folds them behind a three-dot button.
 */
export function CommunityActions({
  variant = "links",
  ...props
}: CommunityActionsProps & { variant?: "links" | "menu" }) {
  return variant === "menu" ? <MenuActions {...props} /> : <LinkActions {...props} />;
}

/** Report and block state shared by both presentations, so their rules cannot drift. */
function useCommunityActionsState({
  targetType,
  targetId,
  authorId,
  ownerId,
  allowBlock = true,
}: CommunityActionsProps) {
  const { t } = useTranslation();
  const { user, report, block } = useCommunityActions();
  const { confirm } = useConfirm();
  const [reporting, setReporting] = useState<ReportTargetType | null>(null);
  const [reason, setReason] = useState<ReportReason>("SPAM");
  const [description, setDescription] = useState("");
  const start = (type: ReportTargetType) => {
    report.reset();
    setReporting(type);
  };
  /** Resolves true when the report was received; a failure keeps the draft for a retry. */
  const submit = async (type: ReportTargetType) => {
    try {
      await report.mutateAsync({
        targetType: type,
        targetId: type === "USER" ? (authorId ?? targetId) : targetId,
        reason,
        description,
      });
      setReporting(null);
      setDescription("");
      return true;
    } catch {
      /* Mutation state presents a recoverable error without losing the draft. */
      return false;
    }
  };
  const confirmBlock = () =>
    confirm({
      title: t("community.block"),
      message: t("community.blockConfirm"),
      confirmLabel: t("community.block"),
      cancelLabel: t("community.cancel"),
      variant: "danger",
    });
  return {
    t,
    report,
    block,
    visible: !!user && user.id !== authorId && user.id !== ownerId,
    pending: report.isPending || block.isPending,
    canReportUser: !!authorId && targetType !== "USER",
    /** Author the viewer may block from this surface, if any. */
    blockTarget: allowBlock ? authorId : undefined,
    targetType,
    reporting,
    start,
    cancel: () => setReporting(null),
    submit,
    confirmBlock,
    form: {
      reason,
      description,
      onReasonChange: setReason,
      onDescriptionChange: setDescription,
    },
  };
}

function LinkActions(props: CommunityActionsProps) {
  const state = useCommunityActionsState(props);
  const { t, report, block, pending, reporting, blockTarget } = state;
  if (!state.visible) return null;
  const blockUser = async (authorId: string) => {
    if (await state.confirmBlock()) block.mutate(authorId);
  };
  return (
    <div className="space-y-2 text-sm">
      <div className="flex flex-wrap gap-3">
        <Button
          variant="link"
          disabled={pending}
          onClick={() => state.start(state.targetType)}
        >
          {t("community.report")}
        </Button>
        {state.canReportUser && (
          <Button
            variant="link"
            disabled={pending}
            onClick={() => state.start("USER")}
          >
            {t("community.reportUser")}
          </Button>
        )}
        {blockTarget && (
          <Button
            variant="link"
            disabled={pending}
            onClick={() => {
              void blockUser(blockTarget);
            }}
          >
            {t("community.block")}
          </Button>
        )}
      </div>
      {reporting && (
        <CommunityReportForm
          {...state.form}
          pending={pending}
          onSubmit={() => {
            void state.submit(reporting);
          }}
          onCancel={state.cancel}
        />
      )}
      {report.isSuccess && <p role="status">{t("community.sent")}</p>}
      {(report.isError || block.isError) && (
        <p role="alert" className="text-danger">
          {communityErrorMessage(report.isError ? report.error : block.error, t)}
        </p>
      )}
    </div>
  );
}

function MenuActions(props: CommunityActionsProps) {
  const state = useCommunityActionsState(props);
  const { addToast } = useToast();
  const { t, report, block, pending, reporting, blockTarget } = state;
  if (!state.visible) return null;
  const submit = async (type: ReportTargetType) => {
    if (await state.submit(type)) addToast({ type: "success", message: t("community.sent") });
  };
  const blockUser = async (authorId: string) => {
    if (!(await state.confirmBlock())) return;
    block.mutate(authorId, {
      onSuccess: () => addToast({ type: "success", message: t("community.blocked") }),
      onError: (error) =>
        addToast({ type: "error", message: communityErrorMessage(error, t) }),
    });
  };
  const items: CommunityMenuItem[] = [
    { id: "report", label: t("community.report"), onSelect: () => state.start(state.targetType) },
  ];
  if (state.canReportUser) {
    items.push({ id: "reportUser", label: t("community.reportUser"), onSelect: () => state.start("USER") });
  }
  if (blockTarget) {
    items.push({
      id: "block",
      label: t("community.block"),
      danger: true,
      onSelect: () => {
        void blockUser(blockTarget);
      },
    });
  }
  return (
    <>
      <CommunityActionsMenu label={t("community.moreOptions")} items={items} disabled={pending} />
      <Modal
        isOpen={reporting !== null}
        onClose={state.cancel}
        title={t(reporting === "USER" ? "community.reportUser" : "community.report")}
      >
        <div className="space-y-3 text-sm">
          {reporting && (
            <CommunityReportForm
              {...state.form}
              pending={pending}
              className="space-y-3"
              onSubmit={() => {
                void submit(reporting);
              }}
              onCancel={state.cancel}
            />
          )}
          {report.isError && (
            <p role="alert" className="text-danger">
              {communityErrorMessage(report.error, t)}
            </p>
          )}
        </div>
      </Modal>
    </>
  );
}
