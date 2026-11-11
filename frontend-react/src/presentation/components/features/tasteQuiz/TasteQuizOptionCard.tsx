/**
 * TasteQuizOptionCard — one answer of the taste quiz: its watercolor on a cream stage and its label.
 * A toggle button: the pressed state tells screen readers which option is chosen. The art is decorative.
 */
import { Check } from 'lucide-react'
import { Icon } from '@components/ui/Icon'

interface TasteQuizOptionCardProps {
  label: string
  artUrl: string | null
  selected: boolean
  onSelect: () => void
}

export function TasteQuizOptionCard({ label, artUrl, selected, onSelect }: TasteQuizOptionCardProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`group relative flex w-full flex-col overflow-hidden rounded-3xl bg-white text-center shadow-sm transition duration-200 ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine-500 focus-visible:ring-offset-4 motion-safe:hover:-translate-y-0.5 hover:shadow-md hover:shadow-wine-950/10 ${
        selected ? 'shadow-md shadow-wine-950/10 ring-2 ring-wine-700' : 'ring-1 ring-wine-100 hover:ring-wine-200'
      }`}
    >
      <span
        className={`relative flex aspect-square items-center justify-center bg-gradient-to-b transition-colors duration-200 motion-reduce:transition-none ${
          selected ? 'from-wine-50 to-surface-cream' : 'from-surface-cream to-white'
        }`}
      >
        {artUrl && (
          <img
            src={artUrl}
            alt=""
            aria-hidden="true"
            decoding="async"
            className="profile-art-appear h-[80%] w-[80%] object-contain transition-transform duration-300 ease-out motion-reduce:transition-none motion-safe:group-hover:scale-[1.03]"
          />
        )}
        {selected && (
          <span aria-hidden="true" className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-wine-700 text-white shadow-sm shadow-wine-950/25">
            <Icon icon={Check} size="sm" />
          </span>
        )}
      </span>
      <span className={`flex min-h-14 items-center justify-center px-3 py-3 text-sm font-semibold leading-snug sm:px-5 sm:text-base ${selected ? 'text-wine-800' : 'text-ink'}`}>
        {label}
      </span>
    </button>
  )
}
