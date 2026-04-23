import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getServerUser, getDataFilter, isAdmin, requireAuth } from '@/lib/server-auth'

export async function GET(request: NextRequest) {
  try {
    const user = getServerUser(request)
    // Admin can see ALL pembeli (same as calon pembeli)
    // Regular users can only see their own
    const whereFilter = user && isAdmin(user.role) ? {} : await getDataFilter(user)
    const list = await db.pembeli.findMany({
      where: whereFilter,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        nama: true,
        nomorHP: true,
        email: true,
        alamat: true,
        catatan: true,
        role: true,
        expiredDate: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
      }
    })
    return NextResponse.json(list)
  } catch (error) {
    console.error('Get pembeli error:', error)
    return NextResponse.json(
      { error: 'Gagal mengambil data pembeli' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authErr = requireAuth(request)
    if (authErr) return authErr
    const user = getServerUser(request)!
    const body = await request.json()
    const { nama, nomorHP, email, alamat, catatan, role, expiredDate } = body

    if (!nama || !nomorHP) {
      return NextResponse.json(
        { error: 'Nama dan nomor HP wajib diisi' },
        { status: 400 }
      )
    }

    const pembeli = await db.pembeli.create({
      data: {
        nama,
        nomorHP,
        email: email || '',
        alamat: alamat || '',
        catatan: catatan || '',
        role: role || 'demo',
        expiredDate: expiredDate ? new Date(expiredDate) : null,
        userId: user?.id || null,
      }
    })

    return NextResponse.json(pembeli, { status: 201 })
  } catch (error) {
    console.error('Create pembeli error:', error)
    return NextResponse.json(
      { error: 'Gagal menambahkan pembeli' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authErr = requireAuth(request)
    if (authErr) return authErr
    const user = getServerUser(request)!
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID pembeli diperlukan' },
        { status: 400 }
      )
    }

    const existing = await db.pembeli.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Pembeli tidak ditemukan' },
        { status: 404 }
      )
    }

    // Admin can delete any pembeli, regular users only their own
    if (!isAdmin(user.role) && existing.userId !== user?.id) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    await db.pembeli.delete({ where: { id } })

    return NextResponse.json(
      { message: 'Pembeli berhasil dihapus' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Delete pembeli error:', error)
    return NextResponse.json(
      { error: 'Gagal menghapus pembeli' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authErr = requireAuth(request)
    if (authErr) return authErr
    const user = getServerUser(request)!
    const body = await request.json()
    const { id, nama, nomorHP, email, alamat, catatan, role, expiredDate } = body

    if (!id) {
      return NextResponse.json(
        { error: 'ID pembeli diperlukan' },
        { status: 400 }
      )
    }

    const existing = await db.pembeli.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Pembeli tidak ditemukan' },
        { status: 404 }
      )
    }

    // Admin can edit any pembeli, regular users only their own
    if (!isAdmin(user.role) && existing.userId !== user?.id) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const updateData: Record<string, any> = {}
    if (nama !== undefined) updateData.nama = nama
    if (nomorHP !== undefined) updateData.nomorHP = nomorHP
    if (email !== undefined) updateData.email = email
    if (alamat !== undefined) updateData.alamat = alamat
    if (catatan !== undefined) updateData.catatan = catatan
    if (role !== undefined) updateData.role = role
    if (expiredDate !== undefined) updateData.expiredDate = expiredDate ? new Date(expiredDate) : null

    const updated = await db.pembeli.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update pembeli error:', error)
    return NextResponse.json(
      { error: 'Gagal mengupdate pembeli' },
      { status: 500 }
    )
  }
}
