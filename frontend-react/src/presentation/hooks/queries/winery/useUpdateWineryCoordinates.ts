/**
 * useUpdateWineryCoordinates — persist inferred geocoded coordinates for a winery
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { wineriesService } from '@services/wineries.service'
import { queryKeys } from '@hooks/queries/queryKeys'

interface UpdateWineryCoordinatesVars {
  id: string
  latitude: number
  longitude: number
  address?: string | null
}

export function useUpdateWineryCoordinates() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, UpdateWineryCoordinatesVars>({
    mutationFn: ({ id, latitude, longitude, address }) =>
      wineriesService.updateWineryCoordinates(id, latitude, longitude, address),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.wineries.detail(variables.id),
      })
    },
  })
}

