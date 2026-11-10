import {
  Bell,
  CalendarDays,
  Grape,
  LayoutDashboard,
  Megaphone,
  Route,
  ScanLine,
  ShieldCheck,
  Smartphone,
  Users,
  Warehouse,
  Wine,
  type LucideIcon,
} from 'lucide-react'
import type { NavigationIcon } from '@config/navigation'

/** The Lucide icon drawn for each navigation entry. */
export const navIcons: Record<NavigationIcon, LucideIcon> = {
  wines: Wine,
  events: CalendarDays,
  routes: Route,
  scan: ScanLine,
  cellar: Warehouse,
  admin: ShieldCheck,
  dashboard: LayoutDashboard,
  submissions: Grape,
  users: Users,
  notifications: Bell,
  appVersions: Smartphone,
  socialPosts: Megaphone,
}
