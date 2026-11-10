import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { legalService } from "@/application/services/legal.service";
import { selectTerms, type TermsDocument } from "@/domain/legal/agreement";

type Snapshot = { key: string; document: TermsDocument; required: boolean };
/** Short-lived agreement workflow, never a persisted client-side proof of acceptance. */
export function useLegalAgreement(mode: "registration" | "account", userId?: string, enabled = true) {
  const { i18n } = useTranslation();
  const locale = i18n.language.startsWith("en") ? "en" : "es";
  const key = mode + ":" + (userId ?? "guest") + ":" + locale;
  const [snapshot, setSnapshot] = useState<Snapshot>();
  const [failure, setFailure] = useState<string>();
  const [revision, setRevision] = useState(0);
  const [choice, setChoice] = useState<string>();
  const [sending, setSending] = useState(false);
  const generation = useRef(0);
  const busy = useRef(false);
  const active = enabled && (mode === "registration" || !!userId);
  const load = useCallback(async (attempt: number, isActive: () => boolean) => {
      try {
        const result = mode === "account"
          ? await legalService.status(locale)
          : { document: await legalService.current(locale), required: true };
        if (isActive() && generation.current === attempt) {
          setSnapshot({ key, ...result });
          setFailure(undefined);
        }
      } catch {
        if (isActive() && generation.current === attempt) setFailure(key);
      }
  }, [key, mode, locale]);
  useEffect(() => {
    const attempt = ++generation.current;
    if (!active) return;
    let disposed = false;
    void load(attempt, () => !disposed);
    return () => { disposed = true; generation.current = attempt + 1; };
  }, [active, load, revision]);
  const document = snapshot?.key === key ? snapshot.document : undefined;
  const stamp = document ? key + ":" + document.contentHash : undefined;
  const checked = !!stamp && choice === stamp;
  const retry = () => {
    setSnapshot(undefined);
    setChoice(undefined);
    setFailure(undefined);
    setRevision(value => value + 1);
  };
  async function accept() {
    if (!document || !checked || busy.current) return;
    busy.current = true;
    setSending(true);
    const attempt = generation.current;
    try {
      const result = await legalService.accept(document);
      if (attempt === generation.current) {
        setSnapshot({ key, ...result });
        setFailure(undefined);
      }
    } catch {
      if (attempt === generation.current) {
        // A stale version must be reviewed again; do not silently retry consent.
        setChoice(undefined);
        setFailure(key);
      }
    } finally {
      busy.current = false;
      setSending(false);
    }
  }
  return {
    document, checked, setChecked: (value: boolean) => setChoice(value ? stamp : undefined),
    required: snapshot?.key !== key || snapshot.required,
    loading: active && !document && failure !== key,
    error: failure === key, sending, retry, accept, locale,
    selection: checked && document ? selectTerms(document) : undefined,
  };
}
