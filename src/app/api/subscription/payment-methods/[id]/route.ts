import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// DELETE /api/subscription/payment-methods/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      )
    }

    const paymentMethod = await db.paymentMethod.findFirst({
      where: { id, userId },
    })

    if (!paymentMethod) {
      return NextResponse.json(
        { success: false, error: 'Payment method not found' },
        { status: 404 }
      )
    }

    // Check if payment method is used in any active payment records
    const activePayments = await db.paymentRecord.findMany({
      where: {
        paymentMethodId: id,
        status: 'pending',
      },
    })

    if (activePayments.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot delete payment method with pending payments',
        },
        { status: 400 }
      )
    }

    await db.paymentMethod.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Payment method deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting payment method:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete payment method' },
      { status: 500 }
    )
  }
}
