import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    const methods = await db.paymentMethod.findMany({
      where: { userId },
      orderBy: { isDefault: 'desc' },
    })

    return NextResponse.json({ success: true, methods })
  } catch (error) {
    return NextResponse.json({ error: 'Gagal mengambil metode' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, type, label, provider, accountNumber, isDefault } = body

    if (!userId || !type || !label) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
    }

    if (isDefault) {
      await db.paymentMethod.updateMany({ where: { userId }, data: { isDefault: false } })
    }

    const method = await db.paymentMethod.create({
      data: { userId, type, label, provider: provider || '', accountNumber: accountNumber || '', isDefault: isDefault || false },
    })

    return NextResponse.json({ success: true, method })
  } catch (error) {
    return NextResponse.json({ error: 'Gagal menambah metode' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const userId = searchParams.get('userId')

    if (!id || !userId) {
      return NextResponse.json({ error: 'ID dan User ID diperlukan' }, { status: 400 })
    }

    await db.paymentMethod.deleteMany({ where: { id, userId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Gagal menghapus metode' }, { status: 500 })
  }
}
