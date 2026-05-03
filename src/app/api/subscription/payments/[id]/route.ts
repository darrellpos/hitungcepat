import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const payment = await db.paymentRecord.findUnique({
      where: { id },
    })

    if (!payment) {
      return NextResponse.json({ error: 'Pembayaran tidak ditemukan' }, { status: 404 })
    }

    return NextResponse.json({ success: true, payment })
  } catch (error) {
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { action } = body

    const payment = await db.paymentRecord.findUnique({ where: { id } })
    if (!payment) {
      return NextResponse.json({ error: 'Pembayaran tidak ditemukan' }, { status: 404 })
    }

    if (action === 'simulate-pay') {
      // Simulate successful payment
      const metadata = JSON.parse(payment.metadata || '{}')
      const updated = await db.paymentRecord.update({
        where: { id },
        data: {
          status: 'success',
          paidAt: new Date(),
        },
      })

      // Create subscription
      const planId = metadata.planId
      const planInterval = metadata.planInterval || 'monthly'
      const now = new Date()
      let endDate = new Date(now)
      if (planInterval === 'monthly') endDate.setMonth(endDate.getMonth() + 1)
      else if (planInterval === 'yearly') endDate.setFullYear(endDate.getFullYear() + 1)
      else endDate.setFullYear(endDate.getFullYear() + 100)

      await db.userSubscription.upsert({
        where: { id: `${payment.userId}-${planId}` },
        update: { status: 'active', startDate: now, endDate, autoRenew: true, planId },
        create: {
          id: `${payment.userId}-${planId}`,
          userId: payment.userId,
          planId,
          status: 'active',
          startDate: now,
          endDate,
          autoRenew: true,
        },
      })

      await db.notification.create({
        data: {
          userId: payment.userId,
          title: 'Pembayaran Berhasil! 🎉',
          message: `Pembayaran ${metadata.planName || 'langganan'} sebesar Rp ${payment.amount.toLocaleString('id-ID')} berhasil.`,
          type: 'success',
        },
      })

      return NextResponse.json({ success: true, payment: updated })
    }

    if (action === 'retry') {
      if (payment.retryCount >= payment.maxRetry) {
        return NextResponse.json({ error: 'Batas percobaan habis' }, { status: 400 })
      }

      const retryIntervals = [60, 360, 1440] // 1h, 6h, 24h in minutes
      const nextRetryIn = retryIntervals[payment.retryCount] || 1440

      const updated = await db.paymentRecord.update({
        where: { id },
        data: {
          retryCount: payment.retryCount + 1,
          nextRetryAt: new Date(Date.now() + nextRetryIn * 60 * 1000),
          status: 'pending',
        },
      })

      await db.notification.create({
        data: {
          userId: payment.userId,
          title: 'Percobaan Pembayaran Ulang',
          message: `Pembayaran otomatis akan dicoba kembali dalam ${nextRetryIn >= 60 ? `${Math.floor(nextRetryIn / 60)} jam` : `${nextRetryIn} menit`}. Percobaan ke-${payment.retryCount + 1} dari ${payment.maxRetry}.`,
          type: 'warning',
        },
      })

      return NextResponse.json({ success: true, payment: updated })
    }

    return NextResponse.json({ error: 'Action tidak valid' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: 'Gagal memproses' }, { status: 500 })
  }
}
