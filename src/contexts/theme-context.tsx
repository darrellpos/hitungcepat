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

const THEME_KEYS = ['theme_sidebar_color', 'theme_bg_color', 'theme_popup_color', 'theme_banner_color', 'theme_login_color', 'app_font_size'] as const

function applySettingsFromMap(map: Record<string, string>) {
  if (map.theme_sidebar_color) applySidebarTheme(map.theme_sidebar_color)
  if (map.theme_bg_color) applyColor('--app-content-bg', map.theme_bg_color)
  if (map.theme_popup_color) applyPopupTheme(map.theme_popup_color)
  if (map.theme_banner_color) applyColor('--app-banner-bg', map.theme_banner_color)
  if (map.theme_login_color) applyColor('--app-login-bg', map.theme_login_color)
  if (map.app_font_size) applyFontSize(map.app_font_size)
}

export async function applyThemeAfterLogin() {
  try {
    const res = await fetch('/api/settings')
    if (!res.ok) return
    const data: Array<{ key: string; value: string }> = await res.json()
    const map: Record<string, string> = {}
    for (const item of data) {
      if ((THEME_KEYS as readonly string[]).includes(item.key) && item.value) {
        map[item.key] = item.value
      }
    }
    applySettingsFromMap(map)
  } catch {}
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const applied = useRef(false)

  useEffect(() => {
    if (applied.current) return
    applied.current = true

    const authUser = getAuthUser()
    if (!authUser) return

    const headers = { Cookie: `userId=${authUser.userId}; userRole=${authUser.role}` }

    fetch('/api/settings', { headers })
      .then(r => r.ok ? r.json() : null)
      .then((data: Array<{ key: string; value: string }> | null) => {
        if (!data) return
        const map: Record<string, string> = {}
        for (const item of data) {
          if ((THEME_KEYS as readonly string[]).includes(item.key) && item.value) {
            map[item.key] = item.value
          }
        }
        applySettingsFromMap(map)
      })
      .catch(() => {})
  }, [])

  return <>{children}</>
}
