import { useCallback, useEffect, useRef, useReducer } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";
import type { EventDraft, EventDraftValues } from "@/domain/event/eventDraft";
import { eventDraftService } from "@/application/services/eventDraft.instance";
import { useAuth } from "@/presentation/hooks/useAuth";

/** Owns recovery UI and form subscriptions, never device storage or event publication. */
export function useEventDraftRecovery<T extends FieldValues>(active: boolean, eventId: string | undefined, form: UseFormReturn<T>) {
  const { user } = useAuth();
  const owner = user?.id;
  const scope = useRef({ active, owner, eventId });
  scope.current = { active, owner, eventId };
  type DraftState = { status: "loading" | "ready" | "saving" | "saved" | "error"; recovery: EventDraft | null; confirmDiscard: boolean };
  const [state, dispatch] = useReducer((current: DraftState, patch: Partial<DraftState>) => ({ ...current, ...patch }), {
    status: "loading", recovery: null, confirmDiscard: false,
  });
  const { status, recovery, confirmDiscard } = state;
  const setConfirmDiscard = (value: boolean) => dispatch({ confirmDiscard: value });
  const { getValues, reset, watch } = form;
  const session = useRef(0);
  const ready = useRef(false);
  const baseline = useRef<T>(getValues());
  const lastSaved = useRef("");
  const committed = useRef(false);
  const writeRevision = useRef(0);
  const pendingWrites = useRef(0);

  const persist = useCallback(async () => {
    if (!scope.current.active || scope.current.owner !== owner || scope.current.eventId !== eventId) return false;
    if (!owner || !ready.current || committed.current) return true;
    const values = getValues();
    const serialized = JSON.stringify(values);
    if (serialized === lastSaved.current && pendingWrites.current === 0) return true;
    const revision = session.current;
    const write = ++writeRevision.current;
    pendingWrites.current += 1;
    dispatch({ status: "saving" });
    try {
      await eventDraftService.save(owner, eventId, values as EventDraftValues);
      if (revision === session.current && write === writeRevision.current) { lastSaved.current = serialized; dispatch({ status: "saved" }); }
      return revision === session.current;
    } catch {
      if (revision === session.current && write === writeRevision.current) dispatch({ status: "error" });
      return false;
    } finally { pendingWrites.current -= 1; }
  }, [owner, eventId, getValues]);

  useEffect(() => {
    const revision = ++session.current;
    ready.current = false;
    committed.current = false;
    dispatch({ recovery: null, confirmDiscard: false, status: active && owner ? "loading" : "ready" });
    if (!active) return;
    baseline.current = getValues();
    lastSaved.current = JSON.stringify(baseline.current);
    if (!owner) return;
    void eventDraftService.load(owner, eventId, Object.keys(baseline.current)).then(draft => {
      if (revision !== session.current) return;
      ready.current = !draft;
      dispatch({ recovery: draft, status: "ready" });
    }).catch(() => {
      if (revision === session.current) { ready.current = true; dispatch({ status: "error" }); }
    });
    return () => { session.current += 1; ready.current = false; };
  }, [active, owner, eventId, getValues]);

  useEffect(() => {
    if (!active) return;
    const subscription = watch(() => { void persist(); });
    return () => subscription.unsubscribe();
  }, [active, watch, persist]);

  const restore = () => {
    if (!recovery) return;
    const compatible = Object.fromEntries(Object.entries(recovery.values).filter(([field, value]) => {
      const original = baseline.current[field];
      // Numeric controls can hold raw text (including an empty unfinished field).
      // Restore that input verbatim; the form resolver validates it on submission.
      return original === null || typeof original === typeof value
        || (typeof original === "number" && typeof value === "string");
    }));
    reset({ ...baseline.current, ...compatible } as T);
    lastSaved.current = JSON.stringify(getValues());
    dispatch({ recovery: null });
    ready.current = true;
    dispatch({ status: "saved" });
  };
  const discard = async () => {
    if (!owner) return;
    const revision = session.current;
    writeRevision.current += 1;
    ready.current = false;
    dispatch({ status: "loading" });
    try {
      await eventDraftService.remove(owner, eventId);
      if (revision !== session.current) return;
      reset(baseline.current);
      lastSaved.current = JSON.stringify(baseline.current);
      dispatch({ recovery: null });
      setConfirmDiscard(false);
      ready.current = true;
      dispatch({ status: "ready" });
    } catch { if (revision === session.current) { ready.current = !recovery; dispatch({ status: "error" }); } }
  };
  const complete = async () => {
    if (scope.current.owner === owner && scope.current.eventId === eventId) committed.current = true;
    if (owner) await eventDraftService.remove(owner, eventId);
  };
  return { status, recovery, restore, discard, confirmDiscard, setConfirmDiscard, persist, complete,
    blocked: status === "loading" || !!recovery };
}
