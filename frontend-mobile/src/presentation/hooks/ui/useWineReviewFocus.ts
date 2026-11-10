import { useRef, useState } from "react";
import type { LayoutChangeEvent, ScrollViewInstance } from "react-native";
import { useRouter } from "expo-router";
import { useMyReviewStatus } from "@/presentation/hooks/queries/wine/useWines";
import { useAuth } from "@/presentation/hooks/useAuth";

type Tab = "info" | "reviews" | "ai";

/**
 * Focus the reviews section of a wine detail.
 *
 * The `review=mine` deep link jumps once to the own review, after both it and the section have laid out.
 * The `tab=reviews` link (a card's review count) opens the reviews tab and glides once to the section.
 * `focusReviews` is the hero shortcut: it opens the reviews tab and glides to the section, pinning the
 * own review first when the reader already has one (otherwise the shortcut also opens the review sheet).
 */
export function useWineReviewFocus(wineId: string, focusOwnReview: boolean, openReviews = false) {
  const target = `${wineId}:${focusOwnReview}:${openReviews}`;
  const initialTab: Tab = focusOwnReview || openReviews ? "reviews" : "info";
  const [selection, setSelection] = useState<{ target: string; tab: Tab; pinOwnReview: boolean }>({
    target,
    tab: initialTab,
    pinOwnReview: false,
  });
  if (selection.target !== target) {
    setSelection({ target, tab: initialTab, pinOwnReview: false });
  }
  const scrollRef = useRef<ScrollViewInstance>(null);
  const section = useRef<{ target: string; y: number } | null>(null);
  const readyTarget = useRef<string | null>(null);
  const scrolledTarget = useRef<string | null>(null);
  const request = useRef<{ target: string; ownReview: boolean } | null>(null);

  const focusDeepLink = () => {
    if (!(focusOwnReview || openReviews) || selection.tab !== "reviews" ||
        (focusOwnReview && readyTarget.current !== target) ||
        section.current?.target !== target || scrolledTarget.current === target || !scrollRef.current) return;
    scrollRef.current.scrollTo({ y: section.current.y, animated: !focusOwnReview });
    scrolledTarget.current = target;
  };

  // The section ref only holds a position while the reviews tab is mounted (see focusReviews).
  const focusRequest = () => {
    const pending = request.current;
    if (!pending || pending.target !== target || section.current?.target !== target || !scrollRef.current) return;
    if (pending.ownReview && readyTarget.current !== target) return;
    scrollRef.current.scrollTo({ y: section.current.y, animated: true });
    request.current = null;
  };

  const focus = () => {
    focusDeepLink();
    focusRequest();
  };

  return {
    tab: selection.tab,
    setTab: (tab: Tab) => setSelection({ ...selection, target, tab }),
    /** Whether the reviews list should load and pin the reader's own review. */
    focusOwnReview: focusOwnReview || selection.pinOwnReview,
    scrollRef,
    onSectionLayout: (event: LayoutChangeEvent) => {
      section.current = { target, y: event.nativeEvent.layout.y };
      focus();
    },
    onOwnReviewLayout: () => {
      readyTarget.current = target;
      focus();
    },
    focusReviews: (hasOwnReview: boolean) => {
      // Another tab unmounted the section: wait for its next layout instead of a stale position.
      if (selection.tab !== "reviews") {
        section.current = null;
        readyTarget.current = null;
      }
      request.current = { target, ownReview: hasOwnReview };
      setSelection({ target, tab: "reviews", pinOwnReview: hasOwnReview });
      focusRequest();
    },
  };
}

/**
 * Hero "write review" shortcut: a signed-out reader logs in first (like Add to Cellar);
 * a reader who already reviewed the wine is taken to that review; anyone else gets the
 * reviews tab with the review sheet opened over it.
 */
export function useWineReviewShortcut(
  wineId: string,
  focusReviews: (hasOwnReview: boolean) => void,
  writeReview: () => void,
) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { data: status } = useMyReviewStatus(isAuthenticated ? wineId : undefined);
  const hasOwnReview = isAuthenticated && !!status?.hasReview;
  return {
    hasOwnReview,
    open: () => {
      if (!isAuthenticated) {
        router.push("/(auth)/login");
        return;
      }
      focusReviews(hasOwnReview);
      if (!hasOwnReview) writeReview();
    },
  };
}
