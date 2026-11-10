/**
 * Points cache helpers shared by every mutation that can award or revoke points.
 */
import type { QueryClient } from '@tanstack/react-query'
import { queryKeys } from '@hooks/queries/queryKeys'

/** Refreshes the signed-in user's points, tier and history after an awarding action. */
export function invalidateMyPoints(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.users.myPoints() })
}
