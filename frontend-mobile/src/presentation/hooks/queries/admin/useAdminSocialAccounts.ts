/**
 * Admin social accounts query hook (#510): the connection state of each network, through the shared RTK Query
 * operations. Read-only on mobile: connecting an OAuth network happens in the web admin.
 */
import { skipToken } from "@reduxjs/toolkit/query";
import { useTypedQuery } from "@/presentation/store/api";
import type { SocialAccount } from "@/domain/admin/socialAccount";

export function useAdminSocialAccounts(enabled = true) {
  return useTypedQuery<SocialAccount[]>(enabled ? { key: "admin.socialAccounts.list" } : skipToken);
}
