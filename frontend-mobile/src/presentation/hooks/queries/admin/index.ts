/**
 * Admin query hooks powered by Redux Toolkit Query.
 */
import { skipToken } from "@reduxjs/toolkit/query";
import type {
  AdminEvent,
  AdminEventPayload,
  AdminPaginatedResult,
  AdminRegion,
  AdminRoute,
  AdminRoutePayload,
  AdminStats,
  AdminUser,
  AdminReview,
  AdminWine,
  AdminWinePayload,
  AdminWinery,
  AdminWineryPayload,
  AdminCountry,
} from "@/domain/admin/admin.types";
import type { AdminUserUpdate } from "@/domain/admin/adminUserDraft";
import type { SuspensionReason } from "@/domain/admin/suspensionReason";
import {
  useExecuteMutationMutation,
  useTypedQuery,
  useTypedQueryList,
} from "@/presentation/store/api";
import { useMutationAdapter, useOperationMutation } from "@/presentation/store/mutationAdapter";
import type { AiWineProfile } from "@/domain/wine/wine.types";
import type { ProfileContent } from "@/domain/wine/wine-profile.validators";
import type { EventCancellationRequest } from "@/domain/event/eventCancellation";

export function useAdminStats() {
  return useTypedQuery<AdminStats>({ key: "admin.stats" });
}

export function useAdminWines(page = 0, size = 20, search?: string) {
  return useTypedQuery<AdminPaginatedResult<AdminWine>>({
    key: "admin.wines",
    params: { page, size, search },
  });
}

export function useAdminWineMutations() {
  const [createTrigger, createState] = useExecuteMutationMutation();
  const [updateTrigger, updateState] = useExecuteMutationMutation();
  const [deleteTrigger, deleteState] = useExecuteMutationMutation();

  const create = useMutationAdapter(
    (payload: AdminWinePayload) => createTrigger({ key: "admin.wine.create", params: { payload } }),
    createState,
  );
  const update = useMutationAdapter(
    ({ id, payload }: { id: string; payload: Partial<AdminWinePayload> }) =>
      updateTrigger({ key: "admin.wine.update", params: { id, payload } }),
    updateState,
  );
  const remove = useMutationAdapter(
    (id: string) => deleteTrigger({ key: "admin.wine.delete", params: { id } }),
    deleteState,
  );

  return { create, update, remove };
}

export function useAdminWineries(
  page = 0,
  size = 20,
  search?: string,
  country?: string,
  region?: string,
) {
  return useTypedQuery<AdminPaginatedResult<AdminWinery>>({
    key: "admin.wineries",
    params: { page, size, search, country, region },
  });
}

export function useAdminWineryMutations() {
  const [createTrigger, createState] = useExecuteMutationMutation();
  const [updateTrigger, updateState] = useExecuteMutationMutation();
  const [deleteTrigger, deleteState] = useExecuteMutationMutation();

  const create = useMutationAdapter(
    (payload: AdminWineryPayload) =>
      createTrigger({ key: "admin.winery.create", params: { payload } }),
    createState,
  );
  const update = useMutationAdapter(
    ({ id, payload }: { id: string; payload: AdminWineryPayload }) =>
      updateTrigger({ key: "admin.winery.update", params: { id, payload } }),
    updateState,
  );
  const remove = useMutationAdapter(
    (id: string) => deleteTrigger({ key: "admin.winery.delete", params: { id } }),
    deleteState,
  );

  return { create, update, remove };
}

export function useAdminEvents(page = 0, size = 20, search?: string) {
  return useTypedQuery<AdminPaginatedResult<AdminEvent>>({
    key: "admin.events",
    params: { page, size, search },
  });
}

export function useAdminEventMutations() {
  const [createTrigger, createState] = useExecuteMutationMutation();
  const [updateTrigger, updateState] = useExecuteMutationMutation();
  const [deleteTrigger, deleteState] = useExecuteMutationMutation();

  const create = useMutationAdapter(
    (payload: AdminEventPayload) =>
      createTrigger({ key: "admin.event.create", params: { payload } }),
    createState,
  );
  const update = useMutationAdapter(
    ({ id, payload }: { id: string; payload: AdminEventPayload }) =>
      updateTrigger({ key: "admin.event.update", params: { id, payload } }),
    updateState,
  );
  const remove = useMutationAdapter(
    ({ id, cancellation }: { id: string; cancellation?: EventCancellationRequest }) =>
      deleteTrigger({ key: "admin.event.delete", params: { id, cancellation } }),
    deleteState,
  );

  return { create, update, remove };
}

export function useAdminRoutes(page = 0, size = 20, search?: string) {
  return useTypedQuery<AdminPaginatedResult<AdminRoute>>({
    key: "admin.routes",
    params: { page, size, search },
  });
}

export function useAdminRouteDetail(id: string | undefined) {
  return useTypedQuery<AdminRoute>(id ? { key: "admin.route.detail", params: { id } } : skipToken);
}

export function useAdminRouteMutations() {
  const [createTrigger, createState] = useExecuteMutationMutation();
  const [updateTrigger, updateState] = useExecuteMutationMutation();
  const [deleteTrigger, deleteState] = useExecuteMutationMutation();

  const create = useMutationAdapter(
    (payload: AdminRoutePayload) =>
      createTrigger({ key: "admin.route.create", params: { payload } }),
    createState,
  );
  const update = useMutationAdapter(
    ({ id, payload }: { id: string; payload: AdminRoutePayload }) =>
      updateTrigger({ key: "admin.route.update", params: { id, payload } }),
    updateState,
  );
  const remove = useMutationAdapter(
    (id: string) => deleteTrigger({ key: "admin.route.delete", params: { id } }),
    deleteState,
  );

  return { create, update, remove };
}

export function useAdminUsers(page = 0, size = 20, search?: string) {
  return useTypedQuery<AdminPaginatedResult<AdminUser>>({
    key: "admin.users",
    params: { page, size, search },
  });
}

export function useAdminUserMutations() {
  const [updateRoleTrigger, updateRoleState] = useExecuteMutationMutation();
  const [banTrigger, banState] = useExecuteMutationMutation();
  const [unbanTrigger, unbanState] = useExecuteMutationMutation();
  const [deleteTrigger, deleteState] = useExecuteMutationMutation();
  const [updateTrigger, updateState] = useExecuteMutationMutation();

  const update = useMutationAdapter(
    ({ userId, update: changes }: { userId: string; update: AdminUserUpdate }) =>
      updateTrigger({ key: "admin.user.update", params: { userId, update: changes } }),
    updateState,
  );
  const updateRole = useMutationAdapter(
    ({ userId, role }: { userId: string; role: string }) =>
      updateRoleTrigger({ key: "admin.user.updateRole", params: { userId, role } }),
    updateRoleState,
  );
  const ban = useMutationAdapter(
    ({ userId, reasonCode, note }: { userId: string; reasonCode: SuspensionReason; note?: string }) =>
      banTrigger({ key: "admin.user.ban", params: { userId, reasonCode, note } }),
    banState,
  );
  const unban = useMutationAdapter(
    (userId: string) => unbanTrigger({ key: "admin.user.unban", params: { userId } }),
    unbanState,
  );
  const remove = useMutationAdapter(
    (userId: string) => deleteTrigger({ key: "admin.user.delete", params: { userId } }),
    deleteState,
  );

  return { update, updateRole, ban, unban, remove };
}

export function useAdminReviews(page = 0, size = 20, search?: string) {
  return useTypedQuery<AdminPaginatedResult<AdminReview>>({
    key: "admin.reviews",
    params: { page, size, search },
  });
}

export function useAdminReviewMutations() {
  const [deleteTrigger, deleteState] = useExecuteMutationMutation();
  const remove = useMutationAdapter(
    (id: string) => deleteTrigger({ key: "admin.review.delete", params: { id } }),
    deleteState,
  );
  return { remove };
}

export function useAdminCountries() {
  return useTypedQueryList<AdminCountry>({ key: "admin.countries" });
}

export function useAdminWinerySearch(search: string, page = 0, size = 10) {
  const normalized = search.trim();
  return useTypedQuery<AdminPaginatedResult<AdminWinery>>(
    normalized.length >= 2
      ? { key: "admin.wineries.search", params: { search: normalized, page, size } }
      : skipToken,
  );
}

/** Catalog wines for a picker: searches from two letters, never lists the whole catalog. */
export function useAdminWineSearch(search: string, size = 10) {
  const normalized = search.trim();
  return useTypedQuery<AdminPaginatedResult<AdminWine>>(
    normalized.length >= 2
      ? { key: "admin.wines", params: { page: 0, size, search: normalized } }
      : skipToken,
  );
}

export function useAdminAiProfileMutation() {
  return useOperationMutation<AiWineProfile, { wineId: string; profileJson: ProfileContent; language: string }>(
    ({
      wineId,
      profileJson,
      language,
    }) => ({ key: "admin.aiProfile.update", params: { wineId, profileJson, language } }),
  );
}

export function useAdminRegions(countryId: string | undefined) {
  return useTypedQueryList<AdminRegion>(
    countryId ? { key: "admin.regions", params: { countryId } } : skipToken,
  );
}

export * from "./useAdminNotifications";
export * from "./useAdminSocialPosts";
