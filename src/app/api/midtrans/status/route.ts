import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('order_id')

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID required' }, { status: 400 })
    }

    const payment = await db.paymentRecord.findUnique({
      where: { transactionId: orderId },
    })

    if (!payment) {
      return NextResponse.json({ error: 'Pembayaran tidak ditemukan' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      status: payment.status,
      amount: payment.amount,
      transactionId: payment.transactionId,
      paidAt: payment.paidAt,
      expiredAt: payment.expiredAt,
      createdAt: payment.createdAt,
    })
  } catch (error: any) {
    return NextResponse.json({ error: 'Gagal mengecek status' }, { status: 500 })
  }
}
