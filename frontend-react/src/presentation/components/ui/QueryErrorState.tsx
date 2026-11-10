import { useTranslation } from "react-i18next";
import { resolveIllustratedState } from "@/presentation/feedback/illustratedState";
import { useRetryDeadline } from "@/presentation/hooks/useRetryDeadline";
import { IllustratedState } from "./IllustratedState";
import { Button } from "./Button";
/** Explicit retries of reads only; mutations retain their own recovery semantics. */
export function QueryErrorState({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  const blocked = useRetryDeadline(error);
  const kind = resolveIllustratedState(error);
  return (
    <IllustratedState kind={kind} compact>
      {!["session", "forbidden", "notFound"].includes(kind) && (
        <Button onClick={onRetry} disabled={blocked}>
          {t("common.retry", "Reintentar")}
        </Button>
      )}
    </IllustratedState>
  );
}
