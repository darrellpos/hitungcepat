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

function applyFontSize(size: string) {
  const map: Record<string, string> = {
    small: '14px',
    medium: '16px',
    large: '18px',
    'extra-large': '20px',
  }
  const fontSize = map[size] || '16px'
  applyColor('--app-font-size', fontSize)
  applyColor('--app-font-size-sm', `${parseInt(fontSize) - 2}px`)
  applyColor('--app-font-size-lg', `${parseInt(fontSize) + 2}px`)
  applyColor('--app-font-size-xs', `${parseInt(fontSize) - 4}px`)
}

export async function applyThemeAfterLogin() {
  const keys = ['theme_sidebar_color', 'theme_bg_color', 'theme_popup_color', 'theme_banner_color', 'theme_login_color', 'app_font_size']
  const results = await Promise.all(
    keys.map(k =>
      fetch(`/api/settings?key=${k}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => data?.value || null)
        .catch(() => null)
    )
  )
  const [sidebar, bg, popup, banner, login, fontSize] = results
  if (sidebar) applySidebarTheme(sidebar)
  if (bg) applyColor('--app-content-bg', bg)
  if (popup) applyPopupTheme(popup)
  if (banner) applyColor('--app-banner-bg', banner)
  if (login) applyColor('--app-login-bg', login)
  if (fontSize) applyFontSize(fontSize)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const applied = useRef(false)

  useEffect(() => {
    if (applied.current) return
    applied.current = true

    const authUser = getAuthUser()
    if (!authUser) return

    const keys = ['theme_sidebar_color', 'theme_bg_color', 'theme_popup_color', 'theme_banner_color', 'theme_login_color', 'app_font_size']
    const headers = { Cookie: `userId=${authUser.userId}; userRole=${authUser.role}` }

    Promise.all(
      keys.map(k =>
        fetch(`/api/settings?key=${k}`, { headers })
          .then(r => r.ok ? r.json() : null)
          .then(data => data?.value || null)
          .catch(() => null)
      )
    ).then(([sidebar, bg, popup, banner, login, fontSize]) => {
      if (sidebar) applySidebarTheme(sidebar)
      if (bg) applyColor('--app-content-bg', bg)
      if (popup) applyPopupTheme(popup)
      if (banner) applyColor('--app-banner-bg', banner)
      if (login) applyColor('--app-login-bg', login)
      if (fontSize) applyFontSize(fontSize)
    })
  }, [])

  return <>{children}</>
}
