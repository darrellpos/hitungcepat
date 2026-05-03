import { NextRequest, NextResponse } from 'next/server'
import { verifySignature, getMidtransConfig } from '@/lib/midtrans'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      transaction_time,
      transaction_status,
      transaction_id,
      status_message,
      status_code,
      signature_key,
      payment_type,
      order_id,
      merchant_id,
      gross_amount,
      fraud_status,
      currency,
    } = body

    // Verify signature
    const config = getMidtransConfig()
    const isValid = verifySignature(
      order_id,
      status_code,
      gross_amount,
      config.serverKey,
      signature_key
    )

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }

    // Find payment record
    const payment = await db.paymentRecord.findUnique({
      where: { transactionId: order_id },
    })

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    const metadata = JSON.parse(payment.metadata || '{}')

    // Update payment based on status
    let newStatus = payment.status
    let notificationType = 'info'
    let notificationTitle = ''
    let notificationMessage = ''

    if (transaction_status === 'capture' || transaction_status === 'settlement') {
      if (fraud_status === 'challenge') {
        newStatus = 'pending'
        notificationTitle = 'Pembayaran Dalam Review'
        notificationMessage = 'Pembayaran Anda sedang dalam proses verifikasi oleh bank.'
        notificationType = 'warning'
      } else {
        newStatus = 'success'
        notificationTitle = 'Pembayaran Berhasil!'
        notificationMessage = `Pembayaran ${metadata.planName || 'langganan'} Anda sebesar Rp ${Number(gross_amount).toLocaleString('id-ID')} telah berhasil.`
        notificationType = 'success'

        // Activate subscription
        const planId = metadata.planId
        const planInterval = metadata.planInterval || 'monthly'
        const now = new Date()
        let endDate = new Date(now)

        if (planInterval === 'monthly') {
          endDate.setMonth(endDate.getMonth() + 1)
        } else if (planInterval === 'yearly') {
          endDate.setFullYear(endDate.getFullYear() + 1)
        } else {
          endDate.setFullYear(endDate.getFullYear() + 100) // lifetime
        }

        await db.userSubscription.create({
          data: {
            userId: payment.userId,
            planId: planId,
            status: 'active',
            startDate: now,
            endDate,
            autoRenew: true,
          },
        })
      }
    } else if (transaction_status === 'pending') {
      newStatus = 'pending'
      notificationTitle = 'Menunggu Pembayaran'
      notificationMessage = 'Pembayaran Anda sedang menunggu. Silakan selesaikan pembayaran Anda.'
      notificationType = 'info'
    } else if (transaction_status === 'deny' || transaction_status === 'cancel' || transaction_status === 'expire') {
      newStatus = transaction_status === 'expire' ? 'expired' : 'failed'
      notificationTitle = transaction_status === 'expire' ? 'Pembayaran Kadaluarsa' : 'Pembayaran Gagal'
      notificationMessage = transaction_status === 'expire'
        ? 'Waktu pembayaran telah habis. Silakan coba lagi dengan paket yang baru.'
        : 'Pembayaran gagal. Silakan coba metode pembayaran lain.'
      notificationType = 'error'
    } else if (transaction_status === 'refund') {
      newStatus = 'refunded'
      notificationTitle = 'Pembayaran Dikembalikan'
      notificationMessage = 'Pembayaran Anda telah dikembalikan.'
      notificationType = 'info'
    }

    // Update payment record
    await db.paymentRecord.update({
      where: { id: payment.id },
      data: {
        status: newStatus,
        provider: payment_type || payment.provider,
        paidAt: newStatus === 'success' ? new Date() : payment.paidAt,
        metadata: JSON.stringify({
          ...metadata,
          midtrans: { transaction_time, payment_type, transaction_id, fraud_status },
        }),
      },
    })

    // Create notification
    if (notificationTitle) {
      await db.notification.create({
        data: {
          userId: payment.userId,
          title: notificationTitle,
          message: notificationMessage,
          type: notificationType,
        },
      })
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error: any) {
    console.error('Midtrans notification error:', error)
    return NextResponse.json({ error: 'Notification handler failed' }, { status: 500 })
  }
}
