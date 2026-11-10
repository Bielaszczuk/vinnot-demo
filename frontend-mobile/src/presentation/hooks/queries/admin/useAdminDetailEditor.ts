import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLazyExecuteQueryQuery } from "@/presentation/store/api";
import { useToast } from "@/presentation/providers/ToastProvider";

type Entity = "wine" | "winery" | "event" | "route";

/** An editor never opens from a summary; stale responses cannot replace another draft. */
export function useAdminDetailEditor<T extends { id: string }>(entity: Entity) {
  const [load] = useLazyExecuteQueryQuery();
  const { t } = useTranslation();
  const { showError } = useToast();
  const [editing, setEditing] = useState<T | null>(null);
  const [visible, setVisible] = useState(false);
  const [isLoading, setLoading] = useState(false);
  const requestVersion = useRef(0);
  useEffect(
    () => () => {
      requestVersion.current += 1;
    },
    [],
  );

  function close() {
    requestVersion.current += 1;
    setVisible(false);
    setLoading(false);
  }
  function openCreate() {
    requestVersion.current += 1;
    setLoading(false);
    setEditing(null);
    setVisible(true);
  }
  async function openEdit(item: T) {
    const version = ++requestVersion.current;
    setVisible(false);
    setLoading(true);
    try {
      const detail = (await load(
        { key: `admin.${entity}.detail`, params: { id: item.id } },
        false,
      ).unwrap()) as T;
      if (version !== requestVersion.current) return;
      setEditing(detail);
      setVisible(true);
    } catch {
      if (version === requestVersion.current) showError(t("admin.feedback.loadError"));
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }
  return { editing, visible, isLoading, openCreate, openEdit, close };
}
