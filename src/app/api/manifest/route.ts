import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [companyNameSetting] = await Promise.all([
      db.setting.findUnique({ where: { key: 'company_name' } }),
    ])

    const appName = companyNameSetting?.value || 'Kalkulator Hitung Cetakan'
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || ''

    const manifest = {
      name: appName,
      short_name: appName.length > 12 ? appName.slice(0, 12) : appName,
      description: 'Aplikasi kalkulator hitung cetakan profesional',
      start_url: '/',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#3b82f6',
      orientation: 'any',
      icons: [
        {
          src: '/api/app-icon?size=192',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: '/api/app-icon?size=512',
          sizes: '512x512',
          type: 'image/png',
        },
      ],
    }

    return new NextResponse(JSON.stringify(manifest), {
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'public, max-age=300',
      },
    })
  } catch (error) {
    console.error('Error generating manifest:', error)
    const manifest = {
      name: 'Kalkulator Hitung Cetakan',
      short_name: 'Cetakan',
      description: 'Aplikasi kalkulator hitung cetakan profesional',
      start_url: '/',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#3b82f6',
      icons: [
        { src: '/api/app-icon?size=192', sizes: '192x192', type: 'image/png' },
        { src: '/api/app-icon?size=512', sizes: '512x512', type: 'image/png' },
      ],
    }
    return new NextResponse(JSON.stringify(manifest), {
      headers: { 'Content-Type': 'application/manifest+json' },
    })
  }
}
