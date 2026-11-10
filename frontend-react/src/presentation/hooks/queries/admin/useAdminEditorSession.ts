import { useEffect, useMemo, useRef } from 'react'

/** Ignore requests belonging to a closed or superseded editor. */
export function useAdminEditorSession() {
  const revision = useRef(0)
  useEffect(() => () => { revision.current += 1 }, [])
  return useMemo(() => ({
    begin: () => ++revision.current,
    current: () => revision.current,
    isCurrent: (value: number) => revision.current === value,
  }), [])
}
