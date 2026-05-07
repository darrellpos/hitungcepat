'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Calculator, Save, Eye, RotateCcw, Printer, FileImage, Loader2, ArrowRight, Share2, History, RefreshCw, Trash2 } from 'lucide-react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { useLanguage } from '@/contexts/language-context'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import type { Customer, Paper, CuttingResult } from '@/lib/cutting-engine'
import dynamic from 'next/dynamic'
import { getAuthUser } from '@/lib/auth'
import { getAuthHeaders } from '@/lib/auth'
import { authFetch } from '@/lib/auth-fetch'
import { fetcher } from '@/lib/fetcher'

const CuttingDiagram = dynamic(
  () => import('@/components/cutting-results').then(m => ({ default: m.CuttingDiagram })),
  { ssr: false, loading: () => <div className="h-full flex items-center justify-center text-xs text-slate-400">Memuat diagram...</div> }
)

// Form state keys for localStorage persistence (per-user scoped)
function userKey(base: string): string {
  try {
    const a = JSON.parse(localStorage.getItem('auth') || '{}')
    if (a.id) return `${base}_${a.id}`
  } catch {}
  return base
}
const STORAGE_KEY = () => userKey('potong-kertas-form')
const STORAGE_RESULTS_KEY = () => userKey('potong-kertas-results')
const STORAGE_VERSION_KEY = () => userKey('potong-kertas-form-version')
const STORAGE_VERSION = 'v4'

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
  setelanKertas: string
  printName: string
  isCustomPaper: boolean
  optimizationMode: string
}

function getInitialFormState(): FormData {
  if (typeof window === 'undefined') {
    return {
      paperWidth: '', paperHeight: '', cutWidth: '', cutHeight: '',
      selectedCustomerId: '', selectedPaperId: '', grammage: '', pricePerSheet: '',
      quantity: '', setelanKertas: '', printName: '', isCustomPaper: false, optimizationMode: 'maximal',
    }
  }
  try {
    const savedVersion = localStorage.getItem(STORAGE_VERSION_KEY())
    if (savedVersion && savedVersion !== STORAGE_VERSION) {
      localStorage.removeItem(STORAGE_KEY())
      localStorage.removeItem(STORAGE_RESULTS_KEY())
      localStorage.setItem(STORAGE_VERSION_KEY(), STORAGE_VERSION)
    }
    const saved = localStorage.getItem(STORAGE_KEY())
    if (saved) return JSON.parse(saved)
  } catch {}
  return {
    paperWidth: '', paperHeight: '', cutWidth: '', cutHeight: '',
    selectedCustomerId: '', selectedPaperId: '', grammage: '', pricePerSheet: '',
    quantity: '', setelanKertas: '', printName: '', isCustomPaper: false, optimizationMode: 'maximal',
  }
}

// Compact styles (mobile larger, desktop compact)
const inp = "w-full border border-slate-300 rounded-lg px-3 py-2.5 text-base lg:px-2 lg:py-1 lg:text-sm text-slate-800 focus:outline-none focus:ring-1.5 focus:ring-blue-500 focus:border-transparent bg-white"
const inpDisabled = "w-full border border-slate-200 rounded-lg px-3 py-2.5 text-base lg:px-2 lg:py-1 lg:text-xs text-slate-500 bg-slate-100 cursor-not-allowed"
const lbl = "text-base lg:text-xs font-medium text-slate-600 mb-0.5 block"

function CalculatorPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
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
  const [setelanKertas, setSetelanKertas] = useState(initialForm.current.setelanKertas)
  const [printName, setPrintName] = useState(initialForm.current.printName)
  const [isCustomPaper, setIsCustomPaper] = useState(initialForm.current.isCustomPaper)
  const [results, setResults] = useState<CuttingResult | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      const savedResults = localStorage.getItem(STORAGE_RESULTS_KEY())
      if (savedResults) return JSON.parse(savedResults)
    } catch {}
    return null
  })
  const [optimizationMode, setOptimizationMode] = useState<'fast' | 'maximal'>(initialForm.current.optimizationMode as 'fast' | 'maximal')
  const [isCalculating, setIsCalculating] = useState(false)

  // Riwayat states
  const [savingRiwayat, setSavingRiwayat] = useState(false)
  const [restoredRiwayatId, setRestoredRiwayatId] = useState<string | null>(null)
  const [riwayatList, setRiwayatList] = useState<any[]>([])

  // Preview state
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewRiwayatData, setPreviewRiwayatData] = useState<CuttingResult | null>(null)
  const [previewRiwayatInfo, setPreviewRiwayatInfo] = useState<{ customer: string; paper: string }>({ customer: '-', paper: '-' })
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)

  // Auto-persist form data to localStorage
  const formData: FormData = {
    paperWidth, paperHeight, cutWidth, cutHeight,
    selectedCustomerId, selectedPaperId, grammage, pricePerSheet,
    quantity, setelanKertas, printName, isCustomPaper, optimizationMode,
  }

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY(), JSON.stringify(formData))
  }, [formData])

  useEffect(() => {
    authFetch('/api/customers')
      .then(res => { if (!res.ok) return []; return res.json() })
      .then(data => { if (Array.isArray(data)) setCustomers(data); else setCustomers([]) })
      .catch(() => setCustomers([]))

    authFetch('/api/papers')
      .then(res => { if (!res.ok) return []; return res.json() })
      .then(data => { if (Array.isArray(data)) setPapers(data); else setPapers([]) })
      .catch(() => setPapers([]))

    fetchRiwayat()
  }, [])

  // Restore dari riwayat URL params
  useEffect(() => {
    const restored = searchParams.get('restoredFromRiwayat')
    if (!restored) return

    const printNameParam = searchParams.get('printName')
    const customerNameParam = searchParams.get('customerName')
    const paperNameParam = searchParams.get('paperName')
    const paperLengthParam = searchParams.get('paperLength')
    const paperWidthParam = searchParams.get('paperWidth')
    const cutWidthParam = searchParams.get('cutWidth')
    const cutHeightParam = searchParams.get('cutHeight')
    const quantityParam = searchParams.get('quantity')

    if (printNameParam) setPrintName(printNameParam)
    if (paperLengthParam) setPaperWidth(paperLengthParam)
    if (paperWidthParam) setPaperHeight(paperWidthParam)
    if (cutWidthParam) setCutWidth(cutWidthParam)
    if (cutHeightParam) setCutHeight(cutHeightParam)
    if (quantityParam) setQuantity(quantityParam)

    // Set custom paper mode since we're restoring specific dimensions
    if (paperLengthParam || paperWidthParam) {
      setSelectedPaperId('custom')
      setIsCustomPaper(true)
    }

    // Matching customer by name
    if (customerNameParam) {
      const match = customers.find(c => c.name === customerNameParam)
      if (match) setSelectedCustomerId(match.id)
    }

    toast.success('Data berhasil di-restore dari riwayat!')
    // Bersihkan URL params
    window.history.replaceState({}, '', '/potong-kertas')
  }, [searchParams, customers])

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
    const setelan = parseInt(setelanKertas) || 0
    const price = parseFloat(pricePerSheet) || 0
    const totalQty = qty + setelan

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
      quantity: totalQty, pricePerSheet: price, optimizationMode,
      customerName: selectedCustomer?.name || '',
      paperMaterial: selectedPaper?.name || '',
      grammage: selectedPaper?.grammage || 0,
    })

    setResults(result)
    localStorage.setItem(STORAGE_RESULTS_KEY(), JSON.stringify(result))
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
    setSetelanKertas('')
    setPrintName('')
    setIsCustomPaper(false)
    setResults(null)
    setOptimizationMode('maximal')
    localStorage.removeItem(STORAGE_KEY())
    localStorage.removeItem(STORAGE_RESULTS_KEY())
    toast.success('Data berhasil direset')
  }

  // === Riwayat functions ===
  const fetchRiwayat = async () => {
    try {
      const res = await fetcher('/api/riwayat-potong-kertas', { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setRiwayatList(Array.isArray(data) ? data : [])
      }
    } catch {}
  }

  const buildPayload = () => ({
    namaCustomer: selectedCustomer?.name || '-',
    resultData: results ? JSON.stringify(results) : '',
    namaCetakan: printName || '-',
    paperName: selectedPaper?.name || 'Custom',
    paperId: selectedPaper?.id || '',
    grammage: grammage || '0',
    paperWidth: paperWidth || '0',
    paperHeight: paperHeight || '0',
    cutWidth: cutWidth || '0',
    cutHeight: cutHeight || '0',
    quantity: quantity || '0',
    setelanKertas: setelanKertas || '0',
    sheetsNeeded: results?.sheetsNeeded?.toString() || '0',
    totalPrice: results?.totalPrice || 0,
    pricePerSheet: parseFloat(pricePerSheet) || 0,
    efficiency: results?.efficiency || 0,
    strategy: results?.strategy || '',
  })

  const resetFormForRiwayat = () => {
    setRestoredRiwayatId(null)
    setPaperWidth('')
    setPaperHeight('')
    setCutWidth('')
    setCutHeight('')
    setSelectedCustomerId('')
    setSelectedPaperId('')
    setGrammage('')
    setPricePerSheet('')
    setQuantity('')
    setSetelanKertas('')
    setPrintName('')
    setIsCustomPaper(false)
    setResults(null)
    setOptimizationMode('maximal')
    localStorage.removeItem(STORAGE_KEY())
    localStorage.removeItem(STORAGE_RESULTS_KEY())
  }

  const handleSaveRiwayat = async () => {
    if (!results) {
      toast.error('Hitung potongan terlebih dahulu!')
      return
    }
    setSavingRiwayat(true)
    try {
      const res = await fetcher('/api/riwayat-potong-kertas', {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload())
      })
      if (res.ok) {
        toast.success('Riwayat berhasil disimpan!')
        fetchRiwayat()
        resetFormForRiwayat()
      } else {
        toast.error('Gagal menyimpan riwayat')
      }
    } catch {
      toast.error('Gagal menyimpan riwayat')
    }
    setSavingRiwayat(false)
  }

  const handleUpdateRiwayat = async () => {
    if (!restoredRiwayatId) {
      toast.error('Tidak ada data yang di-restore')
      return
    }
    if (!results) {
      toast.error('Hitung potongan terlebih dahulu!')
      return
    }
    setSavingRiwayat(true)
    try {
      const res = await fetcher(`/api/riwayat-potong-kertas/${restoredRiwayatId}`, {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload())
      })
      if (res.ok) {
        toast.success('Riwayat berhasil diupdate!')
        fetchRiwayat()
        resetFormForRiwayat()
      } else {
        toast.error('Gagal mengupdate riwayat')
      }
    } catch {
      toast.error('Gagal mengupdate riwayat')
    }
    setSavingRiwayat(false)
  }

  const handlePreviewRiwayat = async (r: any) => {
    let resultData: CuttingResult | null = null

    // Try resultData from riwayat first
    if (r.resultData) {
      try {
        resultData = JSON.parse(r.resultData)
      } catch {}
    }

    // If no resultData, calculate from riwayat values
    if (!resultData) {
      const pw = parseFloat(r.paperWidth)
      const ph = parseFloat(r.paperHeight)
      const cw = parseFloat(r.cutWidth)
      const ch = parseFloat(r.cutHeight)
      const qty = parseInt(r.quantity) || 0
      const setelan = parseInt(r.setelanKertas) || 0
      const price = parseFloat(r.pricePerSheet) || 0

      if (pw && ph && cw && ch) {
        try {
          const { calculateCuts } = await import('@/lib/cutting-engine')
          resultData = calculateCuts({
            paperWidth: pw, paperHeight: ph, cutWidth: cw, cutHeight: ch,
            quantity: qty + setelan, pricePerSheet: price, optimizationMode,
            customerName: r.namaCustomer || '',
            paperMaterial: r.paperName || '',
            grammage: parseFloat(r.grammage) || 0,
          })
        } catch {}
      }
    }

    if (resultData) {
      setPreviewRiwayatData(resultData)
      setPreviewRiwayatInfo({
        customer: (r.namaCustomer && r.namaCustomer !== '-') ? r.namaCustomer : '-',
        paper: r.paperName || 'Custom',
      })
      setPreviewOpen(true)
    } else {
      toast.error('Data tidak cukup untuk preview')
    }
  }

  const handleRestore = async (r: any) => {
    setRestoredRiwayatId(r.id)
    setPrintName(r.namaCetakan || '')
    setGrammage(r.grammage || '')
    setPaperWidth(r.paperWidth || '')
    setPaperHeight(r.paperHeight || '')
    setCutWidth(r.cutWidth || '')
    setCutHeight(r.cutHeight || '')
    setQuantity(r.quantity || '')
    setSetelanKertas(r.setelanKertas || '')
    setPricePerSheet(r.pricePerSheet?.toString() || '')

    // Set paper selection
    let restoredPaper = null
    if (r.paperId && papers.find(p => p.id === r.paperId)) {
      setSelectedPaperId(r.paperId)
      setIsCustomPaper(false)
      restoredPaper = papers.find(p => p.id === r.paperId)
    } else {
      setSelectedPaperId('custom')
      setIsCustomPaper(true)
    }

    // Match customer by name
    let restoredCustomer = null
    if (r.namaCustomer && r.namaCustomer !== '-') {
      const match = customers.find(c => c.name === r.namaCustomer)
      if (match) {
        setSelectedCustomerId(match.id)
        restoredCustomer = match
      } else {
        setSelectedCustomerId('')
      }
    } else {
      setSelectedCustomerId('')
    }

    // Auto-calculate cuts with restored values
    const pw = parseFloat(r.paperWidth)
    const ph = parseFloat(r.paperHeight)
    const cw = parseFloat(r.cutWidth)
    const ch = parseFloat(r.cutHeight)
    const qty = parseInt(r.quantity) || 0
    const setelan = parseInt(r.setelanKertas) || 0
    const price = parseFloat(r.pricePerSheet) || 0
    const totalQty = qty + setelan

    if (pw && ph && cw && ch && cw <= pw && ch <= ph) {
      try {
        const { calculateCuts } = await import('@/lib/cutting-engine')
        const result = calculateCuts({
          paperWidth: pw, paperHeight: ph, cutWidth: cw, cutHeight: ch,
          quantity: totalQty, pricePerSheet: price, optimizationMode,
          customerName: restoredCustomer?.name || '',
          paperMaterial: restoredPaper?.name || '',
          grammage: parseFloat(r.grammage) || 0,
        })
        setResults(result)
        localStorage.setItem(STORAGE_RESULTS_KEY(), JSON.stringify(result))
      } catch {
        setResults(null)
      }
    } else if (r.resultData) {
      // Fallback: if can't calculate, use saved resultData
      try {
        const parsedResults = JSON.parse(r.resultData)
        setResults(parsedResults)
        localStorage.setItem(STORAGE_RESULTS_KEY(), JSON.stringify(parsedResults))
      } catch {
        setResults(null)
      }
    } else {
      setResults(null)
    }

    toast.success('Data berhasil di-restore dari riwayat!')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDeleteRiwayat = async (id: string) => {
    try {
      const res = await fetcher(`/api/riwayat-potong-kertas/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })
      if (res.ok) {
        toast.success('Riwayat berhasil dihapus')
        if (restoredRiwayatId === id) setRestoredRiwayatId(null)
        fetchRiwayat()
      } else {
        toast.error('Gagal menghapus riwayat')
      }
    } catch {
      toast.error('Gagal menghapus riwayat')
    }
  }

  // Build SVG diagram HTML for print/PDF/WhatsApp
  const buildDiagramHtml = useCallback(() => {
    if (!results) return ''
    const r = results
    const scale = 5.94
    const pw = r.paperWidth
    const ph = r.paperHeight
    const svgW = pw * scale
    const svgH = ph * scale

    const gradients = [
      { id: 'pg1', c1: '#dbeafe', c2: '#bfdbfe' },
      { id: 'pg2', c1: '#d1fae5', c2: '#a7f3d0' },
      { id: 'pg3', c1: '#fef3c7', c2: '#fde68a' },
      { id: 'pg4', c1: '#fecaca', c2: '#fca5a5' },
      { id: 'pg5', c1: '#e9d5ff', c2: '#d8b4fe' },
    ]
    const strokeColors = ['#93c5fd', '#6ee7b7', '#fcd34d', '#fca5a5', '#c4b5fd']

    let defsInner = gradients.map(g =>
      `<linearGradient id="${g.id}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${g.c1}"/><stop offset="100%" stop-color="${g.c2}"/></linearGradient>`
    ).join('')

    let wasteRects = ''
    r.blocks.forEach((block: any, bi: number) => {
      if (block.wasteWidth > 0.01) {
        wasteRects += `<rect x="${(block.x + block.usedWidth) * scale}" y="${block.y * scale}" width="${block.wasteWidth * scale}" height="${block.usedHeight * scale}" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="3,2" opacity="0.5" rx="1"/>`
        if (block.wasteHeight > 0.01) {
          wasteRects += `<rect x="${(block.x + block.usedWidth) * scale}" y="${(block.y + block.usedHeight) * scale}" width="${block.wasteWidth * scale}" height="${block.wasteHeight * scale}" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="3,2" opacity="0.5" rx="1"/>`
        }
      }
      if (block.wasteHeight > 0.01) {
        wasteRects += `<rect x="${block.x * scale}" y="${(block.y + block.usedHeight) * scale}" width="${block.usedWidth * scale}" height="${block.wasteHeight * scale}" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="3,2" opacity="0.5" rx="1"/>`
      }
    })

    let cutLines = ''
    if (r.blocks.length > 1 && r.cutPosition !== undefined) {
      cutLines += `<line x1="${r.cutPosition * scale}" y1="0" x2="${r.cutPosition * scale}" y2="${svgH}" stroke="#f87171" stroke-width="2.5" stroke-dasharray="8,4" opacity="0.8"/>`
    }
    if (r.blocks.length > 1 && r.cutPositionY !== undefined) {
      cutLines += `<line x1="0" y1="${r.cutPositionY * scale}" x2="${svgW}" y2="${r.cutPositionY * scale}" stroke="#f87171" stroke-width="2.5" stroke-dasharray="8,4" opacity="0.8"/>`
    }

    let pieceGroups = ''
    r.blocks.forEach((block: any, bi: number) => {
      const bx = block.x * scale
      const by = block.y * scale
      const pieceW = block.pieceWidth * scale
      const pieceH = block.pieceHeight * scale
      const gId = gradients[bi % gradients.length].id
      const sCol = strokeColors[bi % strokeColors.length]
      let num = 1
      for (let i = 0; i < block.horizontal; i++) {
        for (let j = 0; j < block.vertical; j++) {
          const cx = bx + i * pieceW + pieceW / 2
          const cy = by + j * pieceH + pieceH / 2
          const cr = Math.max(4, Math.min(pieceW, pieceH) / 4)
          pieceGroups += `<g><rect x="${bx + i * pieceW + 1}" y="${by + j * pieceH + 1}" width="${pieceW - 3}" height="${pieceH - 3}" fill="url(#${gId})" stroke="${sCol}" stroke-width="1.5"/><circle cx="${cx}" cy="${cy}" r="${cr}" fill="white" opacity="0.9"/><text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="500" fill="#64748b">${num++}</text></g>`
        }
      }
    })

    return `<svg viewBox="0 0 ${svgW} ${svgH}" preserveAspectRatio="xMidYMid meet" style="display:block;max-width:100%;max-height:130mm;border:1px solid #cbd5e1;border-radius:2px;background:linear-gradient(to bottom right,#fff,#f8fafc);"><defs>${defsInner}</defs><rect x="0" y="0" width="${svgW}" height="${svgH}" fill="#f1f5f9" opacity="0.3"/><rect x="0" y="0" width="${svgW}" height="${svgH}" fill="none" stroke="#94a3b8" stroke-width="4" rx="2"/>${cutLines}${wasteRects}${pieceGroups}</svg>`
  }, [results])

  // Build the full print/PDF body HTML
  const buildFullPrintHtml = useCallback(() => {
    if (!results) return ''
    const r = results
    const svgDiagram = buildDiagramHtml()

    const stepsHtml = r.steps.map((step: string, idx: number) =>
      `<div style="display:flex;align-items:flex-start;gap:5px;padding:3px 0;">
        <div style="flex-shrink:0;width:17px;height:17px;background:#2563eb;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;">${idx + 1}</div>
        <span style="font-size:10px;color:#475569;padding-top:1px;line-height:1.4;">${step}</span>
      </div>`
    ).join('')

    const blockColors = [
      { bg: '#eff6ff', border: '#bfdbfe', badgeBg: '#dbeafe', badgeText: '#1d4ed8', name: '#1e40af', detail: '#2563eb' },
      { bg: '#ecfdf5', border: '#a7f3d0', badgeBg: '#d1fae5', badgeText: '#047857', name: '#065f46', detail: '#059669' },
      { bg: '#fffbeb', border: '#fde68a', badgeBg: '#fef3c7', badgeText: '#b45309', name: '#92400e', detail: '#d97706' },
      { bg: '#fff1f2', border: '#fca5a5', badgeBg: '#fecaca', badgeText: '#b91c1c', name: '#991b1b', detail: '#dc2626' },
      { bg: '#faf5ff', border: '#d8b4fe', badgeBg: '#e9d5ff', badgeText: '#7e22ce', name: '#6b21a8', detail: '#9333ea' },
    ]

    const blocksHtml = r.blocks.map((block: any, idx: number) => {
      const c = blockColors[idx % 5]
      return `<div style="border:1px solid ${c.border};background:${c.bg};border-radius:5px;padding:4px 6px;margin-bottom:3px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1px;">
          <span style="font-size:10px;font-weight:700;color:${c.name};">${block.name}</span>
          <span style="padding:1px 6px;background:${c.badgeBg};color:${c.badgeText};border-radius:10px;font-size:8px;font-weight:600;">${block.pieces} pcs</span>
        </div>
        <div style="display:flex;gap:10px;font-size:9px;color:${c.detail};">
          <span>Ukuran: <b>${block.width.toFixed(1)}×${block.height.toFixed(1)}</b></span>
          <span>Layout: <b>${block.horizontal}×${block.vertical}${block.rotated ? ' (90°)' : ''}</b></span>
        </div>
      </div>`
    }).join('')

    const infoDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    const customerLabel = selectedCustomer?.name || printName || '-'
    const paperLabel = selectedPaper?.name || 'Custom'

    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Potong Kertas</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  @page{size:A4;margin:5mm;}
  body{font-family:'Segoe UI',system-ui,Arial,sans-serif;color:#1e293b;width:210mm;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  .page{width:100%;padding:2mm 3mm;}
  @media print{body{width:210mm;}.page{padding:0;}}
</style>
</head><body>
<div class="page">

  <!-- HEADER -->
  <div style="text-align:center;margin-bottom:4mm;padding-bottom:3mm;border-bottom:2px solid #e2e8f0;">
    <div style="font-size:14pt;font-weight:700;color:#0f172a;">Potong Kertas</div>
    <div style="font-size:9pt;color:#64748b;margin-top:1mm;">${customerLabel} · ${paperLabel} · ${infoDate}</div>
  </div>

  <!-- INFO GRID -->
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:2mm;margin-bottom:3mm;">
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:4px;padding:2.5mm 3mm;">
      <div style="font-size:7.5pt;color:#2563eb;font-weight:500;">Jumlah Diperlukan</div>
      <div style="font-size:13pt;font-weight:700;color:#1d4ed8;">${r.quantity} <span style="font-size:8pt;font-weight:400;">lembar</span></div>
    </div>
    <div style="background:#faf5ff;border:1px solid #d8b4fe;border-radius:4px;padding:2.5mm 3mm;">
      <div style="font-size:7.5pt;color:#7e22ce;font-weight:500;">Potongan / Lembar</div>
      <div style="font-size:13pt;font-weight:700;color:#6d28d9;">${r.totalPieces} <span style="font-size:8pt;font-weight:400;">lembar</span></div>
    </div>
    <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:4px;padding:2.5mm 3mm;">
      <div style="font-size:7.5pt;color:#059669;font-weight:500;">Lembar Kertas</div>
      <div style="font-size:13pt;font-weight:700;color:#047857;">${r.sheetsNeeded} <span style="font-size:8pt;font-weight:400;">lembar</span></div>
    </div>
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:4px;padding:2.5mm 3mm;">
      <div style="font-size:7.5pt;color:#ea580c;font-weight:500;">Total Harga Kertas</div>
      <div style="font-size:12pt;font-weight:700;color:#c2410c;">Rp ${Math.round(r.totalPrice).toLocaleString('id-ID')}</div>
    </div>
    <div style="background:#fff1f2;border:1px solid #fca5a5;border-radius:4px;padding:2.5mm 3mm;">
      <div style="font-size:7.5pt;color:#e11d48;font-weight:500;">Sisa Potongan</div>
      <div style="font-size:13pt;font-weight:700;color:#be123c;">${r.totalWasteArea.toFixed(2)} <span style="font-size:8pt;font-weight:400;">cm²</span></div>
    </div>
    <div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:4px;padding:2.5mm 3mm;">
      <div style="font-size:7.5pt;color:#0d9488;font-weight:500;">Efisiensi Bahan</div>
      <div style="font-size:13pt;font-weight:700;color:#0f766e;">${Math.round(r.efficiency * 10) / 10}%</div>
    </div>
  </div>

  <!-- STRATEGY -->
  <div style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:4px;padding:2mm 3mm;margin-bottom:3mm;text-align:center;">
    <span style="font-size:7.5pt;font-weight:700;color:#3730a3;">Strategi Optimasi: </span>
    <span style="font-size:10pt;font-weight:700;color:#4338ca;">${r.strategy}</span>
  </div>

  <!-- DIAGRAM -->
  <div style="text-align:center;margin-bottom:3mm;">
    ${svgDiagram}
  </div>

  <!-- STEPS + BLOCKS side by side -->
  <div style="display:flex;gap:4mm;align-items:flex-start;">
    <div style="flex:1;min-width:0;">
      <div style="font-size:9pt;font-weight:700;color:#334155;margin-bottom:1.5mm;">Cara Potong:</div>
      ${stepsHtml}
    </div>
    <div style="flex:1;min-width:0;">
      <div style="font-size:9pt;font-weight:700;color:#334155;margin-bottom:1.5mm;">Detail per Blok:</div>
      ${blocksHtml}
    </div>
  </div>

</div>
</body></html>`
  }, [results, selectedCustomer, selectedPaper, printName, buildDiagramHtml])

  const handlePrint = () => {
    if (!results) return
    const html = buildFullPrintHtml()
    if (!html) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast.error('Popup diblokir. Izinkan popup untuk mencetak.')
      return
    }
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.onload = () => {
      printWindow.print()
    }
  }

  const handlePdf = async () => {
    if (!results) return

    setIsGeneratingPdf(true)
    try {
      const html = buildFullPrintHtml()
      if (!html) { toast.error('Tidak ada data'); return }

      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        toast.error('Popup diblokir. Izinkan popup untuk membuat PDF.')
        return
      }

      // Inject auto-PDF script into the HTML
      const pdfHtml = html.replace('</body>', `
  <script>
    window.onload = function() {
      // Small delay for SVG rendering
      setTimeout(function() {
        window.print();
      }, 500);
    }
  </script>
</body>`)

      printWindow.document.write(pdfHtml)
      printWindow.document.close()
      toast.success('PDF dibuka! Pilih "Save as PDF" di dialog print.')
    } catch (err) {
      console.error('PDF generation error:', err)
      toast.error('Gagal menghasilkan PDF')
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  const handleShareWhatsApp = async () => {
    if (!results) return

    try {
      const r = results
      const customerLabel = selectedCustomer?.name || printName || '-'
      const paperLabel = selectedPaper?.name || 'Custom'
      const date = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

      const message = [
        `📋 *POTONG KERTAS*`,
        ``,
        `👤 ${customerLabel}`,
        `📄 ${paperLabel}`,
        `📅 ${date}`,
        ``,
        `📐 *Ukuran:* ${r.cutWidth} × ${r.cutHeight} cm`,
        `📊 *Strategi:* ${r.strategy}`,
        ``,
        `🔢 Jumlah Diperlukan: *${r.quantity} lembar*`,
        `📦 Potongan/Lembar: *${r.totalPieces} pcs*`,
        `📝 Lembar Kertas: *${r.sheetsNeeded} lembar*`,
        `💰 Total Harga: *Rp ${Math.round(r.totalPrice).toLocaleString('id-ID')}*`,
        `🗑️ Sisa Potongan: *${Math.round(r.totalWasteArea)} cm²*`,
        `📈 Efisiensi: *${Math.round(r.efficiency * 10) / 10}%*`,
        ``,
        `_${r.blocks.map((b: any) => `• ${b.name}: ${b.horizontal}×${b.vertical}${b.rotated ? ' (90°)' : ''}`).join('\\n')}_`,
        ``,
        `—— Darrell Soft ——`,
      ].join('\\n')

      const encoded = encodeURIComponent(message)
      window.open(`https://wa.me/?text=${encoded}`, '_blank')
      toast.success('WhatsApp terbuka!')
    } catch (err) {
      console.error('WhatsApp share error:', err)
      toast.error('Gagal membuka WhatsApp')
    }
  }

  // Riwayat table component
  const RiwayatTable = ({ items }: { items: any[] }) => (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/80">
            <th className="text-left py-2.5 px-3 text-slate-500 font-semibold whitespace-nowrap">#</th>
            <th className="text-left py-2.5 px-3 text-slate-500 font-semibold whitespace-nowrap">Customer</th>
            <th className="text-left py-2.5 px-3 text-slate-500 font-semibold whitespace-nowrap hidden sm:table-cell">Nama Cetakan</th>
            <th className="text-left py-2.5 px-3 text-slate-500 font-semibold whitespace-nowrap">Kertas</th>
            <th className="text-left py-2.5 px-3 text-slate-500 font-semibold whitespace-nowrap hidden md:table-cell">Ukuran Kertas</th>
            <th className="text-left py-2.5 px-3 text-slate-500 font-semibold whitespace-nowrap hidden lg:table-cell">Ukuran Potong</th>
            <th className="text-right py-2.5 px-3 text-slate-500 font-semibold whitespace-nowrap">Qty</th>
            <th className="text-right py-2.5 px-3 text-slate-500 font-semibold whitespace-nowrap">Total</th>
            <th className="text-center py-2.5 px-3 text-slate-500 font-semibold whitespace-nowrap">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {items.map((r, idx) => (
            <tr key={r.id} className={`border-b border-slate-50 hover:bg-amber-50/40 transition-colors ${restoredRiwayatId === r.id ? 'bg-emerald-50/60' : ''}`}>
              <td className="py-2.5 px-3 text-slate-400">{idx + 1}</td>
              <td className="py-2.5 px-3 text-slate-700 font-medium max-w-[120px] truncate">
                {r.namaCustomer && r.namaCustomer !== '-' ? r.namaCustomer : '-'}
              </td>
              <td className="py-2.5 px-3 text-slate-600 hidden sm:table-cell max-w-[120px] truncate">
                {r.namaCetakan || '-'}
              </td>
              <td className="py-2.5 px-3 text-slate-600 max-w-[100px] truncate">
                {r.paperName || '-'}
              </td>
              <td className="py-2.5 px-3 text-slate-500 hidden md:table-cell whitespace-nowrap">
                {r.paperWidth && r.paperWidth !== '0' ? `${r.paperWidth} × ${r.paperHeight}` : '-'}
              </td>
              <td className="py-2.5 px-3 text-slate-500 hidden lg:table-cell whitespace-nowrap">
                {r.cutWidth && r.cutWidth !== '0' ? `${r.cutWidth} × ${r.cutHeight}` : '-'}
              </td>
              <td className="py-2.5 px-3 text-slate-600 text-right whitespace-nowrap">
                {parseInt(r.quantity || 0).toLocaleString('id-ID')}
              </td>
              <td className="py-2.5 px-3 text-rose-700 font-bold text-right whitespace-nowrap">
                Rp {Math.round(r.totalPrice || 0).toLocaleString('id-ID')}
              </td>
              <td className="py-2.5 px-3 text-center">
                <div className="flex items-center justify-center gap-1">
                  <button
                    onClick={() => handlePreviewRiwayat(r)}
                    className="inline-flex items-center justify-center w-7 h-7 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md border border-blue-200 transition-colors"
                    title="Preview"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleRestore(r)}
                    className="inline-flex items-center justify-center w-7 h-7 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-md border border-emerald-200 transition-colors"
                    title="Restore"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteRiwayat(r.id)}
                    className="inline-flex items-center justify-center w-7 h-7 bg-red-50 hover:bg-red-100 text-red-600 rounded-md border border-red-200 transition-colors"
                    title="Hapus"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

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
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-[18px] font-bold text-slate-700 mb-3 uppercase">{t('info_cetak')}</p>
            <div className="space-y-3">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>{t('nama_customer')}</label>
                  <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                    <SelectTrigger className="w-full h-10 text-base"><SelectValue placeholder={t('pilih_customer')} /></SelectTrigger>
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
                  <SelectTrigger className="w-full h-10 text-base"><SelectValue placeholder={t('pilih_kertas')} /></SelectTrigger>
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
              <div className="grid grid-cols-2 gap-3">
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
              <div>
                <label className={lbl}>Setelan Kertas</label>
                <input type="number" step="1" min="0" placeholder="0" value={setelanKertas} onChange={(e) => setSetelanKertas(e.target.value)} className={inp} />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-1.5">
            <button onClick={handleCalculateCuts} disabled={isCalculating}
              className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white text-base lg:text-[13px] font-semibold py-3.5 lg:py-2 rounded-lg transition-colors">
              {isCalculating ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              {t('hitung_potongan')}
            </button>
            <button onClick={restoredRiwayatId ? handleUpdateRiwayat : handleSaveRiwayat} disabled={!results || savingRiwayat}
              className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-base lg:text-[13px] font-semibold py-3.5 lg:py-2 rounded-lg transition-colors" title={restoredRiwayatId ? 'Update Riwayat' : 'Simpan Riwayat'}>
              {restoredRiwayatId ? <RefreshCw className={`w-3 h-3 ${savingRiwayat ? 'animate-spin' : ''}`} /> : <Save className="w-3 h-3" />}
              {restoredRiwayatId ? (savingRiwayat ? 'Updating...' : 'Update Riwayat') : (savingRiwayat ? 'Menyimpan...' : 'Simpan Riwayat')}
            </button>
            <button onClick={() => { if (!results) { toast.error('Hitung potongan terlebih dahulu!'); return; } setPreviewOpen(true) }} disabled={!results}
              className="flex items-center justify-center gap-1.5 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-base lg:text-[13px] font-semibold py-3.5 lg:py-2 rounded-lg transition-colors" title={t('preview')}>
              {t('preview')}
            </button>
            <button onClick={handleReset}
              className="flex items-center justify-center gap-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-base lg:text-[13px] font-semibold py-3.5 lg:py-2 rounded-lg transition-colors" title={t('reset')}>
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
                if (selectedPaperId && selectedPaperId !== 'custom') params.set('paperId', selectedPaperId)
                if (selectedPaper?.name) params.set('paperName', selectedPaper.name)
                if (grammage) params.set('grammage', grammage)
                if (pricePerSheet) params.set('pricePerSheet', pricePerSheet)
                if (cutWidth) params.set('cutWidth', cutWidth)
                if (cutHeight) params.set('cutHeight', cutHeight)
                if (results?.totalPrice) params.set('totalPaperPrice', results.totalPrice.toString())
                params.set('fromPotongKertas', '1')
                window.location.href = `/hitung-cetakan?${params.toString()}`
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
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2 lg:gap-2 flex-shrink-0">
                <div className="bg-blue-50 rounded-lg p-3 lg:p-2.5 text-center">
                  <p className="text-xs lg:text-xs text-blue-600 font-medium leading-tight">Diperlukan</p>
                  <p className="text-2xl lg:text-2xl font-bold text-blue-700 leading-tight">{quantity || '0'}</p>
                  <p className="text-xs lg:text-xs text-blue-500">lembar</p>
                </div>
                <div className="bg-sky-50 rounded-lg p-3 lg:p-2.5 text-center">
                  <p className="text-xs lg:text-xs text-sky-600 font-medium leading-tight">Setelan Kertas</p>
                  <p className="text-2xl lg:text-2xl font-bold text-sky-700 leading-tight">{setelanKertas || '0'}</p>
                  <p className="text-xs lg:text-xs text-sky-500">lembar</p>
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
                <div className="bg-amber-50 rounded-lg p-3 lg:p-2.5 text-center">
                  <p className="text-xs lg:text-xs text-amber-600 font-medium leading-tight">Harga / Lembar</p>
                  <p className="text-lg lg:text-lg font-bold text-amber-700 leading-tight">Rp {Math.round(parseFloat(pricePerSheet) || 0).toLocaleString('id-ID')}</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-3 lg:p-2.5 text-center col-span-2 xl:col-span-5">
                  <p className="text-xs lg:text-xs text-orange-600 font-medium leading-tight">Total Harga</p>
                  <p className="text-[26px] lg:text-[26px] font-bold text-orange-700 leading-tight">Rp {Math.round(results.totalPrice).toLocaleString('id-ID')}</p>
                </div>
                <div className="bg-teal-50 rounded-lg p-3 lg:p-2.5 text-center">
                  <p className="text-xs lg:text-xs text-teal-600 font-medium leading-tight">Efisiensi</p>
                  <p className="text-2xl lg:text-2xl font-bold text-teal-700 leading-tight">{Math.round(results.efficiency * 10) / 10}%</p>
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

      {/* Riwayat Table Section */}
      <div className="mt-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 bg-slate-50/60">
            <div className="w-6 h-6 rounded-md bg-amber-100 flex items-center justify-center">
              <History className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Riwayat Potong Kertas</h2>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">{riwayatList.length}</span>
          </div>
          {riwayatList.length > 0 ? (
            <RiwayatTable items={riwayatList} />
          ) : (
            <div className="px-4 py-6 text-center">
              <History className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-xs text-slate-400">Belum ada riwayat potong kertas</p>
            </div>
          )}
        </div>
      </div>

      {/* ===== PREVIEW DIALOG ===== */}
      <Dialog open={previewOpen} onOpenChange={(open) => { setPreviewOpen(open); if (!open) { setPreviewRiwayatData(null); setPreviewRiwayatInfo({ customer: '-', paper: '-' }) } }}>
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
                {(previewRiwayatData ? previewRiwayatInfo.customer : (selectedCustomer?.name || '-'))} · {previewRiwayatData ? previewRiwayatInfo.paper : (selectedPaper?.name || 'Custom')} · {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                <p className="text-[10px] text-blue-600 font-medium">Jumlah Diperlukan</p>
                <p className="text-xl font-bold text-blue-700">{previewRiwayatData?.quantity || results?.quantity || 0} <span className="text-xs font-normal">lembar</span></p>
              </div>
              <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
                <p className="text-[10px] text-purple-600 font-medium">Potongan / Lembar</p>
                <p className="text-xl font-bold text-purple-700">{previewRiwayatData?.totalPieces || results?.totalPieces || 0} <span className="text-xs font-normal">lembar</span></p>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                <p className="text-[10px] text-emerald-600 font-medium">Lembar Kertas</p>
                <p className="text-xl font-bold text-emerald-700">{previewRiwayatData?.sheetsNeeded || results?.sheetsNeeded || 0} <span className="text-xs font-normal">lembar</span></p>
              </div>
              <div className="bg-orange-50 border border-orange-100 rounded-lg p-3">
                <p className="text-[10px] text-orange-600 font-medium">Total Harga Kertas</p>
                <p className="text-[24px] font-bold text-orange-700">Rp {Math.round(previewRiwayatData?.totalPrice || results?.totalPrice || 0).toLocaleString('id-ID')}</p>
              </div>
              <div className="bg-rose-50 border border-rose-100 rounded-lg p-3">
                <p className="text-[10px] text-rose-600 font-medium">Sisa Potongan</p>
                <p className="text-xl font-bold text-rose-700">{(previewRiwayatData || results)?.totalWasteArea.toFixed(2)} <span className="text-xs font-normal">cm²</span></p>
              </div>
              <div className="bg-teal-50 border border-teal-100 rounded-lg p-3">
                <p className="text-[10px] text-teal-600 font-medium">Efisiensi Bahan</p>
                <p className="text-xl font-bold text-teal-700">{Math.round(((previewRiwayatData || results)?.efficiency || 0) * 10) / 10}%</p>
              </div>
            </div>

            {/* Strategy */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
              <p className="text-[10px] text-indigo-600 font-medium text-center">Strategi Optimasi</p>
              <p className="text-xl font-bold text-indigo-700 text-center">{previewRiwayatData?.strategy || results?.strategy}</p>
            </div>

            {/* Diagram */}
            {(previewRiwayatData || results) && (
              <div className="text-center mb-4">
                <CuttingDiagram results={previewRiwayatData || results!} maxHeight="260px" />
              </div>
            )}

            {/* Steps */}
            {(previewRiwayatData || results) && (
              <div className="mb-4">
                <h3 className="text-xs font-bold text-slate-700 mb-2">Cara Potong:</h3>
                <div className="space-y-1.5">
                  {(previewRiwayatData || results)!.steps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <div className="flex-shrink-0 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[9px] font-bold">{idx + 1}</div>
                      <p className="text-[11px] text-slate-600 pt-0.5">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Block Details */}
            {(previewRiwayatData || results) && (
              <div className="mb-2">
                <h3 className="text-xs font-bold text-slate-700 mb-2">Detail per Blok:</h3>
                <div className="space-y-2">
                  {(previewRiwayatData || results)!.blocks.map((block: any, idx: number) => (
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
          <div className="sticky bottom-0 bg-white border-t border-slate-200 p-4 flex gap-2">
            <button onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors text-sm">
              <Printer className="w-4 h-4" /> {t('cetak')}
            </button>
            <button onClick={handlePdf} disabled={isGeneratingPdf}
              className="flex-1 flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-400 text-white font-semibold py-3 rounded-xl transition-colors text-sm">
              {isGeneratingPdf ? <><Loader2 className="w-4 h-4 animate-spin" />PDF...</> : <><FileImage className="w-4 h-4" /> PDF</>}
            </button>
            <button onClick={handleShareWhatsApp}
              className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors text-sm">
              <Share2 className="w-4 h-4" /> WA
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
