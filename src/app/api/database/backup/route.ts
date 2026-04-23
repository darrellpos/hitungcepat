import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, getServerUser } from '@/lib/server-auth'
import fs from 'fs'
import path from 'path'

export async function POST(req: NextRequest) {
  const err = requireAdmin(req); if (err) return err;
  try {
    // Collect all data from all tables
    const [
      users,
      penggunas,
      posts,
      customers,
      papers,
      printingCosts,
      finishings,
      calonPembelis,
      pembelis,
      settings,
      riwayatCetakan,
    ] = await Promise.all([
      db.user.findMany(),
      db.pengguna.findMany(),
      db.post.findMany(),
      db.customer.findMany(),
      db.paper.findMany(),
      db.printingCost.findMany(),
      db.finishing.findMany(),
      db.calonPembeli.findMany(),
      db.pembeli.findMany(),
      db.setting.findMany(),
      db.riwayatCetakan.findMany(),
    ])

    const backup = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      database: {
        User: users,
        Pengguna: penggunas,
        Post: posts,
        Customer: customers,
        Paper: papers,
        PrintingCost: printingCosts,
        Finishing: finishings,
        CalonPembeli: calonPembelis,
        Pembeli: pembelis,
        Setting: settings,
        RiwayatCetakan: riwayatCetakan,
      },
    }

    // Save to file system
    const backupsDir = path.join(process.cwd(), 'backups')
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true })
    }

    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const fileName = `backup-${dateStr}.json`
    const filePath = path.join(backupsDir, fileName)

    fs.writeFileSync(filePath, JSON.stringify(backup, null, 2), 'utf-8')

    // Also return as downloadable JSON
    return NextResponse.json({
      success: true,
      message: 'Database berhasil di-backup',
      fileName,
      fileCount: Object.values(backup.database).reduce((acc, arr) => acc + arr.length, 0),
      timestamp: backup.timestamp,
      backup, // return the full backup data so user can download
    })
  } catch (error) {
    console.error('Backup error:', error)
    return NextResponse.json(
      { success: false, error: 'Gagal melakukan backup database' },
      { status: 500 }
    )
  }
}
