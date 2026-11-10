import { useRef, useState } from "react";
import { useRetryDeadline } from "./useRetryDeadline";
import { supportService } from "@/application/services/support.service";
import { isSupportMessageValid, type SupportLanguage, type SupportMessage } from "@/domain/public/support";

const emptyForm: SupportMessage = { name: "", email: "", subject: "support", message: "" };
export function useSupportForm(identity?: { email: string; name: string }, language: SupportLanguage = "es") {
  const [draft, setForm] = useState<SupportMessage>(emptyForm);
  const form = { ...draft, email: identity?.email ?? draft.email, name: draft.name || identity?.name || "" };
  const [sending, setSending] = useState(false);
  const [receipt, setReceipt] = useState<string>();
  const [error, setError] = useState<"invalid" | "failed">();
  const [failure, setFailure] = useState<unknown>();
  const retryBlocked = useRetryDeadline(failure);
  const inFlight = useRef(false);
  const attempt = useRef<{ content: string; id: string } | null>(null);
  async function submit() {
    if (inFlight.current || retryBlocked) return;
    setError(undefined);
    setFailure(undefined);
    if (!isSupportMessageValid(form)) {
      setError("invalid");
      return;
    }
    inFlight.current = true;
    setSending(true);
    setReceipt(undefined);
    try {
      const content = JSON.stringify(form);
      if (attempt.current?.content !== content)
        attempt.current = { content, id: supportService.newRequestId() };
      const id = await supportService.submit({ ...form, requestId: attempt.current.id, language });
      setReceipt(id);
      setForm(emptyForm);
      attempt.current = null;
    } catch (cause) {
      setFailure(cause);
      setError("failed");
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  }
  return { form, setForm, sending, receipt, error, retryBlocked, submit };
}
