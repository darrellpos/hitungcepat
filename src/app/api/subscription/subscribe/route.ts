import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

function generateTransactionId(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `TXN-${timestamp}-${random}`
}

function generateVANumber(provider: string): string {
  const prefixes: Record<string, string> = {
    BCA: '8800',
    Mandiri: '8900',
    BNI: '8700',
    BRI: '8600',
    Permata: '7100',
  }
  const prefix = prefixes[provider] || '8800'
  const segment1 = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  const segment2 = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  const segment3 = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `${prefix}-${segment1}-${segment2}-${segment3}`
}

function generateEwalletUrl(provider: string): string {
  const urls: Record<string, string> = {
    gopay: `https://api.sandbox.midtrans.com/v2/gopay/pay?id=${Date.now()}`,
    ovo: `https://api.sandbox.midtrans.com/v2/ovo/pay?id=${Date.now()}`,
    dana: `https://api.sandbox.midtrans.com/v2/dana/pay?id=${Date.now()}`,
    shopeepay: `https://api.sandbox.midtrans.com/v2/shopeepay/pay?id=${Date.now()}`,
    linkaja: `https://api.sandbox.midtrans.com/v2/linkaja/pay?id=${Date.now()}`,
  }
  return urls[provider] || `https://api.sandbox.midtrans.com/v2/ewallet/pay?id=${Date.now()}`
}

function generateCardToken(): string {
  return `tok_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { planId, paymentMethodId, userId } = body

    if (!planId || !userId) {
      return NextResponse.json(
        { success: false, error: 'planId and userId are required' },
        { status: 400 }
      )
    }

    // Find the plan
    const plan = await db.subscriptionPlan.findUnique({
      where: { id: planId },
    })

    if (!plan) {
      return NextResponse.json(
        { success: false, error: 'Subscription plan not found' },
        { status: 404 }
      )
    }

    if (!plan.isActive) {
      return NextResponse.json(
        { success: false, error: 'This plan is no longer available' },
        { status: 400 }
      )
    }

    // Find payment method
    let paymentMethod = null
    if (paymentMethodId) {
      paymentMethod = await db.paymentMethod.findFirst({
        where: { id: paymentMethodId, userId },
      })
    }

    // Determine payment details based on type
    const paymentType = paymentMethod?.type || 'bank_transfer'
    const provider = paymentMethod?.provider || 'BCA'

    let vaNumber = ''
    let ewalletUrl = ''
    let cardToken = ''
    let paymentProvider = provider

    if (paymentType === 'bank_transfer') {
      vaNumber = generateVANumber(provider)
      paymentProvider = provider
    } else if (paymentType === 'ewallet') {
      ewalletUrl = generateEwalletUrl(provider)
      paymentProvider = provider
    } else if (paymentType === 'credit_card') {
      cardToken = generateCardToken()
      paymentProvider = provider
    }

    const transactionId = generateTransactionId()
    const now = new Date()
    const expiredAt = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours

    // Calculate subscription dates
    const startDate = new Date()
    let endDate: Date | null = null
    if (plan.interval === 'monthly') {
      endDate = new Date(startDate)
      endDate.setMonth(endDate.getMonth() + 1)
    } else if (plan.interval === 'yearly') {
      endDate = new Date(startDate)
      endDate.setFullYear(endDate.getFullYear() + 1)
    }

    // Create user subscription
    const subscription = await db.userSubscription.create({
      data: {
        userId,
        planId: plan.id,
        status: 'active',
        startDate,
        endDate,
        autoRenew: true,
        paymentMethodId: paymentMethod?.id || null,
      },
    })

    // Create payment record
    const payment = await db.paymentRecord.create({
      data: {
        userId,
        subscriptionId: subscription.id,
        paymentMethodId: paymentMethod?.id || null,
        amount: plan.price,
        currency: plan.currency,
        status: plan.price === 0 ? 'success' : 'pending',
        paymentType: 'subscription',
        provider: paymentProvider,
        transactionId,
        vaNumber,
        ewalletUrl,
        paidAt: plan.price === 0 ? now : null,
        expiredAt,
        metadata: JSON.stringify({
          planName: plan.name,
          planInterval: plan.interval,
        }),
      },
    })

    // Create notification
    await db.notification.create({
      data: {
        userId,
        title: plan.price === 0 ? 'Free Plan Activated' : 'Subscription Created',
        message: plan.price === 0
          ? `Your ${plan.name} plan has been activated for free!`
          : `Your ${plan.name} plan subscription has been created. Please complete the payment of Rp ${plan.price.toLocaleString('id-ID')} before ${expiredAt.toLocaleDateString('id-ID')}.`,
        type: plan.price === 0 ? 'success' : 'info',
        link: '/billing',
      },
    })

    // Build response with payment details
    const paymentDetails: Record<string, string> = {
      transactionId,
      amount: plan.price.toString(),
      currency: plan.currency,
      status: payment.status,
      expiredAt: expiredAt.toISOString(),
    }

    if (paymentType === 'bank_transfer') {
      paymentDetails.paymentType = 'bank_transfer'
      paymentDetails.provider = paymentProvider
      paymentDetails.vaNumber = vaNumber
    } else if (paymentType === 'ewallet') {
      paymentDetails.paymentType = 'ewallet'
      paymentDetails.provider = paymentProvider
      paymentDetails.redirectUrl = ewalletUrl
    } else if (paymentType === 'credit_card') {
      paymentDetails.paymentType = 'credit_card'
      paymentDetails.provider = paymentProvider
      paymentDetails.token = cardToken
    }

    return NextResponse.json({
      success: true,
      data: {
        subscription: {
          id: subscription.id,
          planId: plan.id,
          planName: plan.name,
          status: subscription.status,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
          autoRenew: subscription.autoRenew,
        },
        payment: paymentDetails,
      },
    })
  } catch (error) {
    console.error('Error creating subscription:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create subscription',
      },
      { status: 500 }
    )
  }
}
