'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { History, Search, Filter, RotateCcw, Eye, Trash2, Printer, FileImage, Loader2, Calculator, Users, Layers, Truck, Banknote } from 'lucide-react'
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

  const handlePrint = () => {
    const el = previewRef.current
    if (!el || !previewItem) return
    const pw = window.open('', '_blank')
    if (!pw) { toast.error('Popup diblokir'); return }
    pw.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Preview - ${previewItem.printName}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @page { size: A4; margin: 10mm; }
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; }
        .header { text-align: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; }
        .header h1 { font-size: 16px; font-weight: 700; color: #0f172a; }
        .header p { font-size: 10px; color: #64748b; margin-top: 2px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 10px; }
        .cell { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 5px; padding: 6px 8px; }
        .cell .lbl { font-size: 8px; color: #64748b; font-weight: 500; }
        .cell .val { font-size: 12px; font-weight: 700; color: #0f172a; }
        .cell .val.grn { color: #059669; }
        .cell .val.red { color: #e11d48; }
        .row { display: flex; gap: 6px; margin-bottom: 6px; }
        .row .full { flex: 1; }
        .total-bar { background: #0f172a; color: white; border-radius: 6px; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; }
        .total-bar .lbl { font-size: 9px; color: #94a3b8; }
        .total-bar .val { font-size: 16px; font-weight: 800; color: #22c55e; }
        .diagram { text-align: center; margin: 10px 0; page-break-inside: avoid; }
        .diagram svg { max-width: 100%; max-height: 260px; }
      </style>
    </head><body>${el.innerHTML}</body></html>`)
    pw.document.close()
    pw.onload = () => pw.print()
  }

  const handlePdf = async () => {
    const el = previewRef.current
    if (!el) return
    setIsGeneratingPdf(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
      const imgData = canvas.toDataURL('image/jpeg', 0.95)
      const { jsPDF } = await import('jspdf')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfW = pdf.internal.pageSize.getWidth()
      const pdfH = pdf.internal.pageSize.getHeight()
      const margin = 8
      const cw = pdfW - margin * 2
      const ih = (canvas.height * cw) / canvas.width
      const maxH = pdfH - margin * 2
      let fw = cw, fh = ih
      if (fh > maxH) { fw = (maxH * cw) / ih; fh = maxH }
      pdf.addImage(imgData, 'JPEG', margin + (cw - fw) / 2, margin, fw, fh)
      pdf.save(`riwayat-${Date.now()}.pdf`)
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
                      <div className="mb-2">
                        <div className="flex items-center gap-1.5 mb-2">
                          <div className="w-5 h-5 rounded bg-emerald-100 flex items-center justify-center">
                            <Banknote className="w-3 h-3 text-emerald-600" />
                          </div>
                          <p className="text-xs font-bold text-slate-700">Rincian Total</p>
                        </div>
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
                          {previewItem.profitAmount > 0 && (
                            <div className="flex justify-between items-center px-1 py-1">
                              <span className="text-[10px] text-slate-400 font-medium">Profit ({previewItem.profitPercent}%)</span>
                              <span className="text-[10px] font-semibold text-slate-400">+ {formatRp(previewItem.profitAmount)}</span>
                            </div>
                          )}
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
