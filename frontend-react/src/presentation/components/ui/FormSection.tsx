import { useId, type ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
export function FormSection({ title, summary, open, onToggle, children, invalid = false, disabled = false }: {
  title: string; summary?: string; open: boolean; onToggle: () => void; children: ReactNode; invalid?: boolean; disabled?: boolean
}) {
  const id = useId()
  const Chevron = open ? ChevronUp : ChevronDown
  return <section className={`rounded-2xl border bg-white ${invalid ? 'border-red-400' : 'border-wine-100'}`}>
    <h3><button type="button" aria-expanded={open} aria-controls={id} disabled={disabled} onClick={onToggle} className="flex w-full items-center gap-3 rounded-2xl p-4 text-left focus-visible:outline-2 focus-visible:outline-wine-600 disabled:opacity-60">
      <span className="flex-1"><span className="block font-semibold text-gray-900">{title}</span>{summary && <span className="mt-1 block text-xs font-normal text-gray-500">{summary}</span>}</span><Chevron size={20} className="text-wine-700" />
    </button></h3>
    <div id={id} hidden={!open} className="space-y-4 px-4 pb-4">{open && children}</div>
  </section>
}
