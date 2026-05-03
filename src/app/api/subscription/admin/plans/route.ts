import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/subscription/admin/plans - Create plan
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, price, currency, interval, features, isActive, sortOrder } = body

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'name is required' },
        { status: 400 }
      )
    }

    const plan = await db.subscriptionPlan.create({
      data: {
        name,
        description: description || '',
        price: price || 0,
        currency: currency || 'IDR',
        interval: interval || 'monthly',
        features: features ? JSON.stringify(features) : '[]',
        isActive: isActive !== undefined ? isActive : true,
        sortOrder: sortOrder || 0,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        ...plan,
        features: JSON.parse(plan.features || '[]'),
      },
      message: 'Plan created successfully',
    })
  } catch (error) {
    console.error('Error creating plan:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create plan' },
      { status: 500 }
    )
  }
}

// PUT /api/subscription/admin/plans - Update plan
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, description, price, currency, interval, features, isActive, sortOrder } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      )
    }

    const existingPlan = await db.subscriptionPlan.findUnique({
      where: { id },
    })

    if (!existingPlan) {
      return NextResponse.json(
        { success: false, error: 'Plan not found' },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (price !== undefined) updateData.price = price
    if (currency !== undefined) updateData.currency = currency
    if (interval !== undefined) updateData.interval = interval
    if (features !== undefined) updateData.features = JSON.stringify(features)
    if (isActive !== undefined) updateData.isActive = isActive
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder

    const plan = await db.subscriptionPlan.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      data: {
        ...plan,
        features: JSON.parse(plan.features || '[]'),
      },
      message: 'Plan updated successfully',
    })
  } catch (error) {
    console.error('Error updating plan:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update plan' },
      { status: 500 }
    )
  }
}
