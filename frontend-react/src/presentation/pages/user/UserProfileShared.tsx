import { BarChart3, Bell, Settings, ShieldCheck, User, type LucideIcon } from 'lucide-react'
import { ICON_STROKE } from '@components/ui/iconScale'

function lucideGlyph(Glyph: LucideIcon) {
  return function ProfileIcon({ className }: { className?: string }) {
    return <Glyph aria-hidden="true" strokeWidth={ICON_STROKE} className={className} />
  }
}

export const UserIcon = lucideGlyph(User)
export const ChartIcon = lucideGlyph(BarChart3)
export const ShieldIcon = lucideGlyph(ShieldCheck)
export const BellIcon = lucideGlyph(Bell)
export const SettingsIcon = lucideGlyph(Settings)
