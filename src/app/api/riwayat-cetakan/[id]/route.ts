import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerUser, requireAuth } from '@/lib/server-auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authErr = requireAuth(request)
    if (authErr) return authErr
    const user = getServerUser(request)!
    const { id } = await params
    const body = await request.json()

    const item = await db.riwayatCetakan.findUnique({ where: { id } })
    if (!item) {
      return NextResponse.json({ error: 'Riwayat tidak ditemukan' }, { status: 404 })
    }

    if (item.userId !== user.id) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const updated = await db.riwayatCetakan.update({
      where: { id },
      data: {
        printName: body.printName ?? item.printName,
        customerName: body.customerName ?? item.customerName,
        paperName: body.paperName ?? item.paperName,
        paperGrammage: body.paperGrammage ?? item.paperGrammage,
        paperLength: body.paperLength ?? item.paperLength,
        paperWidth: body.paperWidth ?? item.paperWidth,
        cutWidth: body.cutWidth ?? item.cutWidth,
        cutHeight: body.cutHeight ?? item.cutHeight,
        quantity: body.quantity ?? item.quantity,
        warna: body.warna ?? item.warna,
        warnaKhusus: body.warnaKhusus ?? item.warnaKhusus,
        machineName: body.machineName ?? item.machineName,
        hargaPlat: body.hargaPlat ?? item.hargaPlat,
        ongkosCetak: body.ongkosCetak ?? item.ongkosCetak,
        ongkosCetakDetail: body.ongkosCetakDetail ?? item.ongkosCetakDetail,
        machineName2: body.machineName2 ?? item.machineName2,
        ongkosCetak2: body.ongkosCetak2 ?? item.ongkosCetak2,
        ongkosCetak2Detail: body.ongkosCetak2Detail ?? item.ongkosCetak2Detail,
        totalPaperPrice: body.totalPaperPrice ?? item.totalPaperPrice,
        pricePerSheet: body.pricePerSheet ?? item.pricePerSheet,
        finishingNames: body.finishingNames ?? item.finishingNames,
        finishingBreakdown: body.finishingBreakdown ?? item.finishingBreakdown,
        finishingCost: body.finishingCost ?? item.finishingCost,
        packingCost: body.packingCost ?? item.packingCost,
        shippingCost: body.shippingCost ?? item.shippingCost,
        otherCost: body.otherCost ?? item.otherCost,
        glueCost: body.glueCost ?? item.glueCost,
        glueBorongan: body.glueBorongan ?? item.glueBorongan,
        subTotal: body.subTotal ?? item.subTotal,
        profitPercent: body.profitPercent ?? item.profitPercent,
        profitAmount: body.profitAmount ?? item.profitAmount,
        grandTotal: body.grandTotal ?? item.grandTotal,
      }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating riwayat cetakan:', error)
    return NextResponse.json({ error: 'Gagal mengupdate riwayat' }, { status: 500 })
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

    // Find the item first to check ownership
    const item = await db.riwayatCetakan.findUnique({ where: { id } })
    if (!item) {
      return NextResponse.json({ error: 'Riwayat tidak ditemukan' }, { status: 404 })
    }

    // Strict ownership: only the owner can delete their own records
    if (item.userId !== user.id) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    await db.riwayatCetakan.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting riwayat cetakan:', error)
    return NextResponse.json({ error: 'Gagal menghapus' }, { status: 500 })
  }
}
