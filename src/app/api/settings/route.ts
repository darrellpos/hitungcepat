import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireAdmin, getServerUser } from '@/lib/server-auth'
import { ensureSeedData } from '@/lib/auto-seed'

export async function GET(request: NextRequest) {
  try {
    // Authenticated users can read settings
    const authErr = requireAuth(request)
    if (authErr) return authErr

    // Auto-seed if tables are empty (runs only once per serverless instance)
    const user = getServerUser(request)
    await ensureSeedData(user?.id)

    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')

    if (key) {
      const setting = await db.setting.findUnique({
        where: { key }
      })
      if (!setting) {
        return NextResponse.json({ key, value: null }, { status: 200 })
      }
      return NextResponse.json(setting)
    }

    const settings = await db.setting.findMany()
    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Only admin can modify settings
    const authErr = requireAdmin(request)
    if (authErr) return authErr

    const body = await request.json()
    const { key, value } = body

    if (!key) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 })
    }

    const setting = await db.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value: value || '' }
    })

    return NextResponse.json(setting)
  } catch (error) {
    console.error('Error saving setting:', error)
    return NextResponse.json({ error: 'Failed to save setting' }, { status: 500 })
  }
}
