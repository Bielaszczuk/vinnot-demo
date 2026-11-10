import type { AdminEvent } from "@/domain/admin/admin.types";
import { useAdminEventMutations } from "@/presentation/hooks/queries/admin";
import { EventEditorSheet } from "../event/EventEditorSheet";

export function AdminEventSheet({
  visible,
  editingEvent,
  onClose,
}: {
  visible: boolean;
  editingEvent?: AdminEvent | null;
  onClose: () => void;
}) {
  const { create, update } = useAdminEventMutations();
  return (
    <EventEditorSheet
      visible={visible}
      event={editingEvent}
      onClose={onClose}
      saving={create.isPending || update.isPending}
      onSave={(payload) =>
        editingEvent?.id
          ? update.mutateAsync({ id: editingEvent.id, payload })
          : create.mutateAsync(payload)
      }
    />
  );
}
