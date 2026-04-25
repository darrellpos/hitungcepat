// Dashboard removed - Mar 29 15:40

'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  Calculator,
  Scissors,
  FileText,
  DollarSign,
  Layers,
  History,
  Settings,
  Users,
  Shield,
  LogOut,
  X,
  Menu,
  Paintbrush,
  Sheet
} from 'lucide-react'
import { getAuthUser } from '@/lib/auth'
import { hasFeatureAccess } from '@/lib/permissions'
import { useLanguage } from '@/contexts/language-context'
import { TranslationKey } from '@/lib/i18n'

const DEFAULT_LOGO = '/company-logo.png'

// Menu items with their feature IDs for permission checking
const menuItems = [
  {
    titleKey: 'potong_kertas' as TranslationKey,
    href: '/',
    icon: Scissors,
    featureId: 'potong-kertas',
  },
  {
    titleKey: 'hitung_cetakan' as TranslationKey,
    href: '/hitung-cetakan',
    icon: Calculator,
    featureId: 'hitung-cetakan',
  },
  {
    titleKey: 'hitung_finishing' as TranslationKey,
    href: '/hitung-finishing',
    icon: Paintbrush,
    featureId: 'hitung-finishing',
  },

  {
    titleKey: 'master_harga_kertas' as TranslationKey,
    href: '/master-harga-kertas',
    icon: FileText,
    featureId: 'master-harga-kertas',
  },
  {
    titleKey: 'master_ongkos_cetak' as TranslationKey,
    href: '/master-ongkos-cetak',
    icon: DollarSign,
    featureId: 'master-ongkos-cetak',
  },
  {
    titleKey: 'master_finishing' as TranslationKey,
    href: '/master-finishing',
    icon: Layers,
    featureId: 'master-finishing',
  },
  {
    titleKey: 'master_customer' as TranslationKey,
    href: '/master-customer',
    icon: Users,
    featureId: 'master-customer',
  },
  {
    titleKey: 'riwayat' as TranslationKey,
    href: '/riwayat',
    icon: History,
    featureId: 'riwayat',
  },
  {
    titleKey: 'pengaturan' as TranslationKey,
    href: '/administrasi/pengaturan',
    icon: Settings,
    featureId: 'pengaturan',
  },
  {
    titleKey: 'administrasi' as TranslationKey,
    href: '/administrasi',
    icon: Shield,
    featureId: 'administrasi',
    submenu: [
      { titleKey: 'hak_akses' as TranslationKey, href: '/administrasi/hak-akses', icon: Shield, featureId: 'hak-akses' },
      { titleKey: 'pengguna' as TranslationKey, href: '/administrasi/pengguna', icon: Users, featureId: 'pengguna' }
    ]
  }
]

// Hook to fetch company branding settings
function useCompanyBranding() {
  const [companyName, setCompanyName] = useState<string | null>(null)
  const [companyLogo, setCompanyLogo] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/settings?key=company_name')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.value?.trim()) setCompanyName(data.value.trim()) })
      .catch(() => {})

    fetch('/api/settings?key=company_logo')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.value?.trim()) setCompanyLogo(data.value.trim()) })
      .catch(() => {})
  }, [])

  return { companyName, companyLogo }
}

interface SidebarProps {
  username?: string
  role?: string
  onLogout?: () => void | Promise<void>
  isOpen?: boolean
  onToggle?: () => void
  permVersion?: number
}

export function Sidebar({ username, role, onLogout, isOpen = true, onToggle, permVersion }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { companyName, companyLogo } = useCompanyBranding()
  const { t } = useLanguage()

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/' || pathname === '/potong-kertas'
    }
    return pathname.startsWith(href)
  }

  // Filter menu items based on permissions
  const filteredMenuItems = menuItems.filter(item => {
    if (!role) return true
    if (role === 'superadmin') return true

    if (item.submenu) {
      const hasAccessibleSub = item.submenu.some(sub => hasFeatureAccess(role, sub.featureId))
      return hasAccessibleSub
    }

    return hasFeatureAccess(role, item.featureId)
  })

  const displayName = (companyName && companyName.trim()) || t('app_name')

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed left-0 top-0 z-50 h-screen w-64 flex flex-col transition-transform duration-300 ease-in-out shadow-xl",
          "[background-color:var(--app-sidebar-bg)] [border-color:var(--app-sidebar-border)]",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Close button - top right */}
        <div className="flex justify-end px-2 pt-2">
          <button
            onClick={onToggle}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" style={{ color: 'var(--app-sidebar-text-muted)' }} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 pb-4 space-y-1">
          {/* Logo + Company Name - Centered */}
          <div className="flex flex-col items-center gap-2 mb-3 mt-1">
            {(companyLogo || DEFAULT_LOGO) ? (
              <div className="relative">
                <img
                  src={companyLogo || DEFAULT_LOGO}
                  alt="Logo"
                  className="w-[60px] h-[60px] rounded-xl object-cover shadow-md"
                />
              </div>
            ) : (
              <div className="w-[56px] h-[56px] rounded-xl bg-blue-600 flex items-center justify-center">
                <Scissors className="w-7 h-7 text-white" />
              </div>
            )}
            <div className="text-center">
              <h1 className="text-sm font-bold" style={{ color: 'var(--app-sidebar-text)' }}>{displayName}</h1>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--app-sidebar-text-muted)' }}>{t('app_tagline')}</p>
            </div>
          </div>

          {filteredMenuItems.map((item, idx) => (
            <div key={item.href}>
              {item.submenu ? (
                <div>
                  <Link
                    href={item.href}
                    onClick={onToggle}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive(item.href)
                        ? 'bg-blue-50 text-blue-600'
                        : 'hover:bg-white/10'
                    )}
                    style={isActive(item.href) ? undefined : { color: 'var(--app-sidebar-text)' }}
                  >
                    {idx === 0 && <Menu className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--app-sidebar-text-muted)' }} />}
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    <span className={cn("transition-opacity", !isOpen && "lg:opacity-100 opacity-0")}>{t(item.titleKey)}</span>
                  </Link>
                  <div className="ml-4 lg:ml-8 mt-1 space-y-1">
                    {item.submenu
                      .filter(sub => !role || role === 'superadmin' || hasFeatureAccess(role, sub.featureId))
                      .map((subItem) => (
                        <Link
                          key={subItem.href}
                          href={subItem.href}
                          onClick={onToggle}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                            pathname === subItem.href
                              ? 'bg-blue-50 text-blue-600'
                              : 'hover:bg-white/10'
                          )}
                          style={pathname === subItem.href ? undefined : { color: 'var(--app-sidebar-text-muted)' }}
                        >
                          <subItem.icon className="w-4 h-4 flex-shrink-0" />
                          <span className={cn("transition-opacity", !isOpen && "lg:opacity-100 opacity-0")}>{t(subItem.titleKey)}</span>
                        </Link>
                      ))
                    }
                  </div>
                </div>
              ) : (
                <Link
                  href={item.href}
                  onClick={onToggle}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive(item.href)
                      ? 'bg-blue-50 text-blue-600'
                      : 'hover:bg-white/10'
                  )}
                  style={isActive(item.href) ? undefined : { color: 'var(--app-sidebar-text)' }}
                >
                  {idx === 0 && <Menu className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--app-sidebar-text-muted)' }} />}
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className={cn("transition-opacity", !isOpen && "lg:opacity-100 opacity-0")}>{t(item.titleKey)}</span>
                </Link>
              )}
            </div>
          ))}
        </nav>

        {/* User Info & Logout */}
        <div className="px-3 py-2 border-t" style={{ borderColor: 'var(--app-sidebar-border)' }}>
          {username && (
            <div className={cn("mb-1.5 px-2 py-1.5 rounded-md transition-opacity", !isOpen && "lg:opacity-100 opacity-0")} style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
              <div className="flex items-center justify-between gap-1.5">
                <p className="text-[14px] font-medium truncate" style={{ color: 'var(--app-sidebar-text)' }}>{username}</p>
                {role && (
                  <span className={cn(
                    "text-[11px] font-bold px-1.5 py-px rounded-full whitespace-nowrap flex-shrink-0",
                    role === 'superadmin' ? 'bg-red-100 text-red-700' :
                    role === 'admin' ? 'bg-purple-100 text-purple-700' :
                    role === 'manager' ? 'bg-emerald-100 text-emerald-700' :
                    role === 'demo' ? 'bg-amber-100 text-amber-700' :
                    'bg-blue-100 text-blue-700'
                  )}>
                    {role}
                  </span>
                )}
              </div>
            </div>
          )}
          <button
            onClick={async () => {
              if (onLogout) {
                await onLogout()
              }
              router.push('/login')
            }}
            className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[15px] font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className={cn("transition-opacity", !isOpen && "lg:opacity-100 opacity-0")}>{t('keluar')}</span>
          </button>
        </div>
      </div>
    </>
  )
}

export function MobileHeader({ onMenuToggle, username }: { onMenuToggle: () => void; username?: string }) {
  const [companyName, setCompanyName] = useState<string | null>(null)
  const [companyLogo, setCompanyLogo] = useState<string | null>(null)
  const { t } = useLanguage()

  useEffect(() => {
    fetch('/api/settings?key=company_name')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.value?.trim()) setCompanyName(data.value.trim()) })
      .catch(() => {})

    fetch('/api/settings?key=company_logo')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.value?.trim()) setCompanyLogo(data.value.trim()) })
      .catch(() => {})
  }, [])

  const displayName = (companyName && companyName.trim()) || t('app_name')

  return (
    <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-30">
      <div className="flex items-center justify-between">
        <button
          onClick={onMenuToggle}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <Menu className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex items-center gap-2">
          {(companyLogo || DEFAULT_LOGO) ? (
            <img src={companyLogo || DEFAULT_LOGO} alt="Logo" className="w-[40px] h-[40px] rounded-xl object-cover animate-float shadow-md shadow-blue-500/15" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
              <Scissors className="w-5 h-5 text-white" />
            </div>
          )}
          <span className="font-bold text-slate-800 text-base truncate max-w-[200px]">{displayName}</span>
        </div>
        <div className="w-8">
          {/* Spacer for balance */}
        </div>
      </div>
    </header>
  )
}
