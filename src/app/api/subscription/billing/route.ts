import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // Get active subscription
    const subscription = await db.userSubscription.findFirst({
      where: { userId, status: 'active' },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    })

    // Get payment methods
    const paymentMethods = await db.paymentMethod.findMany({
      where: { userId },
      orderBy: { isDefault: 'desc' },
    })

    // Get recent payments
    const recentPayments = await db.paymentRecord.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    // Get unread notifications count
    const unreadCount = await db.notification.count({
      where: { userId, isRead: false },
    })

    return NextResponse.json({
      success: true,
      subscription: subscription || null,
      paymentMethods,
      recentPayments,
      unreadNotifications: unreadCount,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Gagal mengambil data billing' }, { status: 500 })
  }
}
