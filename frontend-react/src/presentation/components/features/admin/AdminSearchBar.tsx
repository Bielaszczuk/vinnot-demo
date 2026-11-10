/**
 * AdminSearchBar — reusable search bar for admin list pages
 */
import { type FormEvent } from 'react'
import { Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@components/ui/Button'
import { Icon } from '@components/ui/Icon'
import { fieldClassName } from '@components/ui/fieldStyles'

interface AdminSearchBarProps {
  value: string
  onChange: (value: string) => void
  onSearch: () => void
  placeholder?: string
}

export function AdminSearchBar({
  value,
  onChange,
  onSearch,
  placeholder = 'Buscar...',
}: AdminSearchBarProps) {
  const { t } = useTranslation()
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onSearch()
  }

  const resolvedPlaceholder = placeholder === 'Buscar...' ? t('admin.common.searchPlaceholder') : placeholder

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-border shadow-sm p-4">
      <div className="relative">
        <Icon icon={Search} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          type="text"
          aria-label={resolvedPlaceholder}
          placeholder={resolvedPlaceholder}
          className={fieldClassName({ className: 'pl-10 pr-28' })}
        />
        <Button type="submit" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2">
          {t('common.search')}
        </Button>
      </div>
    </form>
  )
}
