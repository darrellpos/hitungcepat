import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, getServerUser } from '@/lib/server-auth'
import fs from 'fs'
import path from 'path'

export async function POST(req: NextRequest) {
  const err = requireAdmin(req); if (err) return err;
  try {
    const body = await req.json()
    const { fileName, backupData } = body

    let data: any

    if (backupData && typeof backupData === 'object' && backupData.database) {
      // Restore from uploaded JSON data directly
      data = backupData
    } else if (fileName && typeof fileName === 'string') {
      // Restore from a saved backup file
      const filePath = path.join(process.cwd(), 'backups', fileName)
      if (!fs.existsSync(filePath)) {
        return NextResponse.json(
          { success: false, error: 'File backup tidak ditemukan' },
          { status: 404 }
        )
      }
      const raw = fs.readFileSync(filePath, 'utf-8')
      data = JSON.parse(raw)
    } else {
      return NextResponse.json(
        { success: false, error: 'Data backup tidak valid' },
        { status: 400 }
      )
    }

    if (!data.database || typeof data.database !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Format backup tidak valid' },
        { status: 400 }
      )
    }

    // Validate required fields
    const requiredTables = ['Pengguna', 'Customer', 'Paper', 'PrintingCost', 'Finishing', 'CalonPembeli', 'Pembeli', 'Setting', 'RiwayatCetakan']
    for (const table of requiredTables) {
      if (!Array.isArray(data.database[table])) {
        return NextResponse.json(
          { success: false, error: `Format backup tidak valid: tabel ${table} tidak ditemukan` },
          { status: 400 }
        )
      }
    }

    // Delete all existing data in correct order (respect foreign keys)
    await db.riwayatCetakan.deleteMany()
    await db.calonPembeli.deleteMany()
    await db.pembeli.deleteMany()
    await db.finishing.deleteMany()
    await db.printingCost.deleteMany()
    await db.paper.deleteMany()
    await db.customer.deleteMany()
    await db.setting.deleteMany()
    await db.pengguna.deleteMany()
    await db.post.deleteMany()
    await db.user.deleteMany()

    // Restore data in correct order (respect foreign keys)
    if (data.database.User && data.database.User.length > 0) {
      await db.user.createMany({ data: data.database.User.map((r: any) => {
        const { id, ...rest } = r
        return rest
      }) })
    }

    if (data.database.Pengguna && data.database.Pengguna.length > 0) {
      await db.pengguna.createMany({ data: data.database.Pengguna.map((r: any) => {
        const { id, ...rest } = r
        return rest
      }) })
    }

    if (data.database.Post && data.database.Post.length > 0) {
      await db.post.createMany({ data: data.database.Post.map((r: any) => {
        const { id, ...rest } = r
        return rest
      }) })
    }

    if (data.database.Customer && data.database.Customer.length > 0) {
      await db.customer.createMany({ data: data.database.Customer.map((r: any) => {
        const { id, ...rest } = r
        return rest
      }) })
    }

    if (data.database.Paper && data.database.Paper.length > 0) {
      await db.paper.createMany({ data: data.database.Paper.map((r: any) => {
        const { id, ...rest } = r
        return rest
      }) })
    }

    if (data.database.PrintingCost && data.database.PrintingCost.length > 0) {
      await db.printingCost.createMany({ data: data.database.PrintingCost.map((r: any) => {
        const { id, ...rest } = r
        return rest
      }) })
    }

    if (data.database.Finishing && data.database.Finishing.length > 0) {
      await db.finishing.createMany({ data: data.database.Finishing.map((r: any) => {
        const { id, ...rest } = r
        return rest
      }) })
    }

    if (data.database.CalonPembeli && data.database.CalonPembeli.length > 0) {
      await db.calonPembeli.createMany({ data: data.database.CalonPembeli.map((r: any) => {
        const { id, ...rest } = r
        return rest
      }) })
    }

    if (data.database.Pembeli && data.database.Pembeli.length > 0) {
      await db.pembeli.createMany({ data: data.database.Pembeli.map((r: any) => {
        const { id, ...rest } = r
        return rest
      }) })
    }

    if (data.database.Setting && data.database.Setting.length > 0) {
      await db.setting.createMany({ data: data.database.Setting.map((r: any) => {
        const { id, ...rest } = r
        return rest
      }) })
    }

    if (data.database.RiwayatCetakan && data.database.RiwayatCetakan.length > 0) {
      await db.riwayatCetakan.createMany({ data: data.database.RiwayatCetakan.map((r: any) => {
        const { id, ...rest } = r
        return rest
      }) })
    }

    return NextResponse.json({
      success: true,
      message: 'Database berhasil di-restore',
      timestamp: data.timestamp,
      restoredTables: Object.keys(data.database).length,
    })
  } catch (error) {
    console.error('Restore error:', error)
    return NextResponse.json(
      { success: false, error: 'Gagal melakukan restore database: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}
