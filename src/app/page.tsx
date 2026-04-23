'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Calculator, Save, Eye, RotateCcw, Printer, FileImage, Loader2, ArrowRight } from 'lucide-react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { useLanguage } from '@/contexts/language-context'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import type { Customer, Paper, CuttingResult } from '@/lib/cutting-engine'
import dynamic from 'next/dynamic'
import { getAuthUser } from '@/lib/auth'

const CuttingDiagram = dynamic(
  () => import('@/components/cutting-results').then(m => ({ default: m.CuttingDiagram })),
  { ssr: false, loading: () => <div className="h-full flex items-center justify-center text-xs text-slate-400">Memuat diagram...</div> }
)

// Form state keys for localStorage persistence
const STORAGE_KEY = 'potong-kertas-form'

interface FormData {
  paperWidth: string
  paperHeight: string
  cutWidth: string
  cutHeight: string
  selectedCustomerId: string
  selectedPaperId: string
  grammage: string
  pricePerSheet: string
  quantity: string
  printName: string
  isCustomPaper: boolean
  optimizationMode: string
}

function getInitialFormState(): FormData {
  if (typeof window === 'undefined') {
    return {
      paperWidth: '', paperHeight: '', cutWidth: '', cutHeight: '',
      selectedCustomerId: '', selectedPaperId: '', grammage: '', pricePerSheet: '',
      quantity: '', printName: '', isCustomPaper: false, optimizationMode: 'maximal',
    }
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch {}
  return {
    paperWidth: '', paperHeight: '', cutWidth: '', cutHeight: '',
    selectedCustomerId: '', selectedPaperId: '', grammage: '', pricePerSheet: '',
    quantity: '', isCustomPaper: false, optimizationMode: 'maximal',
  }
}

// Compact styles (mobile larger, desktop compact)
const inp = "w-full border border-slate-300 rounded-lg px-3 py-2.5 text-base lg:px-2 lg:py-1 lg:text-sm text-slate-800 focus:outline-none focus:ring-1.5 focus:ring-blue-500 focus:border-transparent bg-white"
const inpDisabled = "w-full border border-slate-200 rounded-lg px-3 py-2.5 text-base lg:px-2 lg:py-1 lg:text-xs text-slate-500 bg-slate-100 cursor-not-allowed"
const lbl = "text-base lg:text-xs font-medium text-slate-600 mb-0.5 block"

function CalculatorPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const initialForm = useRef<FormData>(getInitialFormState())
  const [paperWidth, setPaperWidth] = useState(initialForm.current.paperWidth)
  const [paperHeight, setPaperHeight] = useState(initialForm.current.paperHeight)
  const [cutWidth, setCutWidth] = useState(initialForm.current.cutWidth)
  const [cutHeight, setCutHeight] = useState(initialForm.current.cutHeight)
  const [selectedCustomerId, setSelectedCustomerId] = useState(initialForm.current.selectedCustomerId)
  const [selectedPaperId, setSelectedPaperId] = useState(initialForm.current.selectedPaperId)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [papers, setPapers] = useState<Paper[]>([])
  const [grammage, setGrammage] = useState(initialForm.current.grammage)
  const [pricePerSheet, setPricePerSheet] = useState(initialForm.current.pricePerSheet)
  const [quantity, setQuantity] = useState(initialForm.current.quantity)
  const [printName, setPrintName] = useState(initialForm.current.printName)
  const [isCustomPaper, setIsCustomPaper] = useState(initialForm.current.isCustomPaper)
  const [results, setResults] = useState<CuttingResult | null>(null)
  const [optimizationMode, setOptimizationMode] = useState<'fast' | 'maximal'>(initialForm.current.optimizationMode as 'fast' | 'maximal')
  const [isCalculating, setIsCalculating] = useState(false)

  // Preview state
  const [previewOpen, setPreviewOpen] = useState(false)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)

  // Auto-persist form data to localStorage
  const formData: FormData = {
    paperWidth, paperHeight, cutWidth, cutHeight,
    selectedCustomerId, selectedPaperId, grammage, pricePerSheet,
    quantity, isCustomPaper, optimizationMode,
  }

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(formData))
  }, [formData])

  useEffect(() => {
    fetch('/api/customers')
      .then(res => { if (!res.ok) return []; return res.json() })
      .then(data => { if (Array.isArray(data)) setCustomers(data); else setCustomers([]) })
      .catch(() => setCustomers([]))

    fetch('/api/papers')
      .then(res => { if (!res.ok) return []; return res.json() })
      .then(data => { if (Array.isArray(data)) setPapers(data); else setPapers([]) })
      .catch(() => setPapers([]))
  }, [])

  const selectedPaper = papers.find(p => p.id === selectedPaperId)
  const selectedCustomer = customers.find(c => c.id === selectedCustomerId)

  useEffect(() => {
    if (selectedPaper) {
      requestAnimationFrame(() => {
        setGrammage(selectedPaper.grammage.toString())
        setPricePerSheet(Math.round(selectedPaper.pricePerRim / 500).toString())
        setPaperWidth(selectedPaper.width.toString())
        setPaperHeight(selectedPaper.height.toString())
        setIsCustomPaper(false)
      })
    }
  }, [selectedPaper])

  const handlePaperChange = (value: string) => {
    if (value === 'custom') {
      setSelectedPaperId('custom')
      setIsCustomPaper(true)
      setPaperWidth('')
      setPaperHeight('')
      setGrammage('')
      setPricePerSheet('')
    } else {
      setSelectedPaperId(value)
      setIsCustomPaper(false)
    }
  }

  const handleCalculateCuts = async () => {
    setIsCalculating(true)
    await new Promise(resolve => setTimeout(resolve, 50))

    const pw = parseFloat(paperWidth)
    const ph = parseFloat(paperHeight)
    const cw = parseFloat(cutWidth)
    const ch = parseFloat(cutHeight)
    const qty = parseInt(quantity) || 0
    const price = parseFloat(pricePerSheet) || 0

    if (!pw || !ph || !cw || !ch) {
      toast.error('Mohon lengkapi semua ukuran!')
      setIsCalculating(false)
      return
    }
    if (cw > pw || ch > ph) {
      toast.error('Ukuran potongan lebih besar dari ukuran kertas!')
      setIsCalculating(false)
      return
    }

    const { calculateCuts } = await import('@/lib/cutting-engine')
    const result = calculateCuts({
      paperWidth: pw, paperHeight: ph, cutWidth: cw, cutHeight: ch,
      quantity: qty, pricePerSheet: price, optimizationMode,
      customerName: selectedCustomer?.name || '',
      paperMaterial: selectedPaper?.name || '',
      grammage: selectedPaper?.grammage || 0,
    })

    setResults(result)
    setIsCalculating(false)
    toast.success('Perhitungan selesai!')
  }

  const handleReset = () => {
    if (!confirm('Reset semua data yang sudah diisi?')) return
    setPaperWidth('')
    setPaperHeight('')
    setCutWidth('')
    setCutHeight('')
    setSelectedCustomerId('')
    setSelectedPaperId('')
    setGrammage('')
    setPricePerSheet('')
    setQuantity('')
    setPrintName('')
    setIsCustomPaper(false)
    setResults(null)
    setOptimizationMode('maximal')
    localStorage.removeItem(STORAGE_KEY)
    toast.success('Data berhasil direset')
  }

  const handleSave = async () => {
    if (!results) {
      toast.error('Hitung potongan terlebih dahulu!')
      return
    }
    try {
      await fetch('/api/riwayat-cetakan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          printName: printName || selectedCustomer?.name || '-',
          customerName: selectedCustomer?.name || '',
          paperName: selectedPaper?.name || 'Custom',
          paperGrammage: grammage || '0',
          paperLength: paperWidth,
          paperWidth: paperHeight,
          cutWidth: cutWidth,
          cutHeight: cutHeight,
          quantity: quantity || '0',
          warna: '-',
          warnaKhusus: '-',
          machineName: '-',
          hargaPlat: 0,
          ongkosCetak: 0,
          ongkosCetakDetail: results.strategy,
          totalPaperPrice: results.totalPrice,
          finishingNames: '-',
          finishingBreakdown: '-',
          finishingCost: 0,
          packingCost: 0,
          shippingCost: 0,
          subTotal: results.totalPrice,
          profitPercent: 0,
          profitAmount: 0,
          grandTotal: results.totalPrice,
        })
      })
      toast.success('Data berhasil disimpan ke riwayat!')
    } catch {
      toast.error('Gagal menyimpan data')
    }
  }

  const handlePrint = () => {
    const printContent = previewRef.current
    if (!printContent) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast.error('Popup diblokir. Izinkan popup untuk mencetak.')
      return
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Preview Potong Kertas</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          @page { size: A4; margin: 10mm; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; }
          .header { text-align: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; }
          .header h1 { font-size: 18px; font-weight: 700; color: #0f172a; }
          .header p { font-size: 11px; color: #64748b; margin-top: 2px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
          .info-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px; }
          .info-item .label { font-size: 9px; color: #64748b; font-weight: 500; }
          .info-item .value { font-size: 13px; font-weight: 700; color: #0f172a; }
          .info-item .value.green { color: #059669; }
          .info-item .value.blue { color: #2563eb; }
          .info-item .value.orange { color: #ea580c; }
          .info-item .value.rose { color: #e11d48; }
          .info-item .value.teal { color: #0d9488; }
          .info-item .sub { font-size: 9px; color: #94a3b8; margin-top: 1px; }
          .diagram { text-align: center; margin: 12px 0; page-break-inside: avoid; }
          .diagram svg { max-width: 100%; max-height: 280px; }
          .steps { margin: 10px 0; }
          .steps h3 { font-size: 12px; font-weight: 700; margin-bottom: 6px; color: #334155; }
          .step { display: flex; align-items: flex-start; gap: 6px; padding: 4px 0; }
          .step-num { flex-shrink: 0; width: 18px; height: 18px; background: #2563eb; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; }
          .step-text { font-size: 10px; color: #475569; padding-top: 1px; }
          .blocks { margin: 10px 0; }
          .blocks h3 { font-size: 12px; font-weight: 700; margin-bottom: 6px; color: #334155; }
          .block-card { border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 8px; margin-bottom: 4px; }
          .block-card .name { font-size: 10px; font-weight: 700; color: #334155; }
          .block-card .detail { font-size: 9px; color: #64748b; margin-top: 2px; }
          .strategy { background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 6px; padding: 6px 10px; margin-bottom: 10px; }
          .strategy-label { font-size: 9px; font-weight: 700; color: #3730a3; }
          .strategy-text { font-size: 10px; color: #4338ca; }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.onload = () => {
      printWindow.print()
    }
  }

  const handlePdf = async () => {
    const el = previewRef.current
    if (!el) return

    setIsGeneratingPdf(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      })

      const imgData = canvas.toDataURL('image/jpeg', 0.95)

      const { jsPDF } = await import('jspdf')
      const pdf = new jsPDF('p', 'mm', 'a4')

      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const margin = 8
      const contentWidth = pdfWidth - margin * 2

      const imgWidth = contentWidth
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      const maxHeight = pdfHeight - margin * 2
      let finalWidth = imgWidth
      let finalHeight = imgHeight
      if (finalHeight > maxHeight) {
        finalWidth = (maxHeight * imgWidth) / imgHeight
        finalHeight = maxHeight
      }

      const offsetX = margin + (contentWidth - finalWidth) / 2
      const offsetY = margin

      pdf.addImage(imgData, 'JPEG', offsetX, offsetY, finalWidth, finalHeight)
      pdf.save(`potong-kertas-${Date.now()}.pdf`)

      toast.success('PDF berhasil diunduh!')
    } catch (err) {
      console.error('PDF generation error:', err)
      toast.error('Gagal menghasilkan PDF')
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  return (
    <DashboardLayout
      title={t('potong_kertas')}
      subtitle={t('subtitle_potong_kertas')}
    >
      {/* === SINGLE PAGE LAYOUT: Form left, Results right === */}
      <div className="flex flex-col lg:flex-row lg:h-[calc(100vh-11rem)] gap-3 lg:min-h-0">

        {/* ===== LEFT: FORM ===== */}
        <div className="lg:w-[480px] xl:w-[510px] flex-shrink-0 flex flex-col gap-1.5 lg:overflow-y-auto lg:min-h-0 hide-scrollbar">
          {/* Info Cetak */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 lg:p-2">
            <p className="text-[18px] lg:text-[16px] font-bold text-slate-700 mb-3 lg:mb-1">{t('info_cetak')}</p>
            <div className="space-y-10 lg:space-y-6">
              <div className="grid grid-cols-2 gap-3 lg:gap-1.5">
                <div>
                  <label className={lbl}>{t('nama_customer')}</label>
                  <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                    <SelectTrigger className="w-full h-10 lg:h-7 text-base lg:text-xs"><SelectValue placeholder={t('pilih_customer')} /></SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className={lbl}>{t('nama_cetakan')}</label>
                  <input type="text" placeholder="Nama cetakan" value={printName} onChange={(e) => setPrintName(e.target.value)} className={inp} />
                </div>
              </div>
              <div>
                <label className={lbl}>{t('nama_bahan_kertas')}</label>
                <Select value={selectedPaperId} onValueChange={handlePaperChange}>
                  <SelectTrigger className="w-full h-10 lg:h-7 text-base lg:text-xs"><SelectValue placeholder={t('pilih_kertas')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">
                      <div className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        <span className="text-xs">{t('custom_input_manual')}</span>
                      </div>
                    </SelectItem>
                    {papers.map((p) => (<SelectItem key={p.id} value={p.id}><span className="text-xs">{p.name} ({p.width}×{p.height}, {p.grammage}gsm)</span></SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3 lg:gap-1.5">
                <div>
                  <label className={lbl}>{t('gramatur')}</label>
                  <input type="number" step="1" min="0" placeholder="150" value={grammage} onChange={(e) => setGrammage(e.target.value)} className={inp} />
                </div>
                <div>
                  <label className={lbl}>{t('harga_per_lembar')}</label>
                  <input type="number" step="0.01" min="0" placeholder="0" value={pricePerSheet} onChange={(e) => setPricePerSheet(e.target.value)} className={inp} />
                </div>
              </div>
            </div>
          </div>

          {/* Ukuran */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 lg:p-2">
            <p className="text-sm lg:text-xs font-semibold text-slate-700 mb-3 lg:mb-1">Ukuran</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-1.5">
              <div>
                <label className={lbl}>{t('lebar_kertas')}</label>
                <input type="number" step="0.1" placeholder="W" value={paperWidth} onChange={(e) => setPaperWidth(e.target.value)} disabled={!isCustomPaper}
                  className={!isCustomPaper ? inpDisabled : inp} />
              </div>
              <div>
                <label className={lbl}>{t('tinggi_kertas')}</label>
                <input type="number" step="0.1" placeholder="H" value={paperHeight} onChange={(e) => setPaperHeight(e.target.value)} disabled={!isCustomPaper}
                  className={!isCustomPaper ? inpDisabled : inp} />
              </div>
              <div>
                <label className={lbl}>{t('lebar_potongan')}</label>
                <input type="number" step="0.1" placeholder="W" value={cutWidth} onChange={(e) => setCutWidth(e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>{t('tinggi_potongan')}</label>
                <input type="number" step="0.1" placeholder="H" value={cutHeight} onChange={(e) => setCutHeight(e.target.value)} className={inp} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:gap-1.5 mt-3 lg:mt-1.5">
              <div>
                <label className={lbl}>{t('mode_optimasi')}</label>
                <Select value={optimizationMode} onValueChange={(v: any) => setOptimizationMode(v)}>
                  <SelectTrigger className="w-full h-10 lg:h-7 text-base lg:text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fast"><span className="text-xs">Cepat (Greedy)</span></SelectItem>
                    <SelectItem value="maximal"><span className="text-xs">Maksimal (Brute Force)</span></SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className={lbl}>{t('jumlah_cetakan')}</label>
                <input type="number" step="1" min="0" placeholder="100" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={inp} />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-1.5">
            <button onClick={handleCalculateCuts} disabled={isCalculating}
              className="flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white text-sm lg:text-[10px] font-semibold py-2.5 lg:py-1.5 rounded-lg transition-colors">
              {isCalculating ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              {t('hitung_potongan')}
            </button>
            <button onClick={handleSave} disabled={!results}
              className="flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm lg:text-[10px] font-semibold py-2.5 lg:py-1.5 rounded-lg transition-colors" title={t('simpan')}>
              {t('simpan')}
            </button>
            <button onClick={() => { if (!results) { toast.error('Hitung potongan terlebih dahulu!'); return; } setPreviewOpen(true) }} disabled={!results}
              className="flex items-center justify-center gap-1 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm lg:text-[10px] font-semibold py-2.5 lg:py-1.5 rounded-lg transition-colors" title={t('preview')}>
              {t('preview')}
            </button>
            <button onClick={handleReset}
              className="flex items-center justify-center gap-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm lg:text-[10px] font-semibold py-2.5 lg:py-1.5 rounded-lg transition-colors" title={t('reset')}>
              <RotateCcw className="w-3 h-3" />
              <span className="hidden xl:inline">{t('reset')}</span>
            </button>
          </div>

          {/* Link to Hitung Cetakan */}
          <button
            onClick={(e) => {
              const btn = e.currentTarget
              btn.style.transform = 'scale(0.85)'
              setTimeout(() => { btn.style.transform = 'scale(1.08)' }, 100)
              setTimeout(() => { btn.style.transform = 'scale(0.95)' }, 220)
              setTimeout(() => {
                btn.style.transform = 'scale(1)'
                const params = new URLSearchParams()
                if (selectedCustomer?.name) params.set('customerName', selectedCustomer.name)
                if (printName) params.set('printName', printName)
                if (selectedCustomerId) params.set('customerId', selectedCustomerId)
                if (paperWidth) params.set('paperLength', paperWidth)
                if (paperHeight) params.set('paperWidth', paperHeight)
                if (quantity) params.set('quantity', quantity)
                if (selectedPaperId) params.set('paperId', selectedPaperId)
                if (pricePerSheet) params.set('pricePerSheet', pricePerSheet)
                if (cutWidth) params.set('cutWidth', cutWidth)
                if (cutHeight) params.set('cutHeight', cutHeight)
                if (results?.totalPrice) params.set('totalPaperPrice', results.totalPrice.toString())
                router.push(`/hitung-cetakan?${params.toString()}`)
              }, 350)
            }}
            style={{
              transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease',
              animation: 'shimmer-btn 2.5s linear infinite, pulse-glow 2s ease-in-out infinite',
              background: 'linear-gradient(135deg, #f59e0b, #fbbf24, #f59e0b)',
              backgroundSize: '200% auto',
              backgroundPosition: '0% center',
            }}
            onMouseEnter={(e) => {
              const btn = e.currentTarget
              btn.style.transform = 'translateX(6px) scale(1.05)'
              btn.style.backgroundPosition = '100% center'
              btn.style.boxShadow = '0 8px 30px rgba(245,158,11,0.5)'
            }}
            onMouseLeave={(e) => {
              const btn = e.currentTarget
              btn.style.transform = 'translateX(0) scale(1)'
              btn.style.backgroundPosition = '0% center'
              btn.style.boxShadow = '0 2px 10px rgba(245,158,11,0.3)'
            }}
            className="flex items-center justify-center gap-1.5 text-white text-sm lg:text-[10px] font-bold py-2.5 lg:py-1.5 rounded-lg border border-amber-400 cursor-pointer">
            <Calculator className="w-3.5 h-3.5" />
            Hitung Cetakan Lengkap
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* ===== RIGHT: RESULTS ===== */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 p-3 lg:p-2 flex flex-col lg:min-h-0">
          {results ? (
            <div className="flex-1 flex flex-col gap-1.5 lg:min-h-0 lg:overflow-hidden">
              {/* Stats Grid - mobile 2col, desktop 3col/5col */}
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2 lg:gap-2 flex-shrink-0">
                <div className="bg-blue-50 rounded-lg p-3 lg:p-2.5 text-center">
                  <p className="text-xs lg:text-xs text-blue-600 font-medium leading-tight">Diperlukan</p>
                  <p className="text-2xl lg:text-2xl font-bold text-blue-700 leading-tight">{results.quantity}</p>
                  <p className="text-xs lg:text-xs text-blue-500">lembar</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 lg:p-2.5 text-center">
                  <p className="text-xs lg:text-xs text-purple-600 font-medium leading-tight">Potongan/Lembar</p>
                  <p className="text-2xl lg:text-2xl font-bold text-purple-700 leading-tight">{results.totalPieces}</p>
                  <p className="text-xs lg:text-xs text-purple-500">lembar</p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3 lg:p-2.5 text-center">
                  <p className="text-xs lg:text-xs text-emerald-600 font-medium leading-tight">Kertas Dibutuhkan</p>
                  <p className="text-2xl lg:text-2xl font-bold text-emerald-700 leading-tight">{results.sheetsNeeded}</p>
                  <p className="text-xs lg:text-xs text-emerald-500">lembar</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-3 lg:p-2.5 text-center col-span-2 xl:col-span-3">
                  <p className="text-xs lg:text-xs text-orange-600 font-medium leading-tight">Total Harga</p>
                  <p className="text-xl lg:text-xl font-bold text-orange-700 leading-tight">Rp {results.totalPrice.toLocaleString('id-ID')}</p>
                </div>
                <div className="bg-teal-50 rounded-lg p-3 lg:p-2.5 text-center">
                  <p className="text-xs lg:text-xs text-teal-600 font-medium leading-tight">Efisiensi</p>
                  <p className="text-2xl lg:text-2xl font-bold text-teal-700 leading-tight">{results.efficiency.toFixed(1)}%</p>
                  <p className="text-xs lg:text-xs text-teal-500">bahan</p>
                </div>
              </div>

              {/* Strategy */}
              <div className="bg-indigo-50 border border-indigo-200 rounded px-2 py-0 flex-shrink-0">
                <span className="text-[10px] font-bold text-indigo-800">Strategi: </span>
                <span className="text-[10px] text-indigo-700 font-medium">{results.strategy}</span>
              </div>

              {/* Diagram + Steps side by side */}
              <div className="flex-1 flex flex-col lg:flex-row gap-3 lg:gap-1.5 lg:min-h-0 lg:overflow-auto">
                {/* Diagram */}
                <div className="flex-1 flex items-center justify-center min-w-0 min-h-0 p-1">
                  <CuttingDiagram results={results} />
                </div>

                {/* Steps + Block Details */}
                <div className="lg:w-44 xl:w-48 flex-shrink-0 flex flex-col gap-1 lg:min-h-0 lg:overflow-y-auto hide-scrollbar">
                  {/* Steps */}
                  <div>
                    <p className="text-[11px] font-bold text-slate-700 mb-1">Cara Potong:</p>
                    <div className="space-y-1">
                      {results.steps.map((step, idx) => (
                        <div key={idx} className="flex items-start gap-1.5">
                          <div className="flex-shrink-0 w-4 h-4 bg-blue-600 text-white rounded-full flex items-center justify-center text-[8px] font-bold mt-0.5">{idx + 1}</div>
                          <p className="text-[10px] text-slate-600 leading-snug">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Block Details - compact */}
                  <div>
                    <p className="text-[11px] font-bold text-slate-700 mb-1">Detail Blok:</p>
                    <div className="space-y-1">
                      {results.blocks.map((block: any, idx: number) => {
                        const bgColors = ['bg-blue-50', 'bg-emerald-50', 'bg-amber-50', 'bg-red-50', 'bg-violet-50']
                        const borderColors = ['border-blue-200', 'border-emerald-200', 'border-amber-200', 'border-red-200', 'border-violet-200']
                        const badgeBg = ['bg-blue-100', 'bg-emerald-100', 'bg-amber-100', 'bg-red-100', 'bg-violet-100']
                        const badgeText = ['text-blue-700', 'text-emerald-700', 'text-amber-700', 'text-red-700', 'text-violet-700']
                        const nameColors = ['text-blue-800', 'text-emerald-800', 'text-amber-800', 'text-red-800', 'text-violet-800']
                        const detailColors = ['text-blue-600', 'text-emerald-600', 'text-amber-600', 'text-red-600', 'text-violet-600']
                        const ci = idx % 5
                        return (
                          <div key={idx} className={`border ${borderColors[ci]} ${bgColors[ci]} rounded-md p-1.5`}>
                            <div className="flex items-center justify-between mb-0">
                              <span className={`text-[10px] font-bold ${nameColors[ci]}`}>{block.name}</span>
                              <span className={`px-1 py-0 ${badgeBg[ci]} ${badgeText[ci]} rounded-full text-[8px] font-semibold`}>{block.pieces} pcs</span>
                            </div>
                            <div className={`grid grid-cols-2 gap-x-1 gap-y-0 text-[9px] ${detailColors[ci]}`}>
                              <div><span className="opacity-70">Ukuran: </span><span className="font-bold">{block.width.toFixed(1)}×{block.height.toFixed(1)}</span></div>
                              <div><span className="opacity-70">Layout: </span><span className="font-bold">{block.horizontal}×{block.vertical}{block.rotated ? ' (90°)' : ''}</span></div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                <Calculator className="w-8 h-8 text-slate-300" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-slate-400">Belum ada hasil</p>
                <p className="text-xs text-slate-300 mt-0.5">Masukkan ukuran dan klik &quot;Hitung&quot;</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== PREVIEW DIALOG ===== */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>Preview Potong Kertas</DialogTitle>
          </DialogHeader>

          {/* Preview Content (rendered for print & PDF capture) */}
          <div ref={previewRef} className="p-4 bg-white">
            {/* Header */}
            <div className="text-center mb-4 pb-3 border-b-2 border-slate-200">
              <h1 className="text-lg font-bold text-slate-900">Preview Potong Kertas</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedCustomer?.name ? `${selectedCustomer.name}` : '-'} · {selectedPaper?.name || 'Custom'} · {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                <p className="text-[10px] text-blue-600 font-medium">Jumlah Diperlukan</p>
                <p className="text-xl font-bold text-blue-700">{results?.quantity || 0} <span className="text-xs font-normal">lembar</span></p>
              </div>
              <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
                <p className="text-[10px] text-purple-600 font-medium">Potongan / Lembar</p>
                <p className="text-xl font-bold text-purple-700">{results?.totalPieces || 0} <span className="text-xs font-normal">lembar</span></p>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                <p className="text-[10px] text-emerald-600 font-medium">Lembar Kertas</p>
                <p className="text-xl font-bold text-emerald-700">{results?.sheetsNeeded || 0} <span className="text-xs font-normal">lembar</span></p>
              </div>
              <div className="bg-orange-50 border border-orange-100 rounded-lg p-3">
                <p className="text-[10px] text-orange-600 font-medium">Total Harga Kertas</p>
                <p className="text-lg font-bold text-orange-700">Rp {results?.totalPrice.toLocaleString('id-ID')}</p>
              </div>
              <div className="bg-rose-50 border border-rose-100 rounded-lg p-3">
                <p className="text-[10px] text-rose-600 font-medium">Sisa Potongan</p>
                <p className="text-xl font-bold text-rose-700">{results?.totalWasteArea.toFixed(2)} <span className="text-xs font-normal">cm²</span></p>
              </div>
              <div className="bg-teal-50 border border-teal-100 rounded-lg p-3">
                <p className="text-[10px] text-teal-600 font-medium">Efisiensi Bahan</p>
                <p className="text-xl font-bold text-teal-700">{results?.efficiency.toFixed(2)}%</p>
              </div>
            </div>

            {/* Strategy */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 max-w-[85%] mx-auto">
              <p className="text-[10px] text-indigo-600 font-medium">Strategi Optimasi</p>
              <p className="text-xl font-bold text-indigo-700">{results?.strategy}</p>
            </div>

            {/* Diagram */}
            {results && (
              <div className="text-center mb-4">
                <CuttingDiagram results={results} maxHeight="260px" />
              </div>
            )}

            {/* Steps */}
            {results && (
              <div className="mb-4">
                <h3 className="text-xs font-bold text-slate-700 mb-2">Cara Potong:</h3>
                <div className="space-y-1.5">
                  {results.steps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <div className="flex-shrink-0 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[9px] font-bold">{idx + 1}</div>
                      <p className="text-[11px] text-slate-600 pt-0.5">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Block Details */}
            {results && (
              <div className="mb-2">
                <h3 className="text-xs font-bold text-slate-700 mb-2">Detail per Blok:</h3>
                <div className="space-y-2">
                  {results.blocks.map((block: any, idx: number) => (
                    <div key={idx} className="border border-slate-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-800">{block.name}</span>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-semibold">{block.pieces} lembar</span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                        <div><span className="text-slate-500">Ukuran:</span> <span className="font-medium">{block.width.toFixed(1)} × {block.height.toFixed(1)} cm</span></div>
                        <div><span className="text-slate-500">Layout:</span> <span className="font-medium">{block.horizontal} × {block.vertical}{block.rotated ? ' (90°)' : ''}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action buttons at bottom of dialog */}
          <div className="sticky bottom-0 bg-white border-t border-slate-200 p-4 flex gap-3">
            <button onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors">
              <Printer className="w-4 h-4" /> {t('cetak')}
            </button>
            <button onClick={handlePdf} disabled={isGeneratingPdf}
              className="flex-1 flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-400 text-white font-semibold py-3 rounded-xl transition-colors">
              {isGeneratingPdf ? <><Loader2 className="w-4 h-4 animate-spin" />Membuat PDF...</> : <><FileImage className="w-4 h-4" /> PDF (JPG)</>}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}

export default function Home() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [user, setUser] = useState<{ username: string; name?: string; role?: string } | null>(null)

  useEffect(() => {
    const authUser = getAuthUser()
    if (!authUser) {
      router.push('/login')
    } else {
      setUser(authUser)
    }
    setReady(true)
  }, [router])

  if (!ready) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) return null

  return <CalculatorPage />
}
