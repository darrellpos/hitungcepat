import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const plans = await db.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    })

    return NextResponse.json({ success: true, plans })
  } catch (error) {
    return NextResponse.json({ error: 'Gagal mengambil paket' }, { status: 500 })
  }
}
