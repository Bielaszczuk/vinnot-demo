import type { PartnerEvent } from "@/domain/partner/partner.types";
import { usePartnerEventMutations } from "@/presentation/hooks/queries/partner";
import { EventEditorSheet } from "../event/EventEditorSheet";

export function PartnerEventSheet({
  visible,
  editingEvent,
  onClose,
}: {
  visible: boolean;
  editingEvent: PartnerEvent | null;
  onClose: () => void;
}) {
  const { create, update } = usePartnerEventMutations();
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
