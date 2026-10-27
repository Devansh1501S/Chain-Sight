'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { BarChart3, ClipboardList, Download, FileText, LayoutDashboard, LogOut, Package, Settings, Truck, Users, X } from 'lucide-react'
import { signOut } from '../lib/auth'

const primary = [
  { label: 'Overview', href: '/manager/dashboard', icon: LayoutDashboard },
  { label: 'Inventory', href: '/dashboard/inventory', icon: Package },
  { label: 'Logistics', href: '/dashboard/logistics', icon: Truck },
  { label: 'Procurement', href: '/dashboard/procurement', icon: ClipboardList },
  { label: 'Suppliers', href: '/dashboard/suppliers', icon: Users },
]

const manage = [
  { label: 'Purchase orders', href: '/dashboard/orders', icon: FileText },
  { label: 'Reports', href: '/dashboard/reports', icon: Download },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
]

function isActive(pathname: string, href: string) {
  return href === '/manager/dashboard' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
}

export default function ManagerSidebar({ open = false, onClose }: { open?: boolean; onClose?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const leave = () => { signOut(); onClose?.(); router.push('/') }
  const renderLink = (item: (typeof primary)[number]) => { const Icon = item.icon; return <Link key={item.href} href={item.href} onClick={onClose} className={isActive(pathname, item.href) ? 'active' : undefined} aria-current={isActive(pathname, item.href) ? 'page' : undefined}><Icon /> <span>{item.label}</span></Link> }
  return <aside className={`role-sidebar manager-sidebar ${open ? 'open' : ''}`} aria-label="Manager navigation">
    <div className="role-brand"><Link href="/" className="role-brand-link" aria-label="Go to ChainSight home"><span className="brand-mark"><span /></span><b>chainsight</b></Link><button onClick={onClose} aria-label="Close menu"><X /></button></div>
    <nav className="manager-navigation">{primary.map(renderLink)}<span className="manager-nav-label">Manage</span>{manage.map(renderLink)}</nav>
    <button className="role-signout manager-signout" onClick={leave}><LogOut /> <span>Sign out</span></button>
  </aside>
}
