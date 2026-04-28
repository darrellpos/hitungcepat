'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { History, Search, Filter, RotateCcw, Eye, Trash2, Printer, FileImage, Loader2, Calculator, Users, Layers, Truck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard-layout'
import { MobileTable } from '@/components/mobile-table'
import { useLanguage } from '@/contexts/language-context'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { getAuthHeaders } from '@/lib/auth'
import dynamic from 'next/dynamic'
import type { CuttingResult } from '@/lib/cutting-engine'

const CuttingDiagram = dynamic(
  () => import('@/components/cutting-results').then(m => ({ default: m.CuttingDiagram })),
  { ssr: false, loading: () => <div className="flex items-center justify-center py-8 text-xs text-slate-400">Memuat diagram...</div> }
)

interface RiwayatItem {
  id: string
  printName: string
  paperName: string
  paperGrammage: string
  paperLength: string
  paperWidth: string
  cutWidth: string
  cutHeight: string
  quantity: string
  warna: string
  warnaKhusus: string
  machineName: string
  hargaPlat: number
  ongkosCetak: number
  ongkosCetakDetail: string
  totalPaperPrice: number
  finishingNames: string
  finishingBreakdown: string
  finishingCost: number
  packingCost: number
  shippingCost: number
  subTotal: number
  profitPercent: number
  profitAmount: number
  grandTotal: number
  createdAt: string
  updatedAt: string
}

export default function RiwayatPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [histories, setHistories] = useState<RiwayatItem[]>([])
  const [loading, setLoading] = useState(true)

  // Preview
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewItem, setPreviewItem] = useState<RiwayatItem | null>(null)
  const [cuttingResult, setCuttingResult] = useState<CuttingResult | null>(null)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchRiwayat()
  }, [])

  const fetchRiwayat = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/riwayat-cetakan', { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setHistories(Array.isArray(data) ? data : [])
      }
    } catch {
      toast.error('Gagal memuat riwayat')
    } finally {
      setLoading(false)
    }
  }

  const handleRestore = (item: RiwayatItem) => {
    const params = new URLSearchParams()
    if (item.printName) params.set('printName', item.printName)
    if (item.paperLength) params.set('paperLength', item.paperLength)
    if (item.paperWidth) params.set('paperWidth', item.paperWidth)
    if (item.cutWidth) params.set('cutWidth', item.cutWidth)
    if (item.cutHeight) params.set('cutHeight', item.cutHeight)
    if (item.quantity) params.set('quantity', item.quantity)
    if (item.totalPaperPrice) params.set('totalPaperPrice', item.totalPaperPrice.toString())
    if (item.packingCost) params.set('packingCost', item.packingCost.toString())
    if (item.shippingCost) params.set('shippingCost', item.shippingCost.toString())
    if (item.profitPercent) params.set('profitPercent', item.profitPercent.toString())
    params.set('restoredFromRiwayat', '1')
    router.push(`/hitung-cetakan?${params.toString()}`)
  }

  const handlePreview = async (item: RiwayatItem) => {
    setPreviewItem(item)
    setCuttingResult(null)
    setPreviewOpen(true)

    // Recalculate cutting result for diagram
    const pw = parseFloat(item.paperLength)
    const ph = parseFloat(item.paperWidth)
    const cw = parseFloat(item.cutWidth)
    const ch = parseFloat(item.cutHeight)
    const qty = parseInt(item.quantity) || 0

    if (pw && ph && cw && ch) {
      try {
        const { calculateCuts } = await import('@/lib/cutting-engine')
        const pricePerSheet = qty > 0 && item.totalPaperPrice > 0
          ? Math.round(item.totalPaperPrice / Math.ceil(qty / 1))
          : 0
        const result = calculateCuts({
          paperWidth: pw,
          paperHeight: ph,
          cutWidth: cw,
          cutHeight: ch,
          quantity: qty,
          pricePerSheet,
          optimizationMode: 'maximal',
          customerName: item.printName || '',
          paperMaterial: item.paperName || '',
          grammage: parseFloat(item.paperGrammage) || 0,
        })
        setCuttingResult(result)
      } catch (err) {
        console.error('Failed to calculate cuts:', err)
      }
    }
  }

  const handleDelete = (item: RiwayatItem) => {
    if (!confirm(`Hapus riwayat "${item.printName}"?`)) return
    fetch(`/api/riwayat-cetakan/${item.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    })
      .then(res => {
        if (res.ok) {
          setHistories(prev => prev.filter(h => h.id !== item.id))
          toast.success('Riwayat berhasil dihapus')
        } else {
          toast.error('Gagal menghapus riwayat')
        }
      })
      .catch(() => toast.error('Gagal menghapus riwayat'))
  }

  const buildRiwayatPrintHtml = useCallback((item: RiwayatItem) => {
    const rp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`
    const fmtQ = (s: string) => parseInt(s || '0').toLocaleString('id-ID')
    const isPotong = !(item.ongkosCetak > 0 || item.machineName !== '-')
    const now = new Date(item.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    const title = isPotong ? 'Rincian Harga Kertas dan Potong' : 'Rincian Harga Cetakan'

    let sections = ''

    if (isPotong) {
      // ===== POTONG KERTAS =====
      const ukuranText = item.cutWidth && item.cutHeight ? `${item.cutWidth} × ${item.cutHeight} cm` : '-'

      sections += `
      <div class="section">
        <div class="section-header">
          <div class="section-icon blue">ℹ</div>
          <span>Informasi</span>
        </div>
        <div class="info-grid">
          <div class="info-card blue">
            <div class="info-label">Customer</div>
            <div class="info-value">${item.printName || '-'}</div>
          </div>
          <div class="info-card teal">
            <div class="info-label">Kertas</div>
            <div class="info-value">${item.paperName} <small>(${item.paperGrammage} gsm)</small></div>
            <div class="info-sublabel">Ukuran: ${item.paperLength}×${item.paperWidth} cm</div>
          </div>
          <div class="info-card purple">
            <div class="info-label">Jumlah Cetakan</div>
            <div class="info-value">${fmtQ(item.quantity)} <small>lembar</small></div>
          </div>
          <div class="info-card slate">
            <div class="info-label">Ukuran Potongan</div>
            <div class="info-value">${ukuranText}</div>
          </div>
        </div>
      </div>`

      // Cutting stats
      if (cuttingResult) {
        sections += `
      <div class="section">
        <div class="section-header">
          <div class="section-icon blue">✂</div>
          <span>Hasil Potong</span>
        </div>
        <div class="info-grid">
          <div class="info-card blue">
            <div class="info-label">Diperlukan</div>
            <div class="info-value">${fmtQ(item.quantity.toString())} <small>lembar</small></div>
          </div>
          <div class="info-card purple">
            <div class="info-label">Potongan / Lembar</div>
            <div class="info-value">${cuttingResult.totalPieces} <small>lembar</small></div>
          </div>
          <div class="info-card teal">
            <div class="info-label">Kertas Dibutuhkan</div>
            <div class="info-value">${cuttingResult.sheetsNeeded} <small>lembar</small></div>
          </div>
          <div class="info-card slate">
            <div class="info-label">Efisiensi Bahan</div>
            <div class="info-value">${cuttingResult.efficiency.toFixed(2)}%</div>
          </div>
        </div>
      </div>`
      }

      // Harga Kertas
      sections += `
      <div class="section">
        <div class="section-header">
          <div class="section-icon teal">📄</div>
          <span>Harga Kertas</span>
        </div>
        <div class="cost-card teal">
          <span class="cost-label">Total Harga Kertas</span>
          <span class="cost-value teal">${rp(item.totalPaperPrice)}</span>
        </div>
      </div>`

      // Grand Total
      sections += `
      <div class="grand-total">
        <div>
          <div class="grand-total-label">Total Harga Kertas</div>
          <div class="grand-total-value">${rp(item.totalPaperPrice)}</div>
        </div>
      </div>`

    } else {
      // ===== HITUNG CETAKAN =====
      const ukuranText = item.cutWidth && item.cutHeight ? `${item.cutWidth} × ${item.cutHeight} cm` : '-'
      const warnaText = `${item.warna || 0} warna${item.warnaKhusus && parseInt(item.warnaKhusus) > 0 ? ` + ${item.warnaKhusus} khusus` : ''}`

      // Informasi Cetakan
      sections += `
      <div class="section">
        <div class="section-header">
          <div class="section-icon blue">ℹ</div>
          <span>Informasi Cetakan</span>
        </div>
        <div class="info-grid">
          <div class="info-card blue">
            <div class="info-label">Customer</div>
            <div class="info-value">${item.printName || '-'}</div>
          </div>
          <div class="info-card purple">
            <div class="info-label">Jumlah Cetakan</div>
            <div class="info-value">${fmtQ(item.quantity)} <small>lembar</small></div>
          </div>
        </div>
      </div>`

      // Harga Bahan
      sections += `
      <div class="section">
        <div class="section-header">
          <div class="section-icon teal">📄</div>
          <span>Harga Bahan</span>
        </div>
        <div class="info-grid">
          <div class="info-card teal">
            <div class="info-label">Kertas</div>
            <div class="info-value">${item.paperName}</div>
            <div class="info-sublabel">${item.paperGrammage} gsm · ${item.paperLength}×${item.paperWidth} cm</div>
          </div>
          <div class="info-card slate">
            <div class="info-label">Ukuran Potongan</div>
            <div class="info-value">${ukuranText}</div>
          </div>
          <div class="info-card emerald" style="grid-column: span 2">
            <div class="info-label">Total Harga Kertas</div>
            <div class="info-value emerald">${rp(item.totalPaperPrice)}</div>
          </div>
        </div>
      </div>`

      // Ongkos Cetak
      if (item.ongkosCetak > 0) {
        sections += `
      <div class="section">
        <div class="section-header">
          <div class="section-icon blue">🔢</div>
          <span>Ongkos Cetak</span>
        </div>
        <div class="cost-card blue">
          <span class="cost-label">Total Ongkos Cetak</span>
          <span class="cost-value blue">${rp(item.ongkosCetak)}</span>
        </div>
      </div>`
      }

      // Finishing
      if (item.finishingNames && item.finishingNames !== '-' && item.finishingCost > 0) {
        const finNames = item.finishingNames.split(',').map(n => n.trim()).filter(Boolean)
        const finRows = finNames.map(n => `<div class="fin-row"><span>${n}</span></div>`).join('')
        sections += `
      <div class="section">
        <div class="section-header">
          <div class="section-icon rose">✂</div>
          <span>Finishing</span>
        </div>
        <div class="fin-card">
          ${finRows}
          <div class="fin-total">
            <span>Total Finishing</span>
            <span class="fin-total-price">${rp(item.finishingCost)}</span>
          </div>
        </div>
      </div>`
      }

      // Biaya Tambahan
      const extras = []
      if (item.packingCost > 0) extras.push({ name: 'Ongkos Packing', val: item.packingCost })
      if (item.shippingCost > 0) extras.push({ name: 'Ongkos Kirim', val: item.shippingCost })
      if (extras.length > 0) {
        const extraRows = extras.map(e =>
          `<div class="extra-item"><div class="extra-icon">💰</div><div class="extra-text"><div class="extra-label">${e.name}</div><div class="extra-price">${rp(e.val)}</div></div></div>`
        ).join('')
        sections += `
      <div class="section">
        <div class="section-header">
          <div class="section-icon amber">💰</div>
          <span>Biaya Tambahan</span>
        </div>
        <div class="extra-grid">${extraRows}</div>
      </div>`
      }

      // Profit
      if (item.profitPercent > 0 && item.profitAmount > 0) {
        sections += `
      <div class="section">
        <div class="section-header">
          <div class="section-icon orange">%</div>
          <span>Profit</span>
        </div>
        <div class="cost-card orange">
          <span class="cost-label">Profit (${item.profitPercent}%)</span>
          <span class="cost-value orange">${rp(item.profitAmount)}</span>
        </div>
      </div>`
      }

      // Rincian
      let rincianRows = `<div class="rincian-row"><span>Harga Kertas</span><span>${rp(item.totalPaperPrice)}</span></div>`
      if (item.ongkosCetak > 0) rincianRows += `<div class="rincian-row"><span>Ongkos Cetak</span><span>${rp(item.ongkosCetak)}</span></div>`
      if (item.finishingCost > 0) rincianRows += `<div class="rincian-row"><span>Finishing</span><span>${rp(item.finishingCost)}</span></div>`
      if (item.packingCost > 0) rincianRows += `<div class="rincian-row"><span>Ongkos Packing</span><span>${rp(item.packingCost)}</span></div>`
      if (item.shippingCost > 0) rincianRows += `<div class="rincian-row"><span>Ongkos Kirim</span><span>${rp(item.shippingCost)}</span></div>`
      rincianRows += `<div class="rincian-row subtotal"><span>Sub Total</span><span>${rp(item.subTotal)}</span></div>`

      sections += `
      <div class="section">
        <div class="rincian-box">${rincianRows}</div>
      </div>`

      // Grand Total
      sections += `
      <div class="grand-total">
        <div>
          <div class="grand-total-label">Total Harga</div>
          <div class="grand-total-value">${rp(item.grandTotal)}</div>
        </div>
        <div class="grand-total-detail">
          <div>Sub Total: ${rp(item.subTotal)}</div>
          ${item.profitAmount > 0 ? `<div>Profit: ${rp(item.profitAmount)}</div>` : ''}
        </div>
      </div>`
    }

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${item.printName}</title>
      <style>
        @page { size: A4 portrait; margin: 12mm 15mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', -apple-system, Arial, sans-serif;
          color: #1e293b; font-size: 11px; line-height: 1.4;
          width: 210mm; min-height: 297mm;
        }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .page { page-break-after: avoid; }
        }
        .page { padding: 0; }
        .header { text-align: center; padding-bottom: 10px; border-bottom: 2px solid #e2e8f0; margin-bottom: 10px; }
        .header h1 { font-size: 18px; font-weight: 800; color: #0f172a; letter-spacing: -0.3px; }
        .header p { font-size: 10px; color: #64748b; margin-top: 3px; }
        .section { margin-bottom: 8px; }
        .section-header { display: flex; align-items: center; gap: 6px; margin-bottom: 5px; }
        .section-header span { font-size: 11px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.5px; }
        .section-icon { width: 20px; height: 20px; border-radius: 5px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; }
        .section-icon.blue { background: #dbeafe; color: #2563eb; }
        .section-icon.teal { background: #ccfbf1; color: #0d9488; }
        .section-icon.rose { background: #ffe4e6; color: #e11d48; }
        .section-icon.amber { background: #fef3c7; color: #d97706; }
        .section-icon.orange { background: #ffedd5; color: #ea580c; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
        .info-card { border-radius: 6px; padding: 6px 8px; }
        .info-card.blue { background: #eff6ff; border: 1px solid #bfdbfe; }
        .info-card.indigo { background: #eef2ff; border: 1px solid #c7d2fe; }
        .info-card.purple { background: #faf5ff; border: 1px solid #e9d5ff; }
        .info-card.slate { background: #f8fafc; border: 1px solid #e2e8f0; }
        .info-card.teal { background: #f0fdfa; border: 1px solid #99f6e4; }
        .info-card.emerald { background: #ecfdf5; border: 1px solid #a7f3d0; }
        .info-label { font-size: 8px; font-weight: 500; color: #64748b; margin-bottom: 1px; }
        .info-card.blue .info-label { color: #3b82f6; }
        .info-card.teal .info-label { color: #0d9488; }
        .info-card.purple .info-label { color: #a855f7; }
        .info-card.emerald .info-label { color: #059669; }
        .info-sublabel { font-size: 8px; color: #94a3b8; margin-top: 1px; }
        .info-value { font-size: 12px; font-weight: 700; color: #334155; }
        .info-card.blue .info-value { color: #1e40af; }
        .info-card.teal .info-value { color: #115e59; }
        .info-card.purple .info-value { color: #7e22ce; }
        .info-card.emerald .info-value { color: #047857; }
        .info-value small { font-size: 9px; font-weight: 400; color: #94a3b8; }
        .cost-card { border-radius: 6px; padding: 8px 10px; display: flex; align-items: center; justify-content: space-between; }
        .cost-card.teal { background: #f0fdfa; border: 1px solid #99f6e4; }
        .cost-card.blue { background: #eff6ff; border: 1px solid #bfdbfe; }
        .cost-card.orange { background: #fff7ed; border: 1px solid #fed7aa; }
        .cost-label { font-size: 12px; font-weight: 700; color: #334155; }
        .cost-card.teal .cost-label { color: #115e59; }
        .cost-card.blue .cost-label { color: #1e40af; }
        .cost-card.orange .cost-label { color: #ea580c; }
        .cost-value { font-size: 15px; font-weight: 800; }
        .cost-value.teal { color: #0f766e; }
        .cost-value.blue { color: #1d4ed8; }
        .cost-value.orange { color: #c2410c; }
        .fin-card { background: #fff1f2; border: 1px solid #fecdd3; border-radius: 6px; padding: 8px 10px; }
        .fin-row { padding: 2px 0; font-size: 11px; color: #9f1239; }
        .fin-total { border-top: 1px solid #fecdd3; margin-top: 4px; padding-top: 5px; display: flex; justify-content: space-between; }
        .fin-total span:first-child { font-size: 10px; font-weight: 700; color: #e11d48; text-transform: uppercase; }
        .fin-total-price { font-size: 13px; font-weight: 800; color: #be123c; }
        .extra-grid { background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 8px 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
        .extra-item { display: flex; align-items: center; gap: 6px; }
        .extra-icon { font-size: 14px; }
        .extra-label { font-size: 9px; color: #b45309; }
        .extra-price { font-size: 12px; font-weight: 700; color: #92400e; }
        .rincian-box { padding: 4px 0; }
        .rincian-row { display: flex; justify-content: space-between; padding: 2px 4px; font-size: 10px; color: #94a3b8; }
        .rincian-row.subtotal { border-top: 1px solid #e2e8f0; margin-top: 3px; padding-top: 4px; color: #64748b; font-weight: 600; }
        .grand-total { background: #0f172a; color: white; border-radius: 10px; padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; margin-top: 6px; }
        .grand-total-label { font-size: 11px; color: #94a3b8; }
        .grand-total-value { font-size: 24px; font-weight: 800; color: #34d399; }
        .grand-total-detail { text-align: right; font-size: 9px; color: #94a3b8; line-height: 1.7; }
      </style>
    </head><body>
      <div class="page">
        <div class="header">
          <h1>${title}</h1>
          <p>${item.printName} · ${item.paperName} · ${now}</p>
        </div>
        ${sections}
      </div>
    </body></html>`
  }, [cuttingResult])

  const handlePrint = () => {
    if (!previewItem) return
    const pw = window.open('', '_blank')
    if (!pw) { toast.error('Popup diblokir'); return }
    pw.document.write(buildRiwayatPrintHtml(previewItem))
    pw.document.close()
    pw.onload = () => setTimeout(() => pw.print(), 200)
  }

  const handlePdf = async () => {
    if (!previewItem) return
    setIsGeneratingPdf(true)
    try {
      const { jsPDF } = await import('jspdf')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfW = pdf.internal.pageSize.getWidth()
      const pdfH = pdf.internal.pageSize.getHeight()
      const margin = 8
      const contentW = pdfW - margin * 2
      const contentH = pdfH - margin * 2

      const a4PxW = 794
      const a4PxH = 1123
      const iframe = document.createElement('iframe')
      iframe.style.cssText = `position:fixed;left:-9999px;top:-9999px;width:${a4PxW}px;height:${a4PxH}px;border:none;`
      document.body.appendChild(iframe)
      const iframeDoc = iframe.contentDocument!
      iframeDoc.open()
      iframeDoc.write(buildRiwayatPrintHtml(previewItem))
      iframeDoc.close()

      await new Promise(resolve => setTimeout(resolve, 600))

      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(iframeDoc.body, {
        scale: 3, useCORS: true, backgroundColor: '#ffffff',
        width: a4PxW, height: iframeDoc.body.scrollHeight,
      })

      document.body.removeChild(iframe)

      const imgData = canvas.toDataURL('image/jpeg', 0.95)
      const imgW = contentW
      const imgH = (canvas.height * imgW) / canvas.width

      if (imgH <= contentH) {
        pdf.addImage(imgData, 'JPEG', margin, margin, imgW, imgH)
      } else {
        const scaledW = (contentH * imgW) / imgH
        pdf.addImage(imgData, 'JPEG', margin + (contentW - scaledW) / 2, margin, scaledW, contentH)
      }

      pdf.save(`riwayat-${previewItem.printName}-${Date.now()}.pdf`)
      toast.success('PDF berhasil diunduh!')
    } catch { toast.error('Gagal menghasilkan PDF') }
    finally { setIsGeneratingPdf(false) }
  }

  const filteredHistories = histories.filter(h => {
    const term = searchTerm.toLowerCase()
    const matchesSearch = h.printName.toLowerCase().includes(term) || h.paperName.toLowerCase().includes(term) || h.machineName.toLowerCase().includes(term)
    const isHitungCetak = h.ongkosCetak > 0 || h.machineName !== '-'
    const matchesFilter = filterType === 'all' || (filterType === 'Hitung Cetakan' && isHitungCetak) || (filterType === 'Potong Kertas' && !isHitungCetak)
    return matchesSearch && matchesFilter
  })

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    } catch { return d }
  }

  const formatRp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`

  const getJenis = (h: RiwayatItem) => (h.ongkosCetak > 0 || h.machineName !== '-') ? 'Hitung Cetakan' : 'Potong Kertas'

  const columns = [
    {
      key: 'jenis',
      title: 'Jenis',
      render: (h: RiwayatItem) => {
        const jenis = getJenis(h)
        const isPotong = jenis === 'Potong Kertas'
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${isPotong ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'}`}>
            {isPotong ? '✂️' : '🖨️'} {jenis}
          </span>
        )
      }
    },
    {
      key: 'printName',
      title: 'Customer',
      render: (h: RiwayatItem) => (
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span className="font-medium text-slate-800 truncate">{h.printName}</span>
        </div>
      )
    },
    {
      key: 'paperName',
      title: 'Kertas',
      render: (h: RiwayatItem) => (
        <div>
          <div className="font-medium text-slate-700">{h.paperName}</div>
          <div className="text-xs text-slate-400">{h.paperGrammage} gsm · {h.paperLength}×{h.paperWidth} cm</div>
        </div>
      )
    },
    {
      key: 'quantity',
      title: 'Jumlah',
      render: (h: RiwayatItem) => `${parseInt(h.quantity || '0').toLocaleString()} lbr`
    },
    {
      key: 'grandTotal',
      title: 'Total Harga',
      render: (h: RiwayatItem) => (
        <span className="font-bold text-emerald-700">{formatRp(h.grandTotal)}</span>
      )
    },
    {
      key: 'createdAt',
      title: 'Tanggal',
      render: (h: RiwayatItem) => (
        <span className="text-xs text-slate-500">{formatDate(h.createdAt)}</span>
      )
    }
  ]


  return (
    <DashboardLayout title={t('riwayat')} subtitle={t('subtitle_riwayat')}>
      <div className="space-y-4 lg:space-y-6">
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 lg:p-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-col lg:flex-row gap-4 w-full lg:flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" placeholder="Cari riwayat..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
                  className="pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white w-full lg:w-auto">
                  <option value="all">Semua Tipe</option>
                  <option value="Hitung Cetakan">Hitung Cetakan</option>
                  <option value="Potong Kertas">Potong Kertas</option>
                </select>
              </div>
            </div>
            <div className="text-xs text-slate-400">{filteredHistories.length} data</div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 lg:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
              <span className="text-sm text-slate-500">Memuat riwayat...</span>
            </div>
          ) : (
            <MobileTable
              data={filteredHistories}
              columns={columns}
              keyField="id"
              onDelete={handleDelete}
              showAsButtons={true}
              emptyMessage="Belum ada riwayat perhitungan"
              emptyIcon={<History className="w-12 h-12 mx-auto text-slate-400" />}
              extraActions={(item: RiwayatItem) => (
                <div className="flex items-center gap-1">
                  <button onClick={() => handlePreview(item)} title={t('preview')}
                    className="p-1.5 rounded-lg bg-violet-100 hover:bg-violet-200 text-violet-700 transition-colors">
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleRestore(item)} title={t('restore_ke_hitung')}
                    className="p-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 transition-colors">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              mobileCardActions={(item: RiwayatItem) => (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                  <button onClick={() => handlePreview(item)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium transition-colors">
                    <Eye className="w-3.5 h-3.5" /> Preview
                  </button>
                  <button onClick={() => handleRestore(item)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors">
                    <RotateCcw className="w-3.5 h-3.5" /> Restore
                  </button>
                  <button onClick={() => handleDelete(item)}
                    className="py-2 px-3 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            />
          )}
        </div>
      </div>

      {/* ===== PREVIEW DIALOG ===== */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>{previewItem && getJenis(previewItem) === 'Potong Kertas' ? 'Detail Potong Kertas' : 'Detail Riwayat Cetakan'}</DialogTitle>
          </DialogHeader>

          {previewItem && (() => {
            const isPotong = getJenis(previewItem) === 'Potong Kertas'
            return (
              <>
                <div ref={previewRef} className="p-4 bg-white">
                  {/* Header */}
                  <div className="text-center mb-4 pb-3 border-b-2 border-slate-200">
                    <h1 className="text-lg font-bold text-slate-900">{isPotong ? 'Rincian Harga Kertas dan Potong' : 'Rincian Harga Cetakan'}</h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {previewItem.printName} · {previewItem.paperName} · {formatDate(previewItem.createdAt)}
                    </p>
                  </div>

                  {/* ===== POTONG KERTAS: cutting details ===== */}
                  {isPotong && (
                    <>
                      {/* Info Grid */}
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                          <p className="text-[10px] text-blue-600 font-medium">{t('customer_label')}</p>
                          <p className="text-sm font-bold text-blue-700">{previewItem.printName}</p>
                        </div>
                        <div className="bg-teal-50 border border-teal-100 rounded-lg p-3">
                          <p className="text-[10px] text-teal-600 font-medium">{t('kertas')}</p>
                          <p className="text-sm font-bold text-teal-700">{previewItem.paperName} ({previewItem.paperGrammage} gsm)</p>
                          <p className="text-[9px] text-teal-500">Ukuran: {previewItem.paperLength}×{previewItem.paperWidth} cm</p>
                        </div>
                        <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
                          <p className="text-[10px] text-purple-600 font-medium">Jumlah Cetakan</p>
                          <p className="text-lg font-bold text-purple-700">{parseInt(previewItem.quantity || '0').toLocaleString()} <span className="text-xs font-normal">lembar</span></p>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                          <p className="text-[10px] text-slate-600 font-medium">Ukuran Potongan</p>
                          <p className="text-sm font-bold text-slate-700">{previewItem.cutWidth && previewItem.cutHeight ? `${previewItem.cutWidth} × ${previewItem.cutHeight} cm` : '-'}</p>
                        </div>
                      </div>

                      {/* Cutting Stats */}
                      {cuttingResult && (
                        <>
                          <div className="grid grid-cols-2 gap-2 mb-3">
                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                              <p className="text-[10px] text-blue-600 font-medium">Diperlukan</p>
                              <p className="text-xl font-bold text-blue-700">{cuttingResult.quantity} <span className="text-xs font-normal">lembar</span></p>
                            </div>
                            <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
                              <p className="text-[10px] text-purple-600 font-medium">Potongan / Lembar</p>
                              <p className="text-xl font-bold text-purple-700">{cuttingResult.totalPieces} <span className="text-xs font-normal">lembar</span></p>
                            </div>
                            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                              <p className="text-[10px] text-emerald-600 font-medium">Kertas Dibutuhkan</p>
                              <p className="text-xl font-bold text-emerald-700">{cuttingResult.sheetsNeeded} <span className="text-xs font-normal">lembar</span></p>
                            </div>
                            <div className="bg-teal-50 border border-teal-100 rounded-lg p-3">
                              <p className="text-[10px] text-teal-600 font-medium">Efisiensi Bahan</p>
                              <p className="text-xl font-bold text-teal-700">{cuttingResult.efficiency.toFixed(2)}%</p>
                            </div>
                          </div>

                          {/* Cutting Diagram */}
                          <div className="mb-3">
                            <div className="text-center">
                              <CuttingDiagram results={cuttingResult} maxHeight="280px" />
                            </div>
                          </div>
                        </>
                      )}

                      {/* Harga Kertas */}
                      <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 mb-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[10px] text-emerald-600 font-medium">Total Harga Kertas</p>
                            <p className="text-lg font-bold text-emerald-700">{formatRp(previewItem.totalPaperPrice)}</p>
                          </div>

                        </div>
                      </div>

                      {/* Grand Total */}
                      <div className="bg-slate-900 text-white rounded-lg p-4 mt-3 flex items-center justify-between">
                        <div>
                          <p className="text-xs text-slate-400">Total Harga Kertas</p>
                          <p className="text-2xl font-extrabold text-emerald-400">{formatRp(previewItem.totalPaperPrice)}</p>
                        </div>
                      </div>
                    </>
                  )}

                  {/* ===== HITUNG CETAKAN: full perincian ===== */}
                  {!isPotong && (
                    <>
                      {/* Section 1: Informasi Cetakan */}
                      <div className="mb-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <div className="w-5 h-5 rounded bg-blue-100 flex items-center justify-center">
                            <Users className="w-3 h-3 text-blue-600" />
                          </div>
                          <p className="text-xs font-bold text-slate-700">Informasi Cetakan</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                            <p className="text-[10px] text-blue-600 font-medium">{t('customer_label')}</p>
                            <p className="text-sm font-bold text-blue-700">{previewItem.printName}</p>
                          </div>
                          <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
                            <p className="text-[10px] text-purple-600 font-medium">Jumlah Cetakan</p>
                            <p className="text-lg font-bold text-purple-700">{parseInt(previewItem.quantity || '0').toLocaleString()} <span className="text-xs font-normal">lembar</span></p>
                          </div>
                        </div>
                      </div>

                      {/* Section 2: Harga Bahan */}
                      <div className="mb-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <div className="w-5 h-5 rounded bg-teal-100 flex items-center justify-center">
                            <FileImage className="w-3 h-3 text-teal-600" />
                          </div>
                          <p className="text-xs font-bold text-slate-700">Harga Bahan</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-teal-50 border border-teal-100 rounded-lg p-3">
                            <p className="text-[10px] text-teal-600 font-medium">{t('kertas')}</p>
                            <p className="text-sm font-bold text-teal-700">{previewItem.paperName}</p>
                            <p className="text-[9px] text-teal-500">{previewItem.paperGrammage} gsm · {previewItem.paperLength}×{previewItem.paperWidth} cm</p>
                          </div>
                          <div className="bg-teal-50 border border-teal-100 rounded-lg p-3">
                            <p className="text-[10px] text-teal-600 font-medium">Ukuran Potongan</p>
                            <p className="text-sm font-bold text-teal-700">{previewItem.cutWidth && previewItem.cutHeight ? `${previewItem.cutWidth} × ${previewItem.cutHeight} cm` : '-'}</p>
                          </div>
                          <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 col-span-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-[10px] text-emerald-600 font-medium">Total Harga Kertas</p>
                                <p className="text-lg font-bold text-emerald-700">{formatRp(previewItem.totalPaperPrice)}</p>
                              </div>

                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Section 5: Cutting Diagram only */}
                      {cuttingResult && (
                        <div className="mb-3">
                          <div className="text-center">
                            <CuttingDiagram results={cuttingResult} maxHeight="280px" />
                          </div>
                        </div>
                      )}

                      {/* Section 3: Ongkos Cetak */}
                      {previewItem.ongkosCetak > 0 && (
                        <div className="mb-3">
                          <div className="flex items-center gap-1.5 mb-2">
                            <div className="w-5 h-5 rounded bg-purple-100 flex items-center justify-center">
                              <Calculator className="w-3 h-3 text-purple-600" />
                            </div>
                            <p className="text-xs font-bold text-slate-700">{t('ongkos_cetak_label')}</p>
                          </div>
                          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] text-blue-600 font-medium">Total Ongkos Cetak</p>
                              <p className="text-lg font-bold text-blue-700">{formatRp(previewItem.ongkosCetak)}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Section 4: Finishing */}
                      {previewItem.finishingNames && previewItem.finishingNames !== '-' && previewItem.finishingCost > 0 && (
                        <div className="mb-3">
                          <div className="flex items-center gap-1.5 mb-2">
                            <div className="w-5 h-5 rounded bg-rose-100 flex items-center justify-center">
                              <Layers className="w-3 h-3 text-rose-600" />
                            </div>
                            <p className="text-xs font-bold text-slate-700">{t('finishing_label')}</p>
                          </div>
                          <div className="bg-rose-50 border border-rose-100 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-[10px] text-rose-600 font-medium">{previewItem.finishingNames}</p>
                              <p className="text-sm font-bold text-rose-700">{formatRp(previewItem.finishingCost)}</p>
                            </div>

                          </div>
                        </div>
                      )}

                      {/* Section 6: Biaya Tambahan */}
                      {(previewItem.packingCost > 0 || previewItem.shippingCost > 0) && (
                        <div className="mb-3">
                          <div className="flex items-center gap-1.5 mb-2">
                            <div className="w-5 h-5 rounded bg-amber-100 flex items-center justify-center">
                              <Truck className="w-3 h-3 text-amber-600" />
                            </div>
                            <p className="text-xs font-bold text-slate-700">Biaya Tambahan</p>
                          </div>
                          <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                            <div className="grid grid-cols-2 gap-2">
                              {previewItem.packingCost > 0 && (
                                <div className="bg-white/60 rounded p-2">
                                  <p className="text-[9px] text-amber-500">Ongkos Packing</p>
                                  <p className="text-sm font-bold text-amber-700">{formatRp(previewItem.packingCost)}</p>
                                </div>
                              )}
                              {previewItem.shippingCost > 0 && (
                                <div className="bg-white/60 rounded p-2">
                                  <p className="text-[9px] text-amber-500">Ongkos Kirim</p>
                                  <p className="text-sm font-bold text-amber-700">{formatRp(previewItem.shippingCost)}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Section 7: Profit */}
                      {previewItem.profitPercent > 0 && previewItem.profitAmount > 0 && (
                        <div className="mb-3">
                          <div className="bg-orange-50 border border-orange-100 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] text-orange-600 font-medium">Profit ({previewItem.profitPercent}%)</p>
                              <p className="text-sm font-bold text-orange-700">{formatRp(previewItem.profitAmount)}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Section 8: Rincian Total */}
                      <div className="mt-4">
                        <p className="text-xs font-bold text-slate-500 mb-2">Rincian</p>
                        <div className="space-y-0.5">
                          <div className="flex justify-between items-center px-1 py-1">
                            <span className="text-[10px] text-slate-400">Harga Kertas</span>
                            <span className="text-[10px] font-semibold text-slate-400">{formatRp(previewItem.totalPaperPrice)}</span>
                          </div>
                          {previewItem.ongkosCetak > 0 && (
                            <div className="flex justify-between items-center px-1 py-1">
                              <span className="text-[10px] text-slate-400">{t('ongkos_cetak_label')}</span>
                              <span className="text-[10px] font-semibold text-slate-400">{formatRp(previewItem.ongkosCetak)}</span>
                            </div>
                          )}
                          {previewItem.finishingCost > 0 && (
                            <div className="flex justify-between items-center px-1 py-1">
                              <span className="text-[10px] text-slate-400">{t('finishing_label')}</span>
                              <span className="text-[10px] font-semibold text-slate-400">{formatRp(previewItem.finishingCost)}</span>
                            </div>
                          )}
                          {previewItem.packingCost > 0 && (
                            <div className="flex justify-between items-center px-1 py-1">
                              <span className="text-[10px] text-slate-400">Ongkos Packing</span>
                              <span className="text-[10px] font-semibold text-slate-400">{formatRp(previewItem.packingCost)}</span>
                            </div>
                          )}
                          {previewItem.shippingCost > 0 && (
                            <div className="flex justify-between items-center px-1 py-1">
                              <span className="text-[10px] text-slate-400">Ongkos Kirim</span>
                              <span className="text-[10px] font-semibold text-slate-400">{formatRp(previewItem.shippingCost)}</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center px-1 py-1">
                            <span className="text-[10px] text-slate-500 font-medium">Sub Total</span>
                            <span className="text-[10px] font-bold text-slate-500">{formatRp(previewItem.subTotal)}</span>
                          </div>
                      </div>
                      </div>

                      {/* Grand Total */}
                      <div className="bg-slate-900 text-white rounded-lg p-4 mt-3 flex items-center justify-between">
                        <div>
                          <p className="text-xs text-slate-400">Total Harga</p>
                          <p className="text-2xl font-extrabold text-emerald-400">{formatRp(previewItem.grandTotal)}</p>
                        </div>
                        <div className="text-right text-xs text-slate-400 space-y-0.5">
                          <p>Sub Total: {formatRp(previewItem.subTotal)}</p>
                          <p>Profit: {formatRp(previewItem.profitAmount)}</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="sticky bottom-0 bg-white border-t border-slate-200 p-4 flex gap-3">
                  <button onClick={handlePrint}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors">
                    <Printer className="w-4 h-4" /> Cetak
                  </button>
                  <button onClick={() => handleRestore(previewItem)}
                    className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition-colors">
                    <RotateCcw className="w-4 h-4" /> Restore
                  </button>
                  <button onClick={handlePdf} disabled={isGeneratingPdf}
                    className="flex-1 flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-400 text-white font-semibold py-3 rounded-xl transition-colors">
                    {isGeneratingPdf ? <><Loader2 className="w-4 h-4 animate-spin" />PDF...</> : <><FileImage className="w-4 h-4" /> PDF</>}
                  </button>
                </div>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
