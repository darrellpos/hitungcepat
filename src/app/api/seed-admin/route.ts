import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/server-auth'

// POST /api/seed-admin - Force reset & seed with exact offline data
export async function POST(request: NextRequest) {
  try {
    // Only admin can seed the database
    const authErr = requireAdmin(request)
    if (authErr) return authErr

    const { forceReset } = await request.json().catch(() => ({}))

    if (forceReset) {
      // Destructive reset - clear all data first
      await db.riwayatCetakan.deleteMany()
      await db.pembeli.deleteMany()
      await db.calonPembeli.deleteMany()
      await db.setting.deleteMany()
      await db.pengguna.deleteMany()
      await db.customer.deleteMany()
      await db.finishing.deleteMany()
      await db.printingCost.deleteMany()
      await db.paper.deleteMany()
    }

    // Import and reset ensureSeedData
    const { ensureSeedData, _resetSeedFlag } = await import('@/lib/auto-seed')
    _resetSeedFlag()
    await ensureSeedData('user-superadmin')

    // Return summary
    const [finalPapers, finalCosts, finalFinishings, finalCustomers, finalPengguna, finalSettings] = await Promise.all([
      db.paper.count(),
      db.printingCost.count(),
      db.finishing.count(),
      db.customer.count(),
      db.pengguna.count(),
      db.setting.count(),
    ])

    return NextResponse.json({
      message: forceReset
        ? 'Database cleared and re-seeded with sample data'
        : 'Database synced with sample data (upsert mode)',
      mode: forceReset ? 'reset' : 'upsert',
      data: {
        papers: finalPapers,
        printingCosts: finalCosts,
        finishings: finalFinishings,
        customers: finalCustomers,
        pengguna: finalPengguna,
        settings: finalSettings,
      }
    }, { status: 200 })
  } catch (error) {
    console.error('Seed admin error:', error)
    return NextResponse.json(
      { error: 'Gagal seeding database', details: String(error) },
      { status: 500 }
    )
  }
}
