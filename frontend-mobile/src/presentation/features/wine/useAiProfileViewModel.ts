import { useCallback, useEffect, useRef } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/presentation/hooks/useAuth";
import { useProcessJourneyVisibility } from "@/presentation/hooks/useProcessJourneyVisibility";
import {
  useAiProfileStatus,
  useAiWineProfile,
  useGenerateAiProfile,
  useWineDetail,
} from "@/presentation/hooks/queries/wine";
import { retryableLoadError } from "@/presentation/feedback/illustratedState";
import { goBackOr } from "@/presentation/navigation/discoveryNavigation";
import { createWineDetailRoute } from "@/presentation/navigation/wineNavigation";
import { useToast } from "@/presentation/providers/ToastProvider";
import { ROLES } from "@/shared/config/roles";
import { AI_PROFILE_JOURNEY_MINIMUM_DURATION_MS } from "./wineProcessTiming";
import { aiProfileGenerationErrorKey } from "./aiProfileError";

/** Loads, generates and retries the AI profile of one wine. */
export function useAiProfileViewModel() {
  const { id, generate } = useLocalSearchParams<{ id: string; generate?: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { showError } = useToast();
  const { hasAnyRole } = useAuth();
  const canEdit = hasAnyRole([ROLES.ADMIN, ROLES.MODERATOR]);
  const autoGenerateStarted = useRef(false);
  const generationAwaitingProfile = useRef(false);

  const { data: wineDetail } = useWineDetail(id);
  const statusQuery = useAiProfileStatus(id, !!id);
  const { data: profileStatus, isLoading: isProfileStatusLoading, refetch: refetchProfileStatus } =
    statusQuery;
  const profileExists = profileStatus?.status === "GENERATED";
  const profileQuery = useAiWineProfile(id, !!id && profileExists);
  const { data: profile, isFetching: isProfileFetching } = profileQuery;
  const generateInitial = useGenerateAiProfile(id);
  const isGenerating = generateInitial.isPending;
  const isLoading = isProfileStatusLoading || (profileExists && profileQuery.isLoading);
  const generationJourney = useProcessJourneyVisibility({
    minimumDurationMs: AI_PROFILE_JOURNEY_MINIMUM_DURATION_MS,
    initiallyVisible: generate === "1",
  });
  // A failed read is not "no profile": offer Retry, and Generate only when none exists.
  // A 404 profile read still means there is nothing generated yet.
  const statusLoadError = retryableLoadError(statusQuery.isError, statusQuery.error);
  const profileLoadError = profileExists
    ? retryableLoadError(profileQuery.isError, profileQuery.error)
    : undefined;
  const loadError = statusLoadError ?? profileLoadError;

  const generateProfile = useCallback(() => {
    if (!id) return;
    generationJourney.start();
    generateInitial.mutate(undefined, {
      onSuccess: async () => {
        generationAwaitingProfile.current = true;
        try {
          await refetchProfileStatus();
        } catch {
          generationAwaitingProfile.current = false;
          generationJourney.cancel();
        }
      },
      onError: (error) => {
        generationJourney.cancel();
        showError(t(aiProfileGenerationErrorKey(error)));
      },
    });
  }, [generateInitial, generationJourney, id, refetchProfileStatus, showError, t]);

  const retryLoad = () => {
    if (statusLoadError) void refetchProfileStatus();
    else void profileQuery.refetch();
  };

  useEffect(() => {
    if (!generationAwaitingProfile.current || !profile || isProfileFetching) return;
    generationAwaitingProfile.current = false;
    generationJourney.complete();
  }, [generationJourney, isProfileFetching, profile]);

  useEffect(() => {
    if (generate !== "1" || autoGenerateStarted.current || !id || isProfileStatusLoading) {
      return;
    }
    autoGenerateStarted.current = true;
    if (!profileExists && !statusQuery.isError) generateProfile();
  }, [generate, generateProfile, id, isProfileStatusLoading, profileExists, statusQuery.isError]);

  const busy = isLoading || isGenerating || generationJourney.visible;

  return {
    id,
    wineDetail,
    profile,
    canEdit,
    showLoading: busy,
    showProfile: !busy && !!profile,
    showEmpty: !busy && !profile,
    loadError,
    /** The stored profile could not be read (a 404 included). */
    profileReadFailed: profileQuery.isError,
    generateProfile,
    retryLoad,
    goBack: () => goBackOr(router, id ? createWineDetailRoute(id) : "/(app)/(tabs)/wines"),
    openEditor: () => router.push({ pathname: "/(app)/admin/wines/[id]/ai-profile", params: { id } }),
    openCompare: () => {
      if (!id) return;
      router.push({ pathname: "/(app)/(tabs)/wines/compare", params: { wineAId: id } });
    },
  };
}
