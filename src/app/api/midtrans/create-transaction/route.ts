import { NextRequest, NextResponse } from 'next/server'
import { createSnapTransaction, getMidtransConfig, generateOrderId } from '@/lib/midtrans'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { planId, userId, customerName, customerEmail, customerPhone, paymentMethod } = body

    if (!planId || !userId || !customerName || !customerEmail) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
    }

    // Get plan
    const plan = await db.subscriptionPlan.findUnique({ where: { id: planId } })
    if (!plan || !plan.isActive) {
      return NextResponse.json({ error: 'Paket tidak ditemukan' }, { status: 404 })
    }

    // Check if user already has active subscription
    const existingSub = await db.userSubscription.findFirst({
      where: { userId, status: 'active' }
    })
    if (existingSub) {
      return NextResponse.json({ error: 'Anda sudah memiliki langganan aktif' }, { status: 400 })
    }

    const orderId = generateOrderId()

    // Create pending payment record first
    const paymentRecord = await db.paymentRecord.create({
      data: {
        userId,
        amount: plan.price,
        currency: plan.currency,
        status: 'pending',
        paymentType: 'subscription',
        provider: paymentMethod || 'midtrans',
        transactionId: orderId,
        expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
        metadata: JSON.stringify({ planId, planName: plan.name, planInterval: plan.interval }),
      },
    })

    // Try creating real Midtrans Snap token
    let snapToken: string | null = null
    let redirectUrl: string | null = null

    try {
      const transaction = await createSnapTransaction({
        orderId,
        amount: plan.price,
        customerName,
        customerEmail,
        customerPhone: customerPhone || '08123456789',
        planName: plan.name,
        userId,
      })

      snapToken = transaction.token
      redirectUrl = transaction.redirect_url
    } catch (err: any) {
      console.error('Midtrans Snap error:', err?.message || err)
      // Fallback to simulated payment if Midtrans fails
      console.log('Using simulated payment mode')
    }

    // Create notification
    await db.notification.create({
      data: {
        userId,
        title: 'Menunggu Pembayaran',
        message: `Pembayaran ${plan.name} sebesar Rp ${plan.price.toLocaleString('id-ID')} sedang menunggu pembayaran. Silakan selesaikan dalam 24 jam.`,
        type: 'info',
      },
    })

    return NextResponse.json({
      success: true,
      snapToken,
      redirectUrl,
      orderId,
      paymentRecordId: paymentRecord.id,
      amount: plan.price,
      planName: plan.name,
      expiredAt: paymentRecord.expiredAt,
      // Fallback simulated payment info
      ...(snapToken ? {} : {
        simulated: true,
        vaNumber: generateSimulatedVA(paymentMethod || 'bca'),
        paymentInstructions: getPaymentInstructions(paymentMethod || 'va_bca', plan.price, orderId),
      }),
    })
  } catch (error: any) {
    console.error('Create transaction error:', error)
    return NextResponse.json({ error: 'Gagal membuat transaksi' }, { status: 500 })
  }
}

function generateSimulatedVA(method: string): string {
  const { generateVirtualAccount } = require('@/lib/midtrans')
  const providerMap: Record<string, string> = {
    va_bca: 'bca', va_bni: 'bni', va_bri: 'bri', va_mandiri: 'mandiri',
    bca: 'bca', bni: 'bni', bri: 'bri', mandiri: 'mandiri',
  }
  return generateVirtualAccount(providerMap[method] || 'bca')
}

function getPaymentInstructions(method: string, amount: number, orderId: string) {
  const va = generateSimulatedVA(method)
  const formattedAmount = amount.toLocaleString('id-ID')

  if (method.includes('ewallet') || method.includes('gopay') || method.includes('shopeepay') || method.includes('dana') || method.includes('ovo')) {
    return {
      method: 'e-wallet',
      title: 'Pembayaran E-Wallet',
      steps: [
        'Buka aplikasi e-wallet Anda',
        `Pilih menu "Bayar" atau "Scan QR"`,
        `Masukkan kode pembayaran atau scan QR code`,
        `Pastikan nominal Rp ${formattedAmount}`,
        'Konfirmasi pembayaran',
      ],
    }
  }

  if (method.includes('card') || method.includes('credit') || method.includes('debit')) {
    return {
      method: 'card',
      title: 'Pembayaran Kartu',
      steps: [
        'Masukkan nomor kartu kredit/debit Anda',
        'Masukkan tanggal kadaluarsa kartu',
        'Masukkan CVV (3 digit di belakang kartu)',
        `Nominal yang dibayar: Rp ${formattedAmount}`,
        'Klik "Bayar Sekarang"',
      ],
    }
  }

  // Default VA
  const bankName = method.replace('va_', '').toUpperCase() || 'BCA'
  return {
    method: 'va',
    title: `Virtual Account ${bankName}`,
    bankName,
    vaNumber: va,
    amount: formattedAmount,
    steps: [
      `Buka aplikasi ${bankName} atau ATM terdekat`,
      'Pilih menu "Transfer" atau "Pembayaran"',
      'Pilih "Virtual Account"',
      `Masukkan nomor VA: ${va}`,
      `Pastikan nominal tepat: Rp ${formattedAmount}`,
      'Konfirmasi pembayaran',
    ],
  }
}
