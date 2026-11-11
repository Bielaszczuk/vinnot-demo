/**
 * View model of a public profile: the profile, the follow toggle, the own taste quiz state,
 * the own structure editor, and the Reseñas / Cava sections with their paging and the locked
 * cellar.
 */
import { useState } from "react";
import { followersCountShown, isCellarHiddenError } from "@/domain/social/socialRules";
import { useAuth } from "@/presentation/hooks/useAuth";
import {
  useProfileCellar,
  useProfileReviews,
  usePublicProfile,
  useTasteQuiz,
} from "@/presentation/hooks/queries/social";
import { useFollowToggle } from "./useFollowToggle";
import { useTasteStructureEditor } from "./useTasteStructureEditor";

const NO_STRUCTURE: never[] = [];

export type ProfileSection = "reviews" | "cellar";

export function usePublicProfileViewModel(userId: string | undefined) {
  const { user } = useAuth();
  const profileQuery = usePublicProfile(userId);
  const profile = profileQuery.data;
  const isOwn = !!user && !!userId && user.id === userId;
  const follow = useFollowToggle(userId ?? "", profile?.following ?? false);
  // Only the owner sees the quiz entry, so only the owner asks for the quiz state.
  const quiz = useTasteQuiz(isOwn);
  const tasteEditor = useTasteStructureEditor(profile?.tasteTraits?.structure ?? NO_STRUCTURE);
  const [section, setSection] = useState<ProfileSection>("reviews");

  const reviews = useProfileReviews(userId);
  const cellarVisible = !!profile?.cellarVisible;
  const cellar = useProfileCellar(userId, cellarVisible && section === "cellar");
  const cellarLocked = !!profile && (!cellarVisible || isCellarHiddenError(cellar.error));

  const followersCount = profile
    ? followersCountShown(profile.followersCount, profile.following, follow.following)
    : 0;

  const refresh = () => {
    void profileQuery.refetch();
    if (section === "reviews") reviews.refresh();
    else if (!cellarLocked) cellar.refresh();
  };

  return {
    profile,
    isLoading: profileQuery.isLoading && !profile,
    isError: profileQuery.isError && !profile,
    error: profileQuery.error,
    isRefreshing: profileQuery.isFetching && !!profile,
    isOwn,
    quizCompleted: quiz.data?.status === "COMPLETED",
    // Visitors never get the editor, so they never see its controls.
    tasteEditor: isOwn ? tasteEditor : null,
    follow,
    followersCount,
    section,
    setSection,
    reviews,
    cellar,
    cellarLocked,
    refresh,
    retry: () => void profileQuery.refetch(),
  };
}
