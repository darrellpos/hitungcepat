import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/subscription/payment-methods?userId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      )
    }

    const paymentMethods = await db.paymentMethod.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json({
      success: true,
      data: paymentMethods,
    })
  } catch (error) {
    console.error('Error fetching payment methods:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payment methods' },
      { status: 500 }
    )
  }
}

// POST /api/subscription/payment-methods - Add payment method
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, type, label, provider, accountNumber, isDefault } = body

    if (!userId || !type || !label) {
      return NextResponse.json(
        { success: false, error: 'userId, type, and label are required' },
        { status: 400 }
      )
    }

    const validTypes = ['bank_transfer', 'ewallet', 'credit_card']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await db.paymentMethod.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      })
    }

    const paymentMethod = await db.paymentMethod.create({
      data: {
        userId,
        type,
        label,
        provider: provider || '',
        accountNumber: accountNumber || '',
        isDefault: isDefault || false,
      },
    })

    return NextResponse.json({
      success: true,
      data: paymentMethod,
      message: 'Payment method added successfully',
    })
  } catch (error) {
    console.error('Error adding payment method:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to add payment method' },
      { status: 500 }
    )
  }
}
