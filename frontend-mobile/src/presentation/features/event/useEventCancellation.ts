import { useState } from "react";
import type { EventCancellationRequest } from "@/domain/event/eventCancellation";
import { useSingleAction } from "@/presentation/hooks/useSingleAction";
import type { CancelEventSheetProps } from "./CancelEventSheet";

interface CancellableEvent {
  id: string;
  title: string;
}

interface UseEventCancellationOptions {
  cancel: (input: { id: string; cancellation: EventCancellationRequest }) => Promise<unknown>;
  onSuccess: () => void;
  onError: () => void;
}

/** Drives the cancel sheet: one target event, one in-flight cancellation, retry on failure. */
export function useEventCancellation({ cancel, onSuccess, onError }: UseEventCancellationOptions) {
  const [target, setTarget] = useState<CancellableEvent | null>(null);
  const [open, setOpen] = useState(false);
  const action = useSingleAction();

  const request = (event: CancellableEvent) => {
    if (action.pending) return;
    setTarget(event);
    setOpen(true);
  };

  /** The sheet is gone once dismissed; a cancellation still in flight reports through its toast. */
  const close = () => setOpen(false);

  const confirm = (cancellation: EventCancellationRequest) => {
    if (!target) return;
    const id = target.id;
    return action.run(
      () => cancel({ id, cancellation }),
      () => {
        setOpen(false);
        onSuccess();
      },
      onError,
    );
  };

  const sheet: CancelEventSheetProps = {
    visible: open,
    eventTitle: target?.title ?? "",
    busy: action.pending,
    onConfirm: (cancellation) => void confirm(cancellation),
    onClose: close,
  };

  return { request, pending: action.pending, sheet };
}
