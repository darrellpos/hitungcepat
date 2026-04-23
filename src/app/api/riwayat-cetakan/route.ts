import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerUser, getDataFilter, requireAuth } from '@/lib/server-auth'

export async function GET(request: NextRequest) {
  try {
    const user = getServerUser(request)
    const riwayat = await db.riwayatCetakan.findMany({
      where: await getDataFilter(user),
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(riwayat)
  } catch (error) {
    console.error('Error fetching riwayat cetakan:', error)
    return NextResponse.json({ error: 'Failed to fetch riwayat' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authErr = requireAuth(request)
    if (authErr) return authErr
    const user = getServerUser(request)!
    const body = await request.json()

    const riwayat = await db.riwayatCetakan.create({
      data: {
        printName: body.printName || '',
        customerName: body.customerName || '',
        paperName: body.paperName || '',
        paperGrammage: body.paperGrammage || '0',
        paperLength: body.paperLength || '',
        paperWidth: body.paperWidth || '',
        cutWidth: body.cutWidth || '',
        cutHeight: body.cutHeight || '',
        quantity: body.quantity || '',
        warna: body.warna || '',
        warnaKhusus: body.warnaKhusus || '',
        machineName: body.machineName || '',
        hargaPlat: body.hargaPlat || 0,
        ongkosCetak: body.ongkosCetak || 0,
        ongkosCetakDetail: body.ongkosCetakDetail || '',
        machineName2: body.machineName2 || '',
        ongkosCetak2: body.ongkosCetak2 || 0,
        ongkosCetak2Detail: body.ongkosCetak2Detail || '',
        totalPaperPrice: body.totalPaperPrice || 0,
        finishingNames: body.finishingNames || '',
        finishingBreakdown: body.finishingBreakdown || '',
        finishingCost: body.finishingCost || 0,
        packingCost: body.packingCost || 0,
        shippingCost: body.shippingCost || 0,
        otherCost: body.otherCost || 0,
        glueCost: body.glueCost || 0,
        glueBorongan: body.glueBorongan || 0,
        subTotal: body.subTotal || 0,
        profitPercent: body.profitPercent || 0,
        profitAmount: body.profitAmount || 0,
        grandTotal: body.grandTotal || 0,
        userId: user?.id || null,
      }
    })

    return NextResponse.json(riwayat, { status: 201 })
  } catch (error) {
    console.error('Error creating riwayat cetakan:', error)
    return NextResponse.json({ error: 'Failed to save riwayat' }, { status: 500 })
  }
}
