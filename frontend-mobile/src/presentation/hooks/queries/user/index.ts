/**
 * User query hooks powered by Redux Toolkit Query.
 */
import { useEffect, useRef } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import { useIsFocused } from "expo-router";
import type {
  AvatarUploadInput,
  DeleteAccountInput,
  UpdateProfileInput,
} from "@/application/services/users.service";
import type { UserStats } from "@/domain/user/user.types";
import type { PointsSummary } from "@/domain/points/points.types";
import type { BadgeTier } from "@/domain/points/badgeTiers";
import type { User } from "@/domain/user/user.types";
import type {
  NotificationCategory,
  NotificationChannel,
  NotificationPreferences,
} from "@/domain/notification/notificationPreferences";
import { useExecuteMutationMutation, useTypedQuery } from "@/presentation/store/api";
import { useMutationAdapter, useOperationMutation } from "@/presentation/store/mutationAdapter";

export function useUserStats(enabled = true) {
  return useTypedQuery<UserStats>(enabled ? { key: "user.stats" } : skipToken);
}

export function useUpdateProfile() {
  return useOperationMutation<User, UpdateProfileInput>((payload) => ({
    key: "user.profile.update",
    params: { payload },
  }));
}

export function useCompleteOnboarding() {
  return useOperationMutation<User, { username?: string }>(({ username }) => ({
    key: "user.onboarding.complete",
    params: { username },
  }));
}

export function useUploadAvatar() {
  return useOperationMutation<string, AvatarUploadInput>((payload) => ({
    key: "user.avatar.upload",
    params: { payload },
  }));
}

export function useChangePassword() {
  const [trigger, state] = useExecuteMutationMutation();
  return useMutationAdapter(
    ({ current, next }: { current: string; next: string }) =>
      trigger({ key: "user.password.change", params: { current, next } }),
    state,
  );
}

export function useDeactivateAccount() {
  return useOperationMutation<void, void>(() => ({ key: "user.account.deactivate" }));
}

export function useRequestEmailChange() {
  return useOperationMutation<string, string>((newEmail) => ({
    key: "user.email.change.request",
    params: { newEmail },
  }));
}

export function useDeleteAccount() {
  return useOperationMutation<void, DeleteAccountInput>((payload) => ({
    key: "user.account.delete",
    params: { payload },
  }));
}

export function useNotificationPreferences(enabled = true) {
  return useTypedQuery<NotificationPreferences>(enabled ? { key: "user.notificationPreferences" } : skipToken);
}

export function useSetNotificationChannel() {
  return useOperationMutation<
    NotificationPreferences,
    { category: NotificationCategory; channel: NotificationChannel; enabled: boolean }
  >(({ category, channel, enabled }) => ({
    key: "user.notificationPreferences.channel",
    params: { category, channel, enabled },
  }));
}

export function useSetMarketingConsent() {
  return useOperationMutation<NotificationPreferences, boolean>((granted) => ({
    key: "user.notificationPreferences.consent",
    params: { granted },
  }));
}

export function usePointsSummary(enabled = true) {
  return useTypedQuery<PointsSummary>(enabled ? { key: "user.points" } : skipToken);
}

/**
 * Points for a screen that shows them (profile, Tus puntos). Points also come from other
 * people's actions (likes, moderation), so the summary is fetched again every time the
 * screen opens or comes back into view, not only when the app returns to the foreground.
 */
export function useFreshPointsSummary(enabled = true) {
  const focused = useIsFocused();
  const query = useTypedQuery<PointsSummary>(enabled ? { key: "user.points" } : skipToken, {
    refetchOnMountOrArgChange: true,
  });
  const { refetch } = query;
  const wasFocused = useRef(focused);
  useEffect(() => {
    const regained = focused && !wasFocused.current;
    wasFocused.current = focused;
    if (regained && enabled) void refetch();
  }, [enabled, focused, refetch]);
  return query;
}

export function useMarkTierCelebrated() {
  return useOperationMutation<null, BadgeTier>((tier) => ({ key: "user.points.celebrate", params: { tier } }));
}

export function useDismissPointsWelcome() {
  return useOperationMutation<null, void>(() => ({ key: "user.points.dismissWelcome" }));
}
