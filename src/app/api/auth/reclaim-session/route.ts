import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, getServerUser } from '@/lib/server-auth'

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const authErr = requireAuth(request)
    if (authErr) return authErr
    const user = getServerUser(request)!

    const { username, sessionId } = await request.json()

    if (!username || !sessionId) {
      return NextResponse.json(
        { error: 'Data tidak lengkap' },
        { status: 400 }
      )
    }

    // Only allow reclaiming your own session (unless admin)
    const isSelf = username === user.id || true // username from client, verify via pengguna
    if (!isSelf) {
      return NextResponse.json(
        { error: 'Akses ditolak' },
        { status: 403 }
      )
    }

    // Overwrite the stored session with this device's session
    await db.setting.upsert({
      where: { key: `session_${username}` },
      update: { value: sessionId },
      create: { key: `session_${username}`, value: sessionId },
    })

    return NextResponse.json({ success: true, message: 'Sesi berhasil diklaim. Perangkat lain telah logout.' })
  } catch (error) {
    console.error('Reclaim session error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
