import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    const payments = await db.paymentRecord.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })

    const successfulPayments = payments.filter(p => p.status === 'success')
    const mrr = successfulPayments.reduce((sum, p) => sum + p.amount, 0)
    const activeSubs = await db.userSubscription.count({ where: { status: 'active' } })
    const totalPayments = await db.paymentRecord.count()
    const failedPayments = await db.paymentRecord.count({ where: { status: 'failed' } })
    const pendingPayments = await db.paymentRecord.count({ where: { status: 'pending' } })

    const planDist = await db.userSubscription.groupBy({
      by: ['planId'],
      where: { status: 'active' },
      _count: { id: true },
    })

    const plans = await db.subscriptionPlan.findMany({ where: { isActive: true } })

    return NextResponse.json({
      success: true,
      stats: {
        totalRevenue: mrr,
        activeSubscribers: activeSubs,
        totalPayments,
        failedPayments,
        pendingPayments,
        churnRate: totalPayments > 0 ? (failedPayments / totalPayments * 100).toFixed(1) : '0',
        planDistribution: planDist.map(p => ({
          planId: p.planId,
          count: p._count.id,
          planName: plans.find(pl => pl.id === p.planId)?.name || 'Unknown',
        })),
      },
      recentPayments: payments.slice(0, 20),
      plans,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Gagal mengambil data admin' }, { status: 500 })
  }
}
