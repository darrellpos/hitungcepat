import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getServerUser } from '@/lib/server-auth'
import fs from 'fs'
import path from 'path'

export async function GET(request: NextRequest) {
  const err = requireAdmin(request); if (err) return err;
  try {
    const backupsDir = path.join(process.cwd(), 'backups')
    if (!fs.existsSync(backupsDir)) {
      return NextResponse.json({ success: true, backups: [] })
    }

    const files = fs.readdirSync(backupsDir)
      .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
      .map(f => {
        const filePath = path.join(backupsDir, f)
        const stats = fs.statSync(filePath)
        const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
        return {
          fileName: f,
          size: stats.size,
          sizeFormatted: formatFileSize(stats.size),
          createdAt: stats.birthtime.toISOString(),
          timestamp: content.timestamp,
          tableCount: Object.keys(content.database || {}).length,
          rowCount: Object.values(content.database || {}).reduce((acc: number, arr: any) => acc + arr.length, 0),
        }
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({ success: true, backups: files })
  } catch (error) {
    console.error('List backups error:', error)
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil daftar backup' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  const err = requireAdmin(req); if (err) return err;
  try {
    const { searchParams } = new URL(req.url)
    const fileName = searchParams.get('fileName')

    if (!fileName) {
      return NextResponse.json(
        { success: false, error: 'Nama file wajib diisi' },
        { status: 400 }
      )
    }

    // Validate fileName to prevent path traversal
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      return NextResponse.json(
        { success: false, error: 'Nama file tidak valid' },
        { status: 400 }
      )
    }

    const filePath = path.join(process.cwd(), 'backups', fileName)
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { success: false, error: 'File backup tidak ditemukan' },
        { status: 404 }
      )
    }

    fs.unlinkSync(filePath)

    return NextResponse.json({ success: true, message: 'Backup berhasil dihapus' })
  } catch (error) {
    console.error('Delete backup error:', error)
    return NextResponse.json(
      { success: false, error: 'Gagal menghapus backup' },
      { status: 500 }
    )
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
