/**
 * ReviewFormSheet — writes or edits a wine review in a bottom sheet.
 * Publication and toasts stay in ReviewForm. The sheet decides what closing does to the draft:
 * a swipe, a backdrop tap or Back keep it untouched (closing by accident loses nothing), and
 * Cancel asks before discarding unsaved changes. Nothing closes it while a review is publishing.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@/presentation/components/ui/BottomSheet";
import { useSheetDismissGuard } from "@/presentation/components/ui/useSheetDismissGuard";
import { reviewDraftKey, useReviewDraft } from "@/presentation/hooks/useReviewDrafts";
import type { WineReview } from "@/domain/wine/wine.types";
import { lightTokens } from "@/shared/theme/tokens";
import { hasUnsavedReviewChanges, ReviewForm } from "./ReviewForm";

interface ReviewFormSheetProps {
  wineId: string;
  /** The reader's own review to edit; none writes a new one. */
  review?: WineReview | null;
  visible: boolean;
  onClose: () => void;
}

export function ReviewFormSheet({ wineId, review, visible, onClose }: ReviewFormSheetProps) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["90%"], []);
  // The form lives only while the sheet is up, so every opening mounts it again: the draft is
  // read afresh and an unrated pour control uncorks. It is kept, with the review it opened
  // with, through the closing slide, so an edit never flashes into an empty new review.
  const [shown, setShown] = useState<{ review: WineReview | null } | null>(
    visible ? { review: review ?? null } : null,
  );
  if (visible && (!shown || shown.review !== (review ?? null))) setShown({ review: review ?? null });
  const openedReview = shown?.review ?? review ?? null;
  const { draft, clear } = useReviewDraft(reviewDraftKey(wineId, openedReview?.id));
  const [busy, setBusy] = useState(false);
  const discard = useCallback(() => {
    clear();
    onClose();
  }, [clear, onClose]);
  // Only Cancel goes through the guard; the sheet's own dismissal never asks and keeps the draft.
  const guard = useSheetDismissGuard({
    sheetRef,
    visible,
    dirty: hasUnsavedReviewChanges(draft, openedReview),
    busy,
    onClose: discard,
  });

  useEffect(() => {
    if (visible) sheetRef.current?.present();
    else sheetRef.current?.dismiss();
  }, [visible]);

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      // The bottle and the slider bar are dragged sideways: only the handle moves the sheet.
      enableContentPanningGesture={false}
      enablePanDownToClose={guard.enablePanDownToClose}
      onDismiss={() => {
        setShown(null);
        setBusy(false);
        onClose();
      }}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior={guard.backdropPressBehavior} />
      )}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {shown && (
          <ReviewForm wineId={wineId} review={shown.review} framed={false} onCancel={guard.requestClose}
            onSuccess={onClose} onBusyChange={setBusy} />
        )}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheetBackground: { backgroundColor: lightTokens.surfaceDefault },
  handle: { backgroundColor: lightTokens.borderStrong },
  content: { paddingHorizontal: 20, paddingBottom: 34 },
});
