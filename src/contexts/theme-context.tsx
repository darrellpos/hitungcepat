'use client'

import { useEffect, useRef } from 'react'
import { getAuthUser } from '@/lib/auth'

function isLightColor(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 128
}

function applyColor(key: string, color: string) {
  const el = document.documentElement
  el.style.setProperty(key, color)
}

function applySidebarTheme(color: string) {
  const isLight = isLightColor(color)
  applyColor('--app-sidebar-bg', color)
  applyColor('--app-sidebar-text', isLight ? '#1e293b' : '#f1f5f9')
  applyColor('--app-sidebar-text-muted', isLight ? '#64748b' : '#94a3b8')
}

function applyPopupTheme(color: string) {
  applyColor('--app-popup-bg', color)
  applyColor('--popover', color)
  applyColor('--card', color)
  applyColor('--background', color)
}

export async function applyThemeAfterLogin() {
  const keys = ['theme_sidebar_color', 'theme_bg_color', 'theme_popup_color', 'theme_banner_color', 'theme_login_color']
  const results = await Promise.all(
    keys.map(k =>
      fetch(`/api/settings?key=${k}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => data?.value || null)
        .catch(() => null)
    )
  )
  const [sidebar, bg, popup, banner, login] = results
  if (sidebar) applySidebarTheme(sidebar)
  if (bg) applyColor('--app-content-bg', bg)
  if (popup) applyPopupTheme(popup)
  if (banner) applyColor('--app-banner-bg', banner)
  if (login) applyColor('--app-login-bg', login)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const applied = useRef(false)

  useEffect(() => {
    if (applied.current) return
    applied.current = true

    const authUser = getAuthUser()
    if (!authUser) return

    const keys = ['theme_sidebar_color', 'theme_bg_color', 'theme_popup_color', 'theme_banner_color', 'theme_login_color']
    const headers = { Cookie: `userId=${authUser.userId}; userRole=${authUser.role}` }

    Promise.all(
      keys.map(k =>
        fetch(`/api/settings?key=${k}`, { headers })
          .then(r => r.ok ? r.json() : null)
          .then(data => data?.value || null)
          .catch(() => null)
      )
    ).then(([sidebar, bg, popup, banner, login]) => {
      if (sidebar) applySidebarTheme(sidebar)
      if (bg) applyColor('--app-content-bg', bg)
      if (popup) applyPopupTheme(popup)
      if (banner) applyColor('--app-banner-bg', banner)
      if (login) applyColor('--app-login-bg', login)
    })
  }, [])

  return <>{children}</>
}
