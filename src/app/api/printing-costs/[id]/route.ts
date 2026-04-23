import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerUser, requireAuth } from '@/lib/server-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authErr = requireAuth(request)
    if (authErr) return authErr
    const user = getServerUser(request)!
    const { id } = await params
    const printingCost = await db.printingCost.findUnique({
      where: { id }
    })

    if (!printingCost) {
      return NextResponse.json(
        { error: 'Printing cost not found' },
        { status: 404 }
      )
    }

    // Strict ownership: only the owner can access their own records
    if (printingCost.userId !== user?.id) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    return NextResponse.json(printingCost)
  } catch (error) {
    console.error('Error fetching printing cost:', error)
    return NextResponse.json(
      { error: 'Failed to fetch printing cost' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authErr = requireAuth(request)
    if (authErr) return authErr
    const user = getServerUser(request)!
    const { id } = await params

    const existing = await db.printingCost.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Printing cost not found' }, { status: 404 })
    }

    // Strict ownership: only the owner can edit their own records
    if (existing.userId !== user?.id) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const body = await request.json()
    const {
      machineName,
      grammage,
      printAreaWidth,
      printAreaHeight,
      pricePerColor,
      specialColorPrice,
      minimumPrintQuantity,
      priceAboveMinimumPerSheet,
      platePricePerSheet
    } = body

    const printingCost = await db.printingCost.update({
      where: { id },
      data: {
        machineName,
        grammage: parseInt(grammage),
        printAreaWidth: parseFloat(printAreaWidth),
        printAreaHeight: parseFloat(printAreaHeight),
        pricePerColor: parseFloat(pricePerColor),
        specialColorPrice: parseFloat(specialColorPrice),
        minimumPrintQuantity: parseInt(minimumPrintQuantity),
        priceAboveMinimumPerSheet: parseFloat(priceAboveMinimumPerSheet),
        platePricePerSheet: parseFloat(platePricePerSheet)
      }
    })

    return NextResponse.json(printingCost)
  } catch (error) {
    console.error('Error updating printing cost:', error)
    return NextResponse.json(
      { error: 'Failed to update printing cost' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authErr = requireAuth(request)
    if (authErr) return authErr
    const user = getServerUser(request)!
    const { id } = await params

    const existing = await db.printingCost.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Printing cost not found' }, { status: 404 })
    }

    // Strict ownership: only the owner can delete their own records
    if (existing.userId !== user?.id) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    await db.printingCost.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Printing cost deleted successfully' })
  } catch (error) {
    console.error('Error deleting printing cost:', error)
    return NextResponse.json(
      { error: 'Failed to delete printing cost' },
      { status: 500 }
    )
  }
}
