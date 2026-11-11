interface UserHandleProps {
  username?: string | null
  /** Text size and spacing; the muted gray stays the same everywhere. */
  className?: string
}

/** The author's `@username` in muted gray under their name; renders nothing without a username. */
export function UserHandle({ username, className = 'text-xs' }: UserHandleProps) {
  const handle = username?.trim()
  if (!handle) return null
  return <span className={`block truncate text-gray-500 ${className}`.trim()}>@{handle}</span>
}
