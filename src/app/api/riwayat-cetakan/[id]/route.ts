import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerUser, requireAuth } from '@/lib/server-auth'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authErr = requireAuth(request)
    if (authErr) return authErr
    const user = getServerUser(request)!
    const { id } = await params

    // Find the item first to check ownership
    const item = await db.riwayatCetakan.findUnique({ where: { id } })
    if (!item) {
      return NextResponse.json({ error: 'Riwayat tidak ditemukan' }, { status: 404 })
    }

    // Strict ownership: only the owner can delete their own records
    if (item.userId !== user.id) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    await db.riwayatCetakan.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting riwayat cetakan:', error)
    return NextResponse.json({ error: 'Gagal menghapus' }, { status: 500 })
  }
}
