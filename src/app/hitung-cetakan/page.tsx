'use client'

import { Calculator, Printer, Plus, Users, FileText, Ruler, Cog, Layers, Package, Truck, Banknote, RotateCcw, Trash2, Palette, Minus, X, Percent, Save, Eye } from 'lucide-react'
import { useState, useEffect, Suspense, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard-layout'
import { getAuthHeaders } from '@/lib/auth'
import { fetcher } from '@/lib/fetcher'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/language-context'

interface Paper {
  id: string
  name: string
  grammage: number
  width: number
  height: number
  pricePerRim: number
}

interface PrintingCost {
  id: string
  machineName: string
  grammage: number
  printAreaWidth: number
  printAreaHeight: number
  pricePerColor: number
  specialColorPrice: number
  minimumPrintQuantity: number
  priceAboveMinimumPerSheet: number
  platePricePerSheet: number
}

interface Finishing {
  id: string
  name: string
  minimumSheets: number
  minimumPrice: number
  additionalPrice: number
  pricePerCm: number
}

interface Customer {
  id: string
  name: string
}

interface PrintCalculation {
  id: string
  printName: string
  paperLength: string
  paperWidth: string
  quantity: string
  warna: string
  warnaKhusus: string
  paperId: string
  paperName: string
  machineId: string
  machineName: string
  printingCost: number
  finishingId: string
  finishingName: string
  packingCost: string
  shippingCost: string
  pricePerSheet: string
  hargaPlat: string
  totalPrice: number
}

const inputClass = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors lg:py-1.5'
const selectClass = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors bg-white appearance-none cursor-pointer lg:py-1.5'
const labelClass = 'flex items-center gap-1.5 text-xs font-medium text-slate-700 mb-1.5'

export default function HitungCetakanPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div></div>}>
      <HitungCetakanPage />
    </Suspense>
  )
}

const FORM_STORAGE_KEY = 'hitung-cetakan-form-data'

function HitungCetakanPage() {
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [papers, setPapers] = useState<Paper[]>([])
  const [printingCosts, setPrintingCosts] = useState<PrintingCost[]>([])
  const [finishings, setFinishings] = useState<Finishing[]>([])
  const [calculations, setCalculations] = useState<PrintCalculation[]>([])
  const [hydrated, setHydrated] = useState(false)

  const [selectedFinishings, setSelectedFinishings] = useState<string[]>([])

  const [formData, setFormData] = useState({
    customerName: '',
    printName: '',
    paperLength: '',
    paperWidth: '',
    cutWidth: '',
    cutHeight: '',
    quantity: '',
    warna: '',
    warnaKhusus: '',
    hargaPlat: '',
    paperId: '',
    machineId: '',
    packingCost: '',
    shippingCost: '',
    pricePerSheet: '',
    glueLengthCm: '',
    glueCostPerCm: '',
    glueBoronganPerSheet: '',
    biayaLain1: '',
    biayaLain2: '',
    machineId2: '',
    warna2: '',
    warnaKhusus2: '',
    hargaPlat2: ''
  })

  const [totalPaperPrice, setTotalPaperPrice] = useState<number>(0)
  const [calculatedPrintingCost, setCalculatedPrintingCost] = useState<number>(0)
  const [calculatedPrintingCost2, setCalculatedPrintingCost2] = useState<number>(0)
  const [calculatedCost, setCalculatedCost] = useState<number>(0)
  const [isFinishingMin, setIsFinishingMin] = useState<boolean>(false)
  const [calculatedFinishingCost, setCalculatedFinishingCost] = useState<number>(0)
  const [calculatedPaperCost, setCalculatedPaperCost] = useState<number>(0)
  const [calculatedGlueCost, setCalculatedGlueCost] = useState<number>(0)
  const [calculatedGlueBoronganSheet, setCalculatedGlueBoronganSheet] = useState<number>(0)
  const [prefilled, setPrefilled] = useState(false)
  const [profitPercent, setProfitPercent] = useState<number>(0)

  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewCalc, setPreviewCalc] = useState<PrintCalculation | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  // === localStorage persistence ===
  const loadFromStorage = () => {
    if (typeof window === 'undefined') return null
    try {
      const raw = localStorage.getItem(FORM_STORAGE_KEY)
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  }

  const saveToStorage = (data: { formData: typeof formData; selectedFinishings: string[]; totalPaperPrice: number }) => {
    if (typeof window === 'undefined') return
    try { localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(data)) } catch {}
  }

  const clearStorage = () => {
    if (typeof window === 'undefined') return
    try { localStorage.removeItem(FORM_STORAGE_KEY) } catch {}
  }

  // Load saved form data on mount
  useEffect(() => {
    const saved = loadFromStorage()
    if (saved) {
      if (saved.formData) setFormData(saved.formData)
      if (saved.selectedFinishings) setSelectedFinishings(saved.selectedFinishings)
      if (saved.totalPaperPrice) setTotalPaperPrice(saved.totalPaperPrice)
    }
    setHydrated(true)
  }, [])

  // Save to localStorage on every change (after hydration)
  useEffect(() => {
    if (!hydrated) return
    saveToStorage({ formData, selectedFinishings, totalPaperPrice })
  }, [formData, selectedFinishings, totalPaperPrice, hydrated])

  const handleAddFinishing = (finishingId: string) => {
    if (finishingId && !selectedFinishings.includes(finishingId)) {
      setSelectedFinishings([...selectedFinishings, finishingId])
      toast.success('Finishing berhasil ditambahkan')
    } else if (selectedFinishings.includes(finishingId)) {
      toast.error('Finishing ini sudah ditambahkan')
    }
  }

  const handleRemoveFinishing = (finishingId: string) => {
    setSelectedFinishings(selectedFinishings.filter(id => id !== finishingId))
    toast.success('Finishing berhasil dihapus')
  }

  const getFinishingCost = (finishing: Finishing): { cost: number; isMin: boolean; breakdown: string } => {
    const qty = parseInt(formData.quantity) || 0
    const cw = parseFloat(formData.cutWidth) || 0
    const ch = parseFloat(formData.cutHeight) || 0

    const minSheets = finishing.minimumSheets
    const minPrice = finishing.minimumPrice
    const hargaLebih = finishing.additionalPrice
    const hargaPerCm = finishing.pricePerCm
    const isPond = finishing.name.toLowerCase().includes('pond')

    if (qty <= 0) {
      return { cost: minPrice, isMin: true, breakdown: `Harga minimum: Rp ${minPrice.toLocaleString('id-ID')}` }
    }

    if (isPond) {
      if (qty <= minSheets) {
        return {
          cost: minPrice,
          isMin: true,
          breakdown: `Qty ${qty} ≤ minim ${minSheets} → Harga minimum: Rp ${minPrice.toLocaleString('id-ID')}`
        }
      }
      const selisih = qty - minSheets
      const tambahan = selisih * hargaLebih
      const total = minPrice + tambahan
      return {
        cost: total,
        isMin: false,
        breakdown: `Harga minimum Rp ${minPrice.toLocaleString('id-ID')} + ((${qty} - ${minSheets}) × Rp ${hargaLebih.toLocaleString('id-ID')}) = Rp ${total.toLocaleString('id-ID')}`
      }
    }

    let part1 = 0
    let part1Text = ''
    if (qty > minSheets && hargaLebih > 0) {
      const selisih = qty - minSheets
      part1 = selisih * hargaLebih
      part1Text = `(${qty} - ${minSheets}) × Rp ${hargaLebih.toLocaleString('id-ID')} = Rp ${part1.toLocaleString('id-ID')}`
    }

    let part2 = 0
    let part2Text = ''
    if (cw > 0 && ch > 0 && hargaPerCm > 0) {
      const areaCost = cw * ch * hargaPerCm
      part2 = areaCost * qty
      part2Text = `(${cw} × ${ch}) × Rp ${hargaPerCm.toLocaleString('id-ID')} × ${qty} = Rp ${part2.toLocaleString('id-ID')}`
    }

    const total = part1 + part2

    if (total <= minPrice) {
      const parts = [part1Text, part2Text].filter(Boolean)
      const calcText = parts.length > 0 ? `${parts.join(' + ')} = Rp ${total.toLocaleString('id-ID')} ≤ Rp ${minPrice.toLocaleString('id-ID')}` : ''
      return {
        cost: minPrice,
        isMin: true,
        breakdown: calcText ? `${calcText} → Harga minimum: Rp ${minPrice.toLocaleString('id-ID')}` : `Harga minimum: Rp ${minPrice.toLocaleString('id-ID')}`
      }
    }

    const parts = [part1Text, part2Text].filter(Boolean)
    const breakdown = parts.join(' + ') + ` = Rp ${total.toLocaleString('id-ID')}`

    return { cost: total, isMin: false, breakdown }
  }

  useEffect(() => {
    const printName = searchParams.get('printName')
    const paperLength = searchParams.get('paperLength')
    const paperWidthParam = searchParams.get('paperWidth')
    const cutWidthParam = searchParams.get('cutWidth')
    const cutHeightParam = searchParams.get('cutHeight')
    const quantityParam = searchParams.get('quantity')
    const paperId = searchParams.get('paperId')
    const pricePerSheet = searchParams.get('pricePerSheet')
    const totalPaperPriceParam = searchParams.get('totalPaperPrice')

    if (totalPaperPriceParam) {
      setTotalPaperPrice(parseFloat(totalPaperPriceParam) || 0)
    }

    const customerNameParam = searchParams.get('customerName')

    if (printName || paperLength || quantityParam || paperId) {
      setFormData(prev => ({
        ...prev,
        customerName: customerNameParam || prev.customerName,
        printName: printName || prev.printName,
        paperLength: paperLength || prev.paperLength,
        paperWidth: paperWidthParam || prev.paperWidth,
        cutWidth: cutWidthParam || prev.cutWidth,
        cutHeight: cutHeightParam || prev.cutHeight,
        quantity: quantityParam || prev.quantity,
        paperId: paperId || prev.paperId,
        pricePerSheet: pricePerSheet || prev.pricePerSheet,
      }))
      setPrefilled(true)
    }
  }, [searchParams])

  const fetchCustomers = async () => {
    try {
      const response = await fetcher('/api/customers', { headers: getAuthHeaders() })
      const data = await response.json()
      if (Array.isArray(data)) setCustomers(data)
    } catch (error) {
      console.error('Error fetching customers:', error)
    }
  }

  const fetchPapers = async () => {
    try {
      const response = await fetcher('/api/papers', { headers: getAuthHeaders() })
      const data = await response.json()
      if (Array.isArray(data)) setPapers(data)
    } catch (error) {
      console.error('Error fetching papers:', error)
    }
  }

  const fetchPrintingCosts = async () => {
    try {
      const response = await fetcher('/api/printing-costs', { headers: getAuthHeaders() })
      const data = await response.json()
      if (Array.isArray(data)) setPrintingCosts(data)
    } catch (error) {
      console.error('Error fetching printing costs:', error)
    }
  }

  const fetchFinishings = async () => {
    try {
      const response = await fetcher('/api/finishings', { headers: getAuthHeaders() })
      const data = await response.json()
      if (Array.isArray(data)) setFinishings(data)
    } catch (error) {
      console.error('Error fetching finishings:', error)
    }
  }

  useEffect(() => {
    fetchCustomers()
    fetchPapers()
    fetchPrintingCosts()
    fetchFinishings()
    fetcher('/api/settings?key=profit', { headers: getAuthHeaders() })
      .then(res => res.json())
      .then(data => {
        if (data.value) setProfitPercent(parseFloat(data.value) || 0)
      })
      .catch(() => {})
  }, [])

  const selectedPaper = papers.find(p => p.id === formData.paperId)
  const selectedMachine = printingCosts.find(m => m.id === formData.machineId)
  const selectedMachine2 = printingCosts.find(m => m.id === formData.machineId2)
  const selectedFinishingItems = selectedFinishings.map(id => finishings.find(f => f.id === id)).filter(Boolean) as Finishing[]

  useEffect(() => {
    if (selectedMachine && !formData.hargaPlat) {
      setFormData(prev => ({ ...prev, hargaPlat: selectedMachine.platePricePerSheet?.toString() || '' }))
    }
  }, [selectedMachine])

  useEffect(() => {
    if (selectedMachine2 && !formData.hargaPlat2) {
      setFormData(prev => ({ ...prev, hargaPlat2: selectedMachine2.platePricePerSheet?.toString() || '' }))
    }
  }, [selectedMachine2])

  useEffect(() => {
    if (selectedPaper && !formData.pricePerSheet) {
      setFormData(prev => ({ ...prev, pricePerSheet: Math.round(selectedPaper.pricePerRim / 500).toString() }))
    }
  }, [selectedPaper])

  useEffect(() => {
    const qty = parseInt(formData.quantity) || 0
    const warna = parseInt(formData.warna) || 0
    const warnaKhusus = parseInt(formData.warnaKhusus) || 0
    const hargaPlat = parseFloat(formData.hargaPlat) || 0

    if (selectedMachine && qty > 0 && warna > 0) {
      const minimum = selectedMachine.minimumPrintQuantity
      let ongkos = 0
      ongkos += (selectedMachine.pricePerColor * warna) + (selectedMachine.specialColorPrice * warnaKhusus)
      if (qty > minimum) {
        ongkos += (qty - minimum) * selectedMachine.priceAboveMinimumPerSheet
      }
      ongkos += hargaPlat * (warna + warnaKhusus)
      setCalculatedPrintingCost(ongkos)
    } else {
      setCalculatedPrintingCost(0)
    }

    if (selectedFinishingItems.length > 0) {
      let totalFinCost = 0
      let anyMin = false
      selectedFinishingItems.forEach(fin => {
        const result = getFinishingCost(fin)
        totalFinCost += result.cost
        if (result.isMin) anyMin = true
      })
      setCalculatedFinishingCost(totalFinCost)
      setIsFinishingMin(anyMin)
    } else {
      setCalculatedFinishingCost(0)
      setIsFinishingMin(false)
    }

    // Ongkos Cetak 2
    const warna2 = parseInt(formData.warna2) || 0
    const warnaKhusus2 = parseInt(formData.warnaKhusus2) || 0
    const hargaPlat2 = parseFloat(formData.hargaPlat2) || 0

    if (selectedMachine2 && qty > 0 && warna2 > 0) {
      const minimum2 = selectedMachine2.minimumPrintQuantity
      let ongkos2 = 0
      ongkos2 += (selectedMachine2.pricePerColor * warna2) + (selectedMachine2.specialColorPrice * warnaKhusus2)
      if (qty > minimum2) {
        ongkos2 += (qty - minimum2) * selectedMachine2.priceAboveMinimumPerSheet
      }
      ongkos2 += hargaPlat2 * (warna2 + warnaKhusus2)
      setCalculatedPrintingCost2(ongkos2)
    } else {
      setCalculatedPrintingCost2(0)
    }

    // Ongkos Lem
    const cmLem = parseFloat(formData.glueLengthCm) || 0
    const hargaPerCmLem = parseFloat(formData.glueCostPerCm) || 0
    if (cmLem > 0 && hargaPerCmLem > 0 && qty > 0) {
      setCalculatedGlueCost(cmLem * hargaPerCmLem * qty)
    } else {
      setCalculatedGlueCost(0)
    }

    const boronganPerSheet = parseFloat(formData.glueBoronganPerSheet) || 0
    if (boronganPerSheet > 0 && qty > 0) {
      setCalculatedGlueBoronganSheet(boronganPerSheet * qty)
    } else {
      setCalculatedGlueBoronganSheet(0)
    }

    setCalculatedCost(calculatedPrintingCost + calculatedPrintingCost2 + calculatedFinishingCost)
  }, [selectedMachine, selectedMachine2, selectedFinishingItems, formData.quantity, formData.warna, formData.warnaKhusus, formData.hargaPlat, formData.warna2, formData.warnaKhusus2, formData.hargaPlat2, formData.cutWidth, formData.cutHeight, formData.glueLengthCm, formData.glueCostPerCm, formData.glueBoronganPerSheet, calculatedPrintingCost, calculatedPrintingCost2, calculatedFinishingCost])

  const handlePrint = (calc: PrintCalculation) => {
    const printWindow = window.open('', '', 'height=900,width=800')
    if (!printWindow) { toast.error('Gagal membuka jendela print'); return }
    const ongkosCetak = calc.printingCost
    const packingCost = parseInt(calc.packingCost) || 0
    const shippingCost = parseInt(calc.shippingCost) || 0
    const paperCost = (parseFloat(calc.pricePerSheet) || 0) * (parseInt(calc.quantity) || 0)
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Preview</title><style>*{margin:0;padding:0;box-sizing:border-box}@page{size:A4;margin:10mm}body{font-family:'Segoe UI',Arial,sans-serif;color:#1e293b}.header{text-align:center;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #e2e8f0}.header h1{font-size:18px;font-weight:700}.header p{font-size:11px;color:#64748b;margin-top:2px}.ig{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}.ii{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px 10px}.ii .l{font-size:9px;color:#64748b;font-weight:500}.ii .v{font-size:13px;font-weight:700}.ds{margin:10px 0}.ds h3{font-size:12px;font-weight:700;margin-bottom:6px}.dr{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #f1f5f9}.dr:last-child{border:none}.dr .dl{font-size:11px;color:#64748b}.dr .dv{font-size:12px;font-weight:600}.gt{background:linear-gradient(135deg,#059669,#0d9488);color:white;border-radius:8px;padding:10px 14px;margin-top:10px;display:flex;justify-content:space-between;align-items:center}.gt .gl{font-size:12px;font-weight:600}.gt .gv{font-size:18px;font-weight:800}</style></head><body><div class="header"><h1>Preview Hitung Cetakan</h1><p>${calc.printName} · ${calc.paperName}</p></div><div class="ig"><div class="ii"><p class="l">Jumlah</p><p class="v">${parseInt(calc.quantity).toLocaleString('id-ID')} lbr</p></div><div class="ii"><p class="l">Ukuran</p><p class="v">${calc.paperLength} × ${calc.paperWidth} cm</p></div><div class="ii"><p class="l">Mesin</p><p class="v">${calc.machineName}</p></div><div class="ii"><p class="l">Warna</p><p class="v">${calc.warna} warna</p></div><div class="ii"><p class="l">Ongkos Cetak</p><p class="v">Rp ${ongkosCetak.toLocaleString('id-ID')}</p></div><div class="ii"><p class="l">Kertas</p><p class="v">Rp ${paperCost.toLocaleString('id-ID')}</p></div></div>${calc.finishingName ? `<div class="ds"><h3>Finishing</h3><div class="dr"><span class="dl">${calc.finishingName}</span></div></div>` : ''}<div class="ds"><h3>Biaya Tambahan</h3><div class="dr"><span class="dl">Packing</span><span class="dv">${packingCost > 0 ? `Rp ${packingCost.toLocaleString('id-ID')}` : '-'}</span></div><div class="dr"><span class="dl">Kirim</span><span class="dv">${shippingCost > 0 ? `Rp ${shippingCost.toLocaleString('id-ID')}` : '-'}</span></div></div><div class="gt"><span class="gl">Total Harga</span><span class="gv">Rp ${calc.totalPrice.toLocaleString('id-ID')}</span></div></body></html>`
    printWindow.document.write(html)
    printWindow.document.close()
    setTimeout(() => { printWindow.print() }, 250)
    toast.success('Mencetak detail cetakan...')
  }

  const handleAddCalculation = () => {
    if (!formData.customerName || !formData.printName || !formData.quantity || !formData.paperId || !formData.machineId) {
      toast.error('Mohon lengkapi data wajib (Nama Customer, Nama Cetakan, Jumlah, Bahan, dan Mesin)')
      return
    }
    const packing = parseFloat(formData.packingCost) || 0
    const shipping = parseFloat(formData.shippingCost) || 0
    const priceSheet = parseFloat(formData.pricePerSheet) || 0
    const qty = parseInt(formData.quantity) || 0
    const biayaLain1Val = parseFloat(formData.biayaLain1) || 0
    const biayaLain2Val = parseFloat(formData.biayaLain2) || 0
    const totalCost = calculatedCost + packing + shipping + calculatedGlueCost + calculatedGlueBoronganSheet + biayaLain1Val + biayaLain2Val + (priceSheet * qty)
    const newCalculation: PrintCalculation = {
      id: Date.now().toString(),
      printName: formData.printName, paperLength: formData.paperLength, paperWidth: formData.paperWidth,
      quantity: formData.quantity, warna: formData.warna, warnaKhusus: formData.warnaKhusus,
      hargaPlat: formData.hargaPlat, paperId: formData.paperId, paperName: selectedPaper?.name || '',
      machineId: formData.machineId, machineName: selectedMachine?.machineName || '',
      printingCost: calculatedCost, finishingId: selectedFinishings.join(','),
      finishingName: selectedFinishingItems.map(f => f.name).join(', '),
      packingCost: formData.packingCost, shippingCost: formData.shippingCost,
      pricePerSheet: formData.pricePerSheet, totalPrice: totalCost
    }
    setCalculations([...calculations, newCalculation])
    toast.success('Cetakan berhasil ditambahkan ke daftar')
    const nextFormData = { customerName: formData.customerName, printName: '', paperLength: '', paperWidth: '', cutWidth: '', cutHeight: '', quantity: '', warna: '', warnaKhusus: '', hargaPlat: '', paperId: '', machineId: '', packingCost: '', shippingCost: '', pricePerSheet: '', glueLengthCm: '', glueCostPerCm: '', glueBoronganPerSheet: '', biayaLain1: '', biayaLain2: '', machineId2: '', warna2: '', warnaKhusus2: '', hargaPlat2: '' }
    setFormData(nextFormData)
    setSelectedFinishings([])
    setCalculatedCost(0)
    setCalculatedGlueCost(0)
    setCalculatedGlueBoronganSheet(0)
    setCalculatedPrintingCost2(0)
    saveToStorage({ formData: nextFormData, selectedFinishings: [], totalPaperPrice })
  }

  const handleDeleteCalculation = (id: string) => {
    setCalculations(calculations.filter(c => c.id !== id))
    toast.success('Cetakan berhasil dihapus dari daftar')
  }

  const resetForm = () => {
    clearStorage()
    setFormData({ customerName: '', printName: '', paperLength: '', paperWidth: '', cutWidth: '', cutHeight: '', quantity: '', warna: '', warnaKhusus: '', hargaPlat: '', paperId: '', machineId: '', packingCost: '', shippingCost: '', pricePerSheet: '', glueLengthCm: '', glueCostPerCm: '', glueBoronganPerSheet: '', biayaLain1: '', biayaLain2: '', machineId2: '', warna2: '', warnaKhusus2: '', hargaPlat2: '' })
    setSelectedFinishings([])
    setCalculatedCost(0)
    setCalculatedGlueCost(0)
    setCalculatedGlueBoronganSheet(0)
    setCalculatedPrintingCost2(0)
    setTotalPaperPrice(0)
    toast.success('Form berhasil direset')
  }

  const handleSaveRiwayat = async () => {
    const packing = parseFloat(formData.packingCost) || 0
    const shipping = parseFloat(formData.shippingCost) || 0
    const biayaLain1Val = parseFloat(formData.biayaLain1) || 0
    const biayaLain2Val = parseFloat(formData.biayaLain2) || 0
    const glueTotal = calculatedGlueCost + calculatedGlueBoronganSheet
    const subTotal = totalPaperPrice + calculatedPrintingCost + calculatedPrintingCost2 + calculatedFinishingCost + packing + shipping + biayaLain1Val + biayaLain2Val + glueTotal
    const profitAmount = subTotal * (profitPercent / 100)
    const grandTotal = subTotal + profitAmount
    const payload = {
      printName: formData.printName, customerName: formData.customerName, paperName: selectedPaper?.name || '',
      paperGrammage: selectedPaper?.grammage?.toString() || '0',
      paperLength: formData.paperLength, paperWidth: formData.paperWidth,
      cutWidth: formData.cutWidth, cutHeight: formData.cutHeight,
      quantity: formData.quantity, warna: formData.warna, warnaKhusus: formData.warnaKhusus,
      machineName: selectedMachine?.machineName || '',
      hargaPlat: parseFloat(formData.hargaPlat) || 0,
      ongkosCetak: calculatedPrintingCost,
      ongkosCetakDetail: selectedMachine ? `(Rp ${selectedMachine.pricePerColor.toLocaleString('id-ID')} × ${formData.warna || 0} warna)${parseInt(formData.warnaKhusus || '0') > 0 ? ` + (Rp ${selectedMachine.specialColorPrice.toLocaleString('id-ID')} × ${formData.warnaKhusus} khusus)` : ''}${parseInt(formData.quantity) > selectedMachine.minimumPrintQuantity ? ` + (${formData.quantity} - ${selectedMachine.minimumPrintQuantity}) × Rp ${selectedMachine.priceAboveMinimumPerSheet.toLocaleString('id-ID')}` : ''} + Rp ${selectedMachine.platePricePerSheet.toLocaleString('id-ID')} × ${parseInt(formData.warna || '0') + parseInt(formData.warnaKhusus || '0')} plat` : '',
      machineName2: selectedMachine2?.machineName || '',
      ongkosCetak2: calculatedPrintingCost2,
      ongkosCetak2Detail: selectedMachine2 ? `(Rp ${selectedMachine2.pricePerColor.toLocaleString('id-ID')} × ${formData.warna2 || 0} warna)${parseInt(formData.warnaKhusus2 || '0') > 0 ? ` + (Rp ${selectedMachine2.specialColorPrice.toLocaleString('id-ID')} × ${formData.warnaKhusus2} khusus)` : ''}${parseInt(formData.quantity) > selectedMachine2.minimumPrintQuantity ? ` + (${formData.quantity} - ${selectedMachine2.minimumPrintQuantity}) × Rp ${selectedMachine2.priceAboveMinimumPerSheet.toLocaleString('id-ID')}` : ''} + Rp ${selectedMachine2.platePricePerSheet.toLocaleString('id-ID')} × ${parseInt(formData.warna2 || '0') + parseInt(formData.warnaKhusus2 || '0')} plat` : '',
      totalPaperPrice,
      finishingNames: selectedFinishingItems.map(f => f.name).join(', '),
      finishingBreakdown: selectedFinishingItems.map(f => { const r = getFinishingCost(f); return `${f.name}: ${r.breakdown} = Rp ${r.cost.toLocaleString('id-ID')}` }).join(' | '),
      finishingCost: calculatedFinishingCost, packingCost: packing, shippingCost: shipping,
      biayaLain1: biayaLain1Val, biayaLain2: biayaLain2Val,
      glueCost: calculatedGlueCost, glueBoronganPerSheet: calculatedGlueBoronganSheet,
      subTotal, profitPercent, profitAmount, grandTotal
    }
    try {
      const res = await fetcher('/api/riwayat-cetakan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(payload)
      })
      if (res.ok) { toast.success('Riwayat hitung cetakan berhasil disimpan!') }
      else { toast.error('Gagal menyimpan riwayat') }
    } catch { toast.error('Gagal menyimpan riwayat') }
  }

  // Summary values
  const summaryPacking = parseFloat(formData.packingCost) || 0
  const summaryShipping = parseFloat(formData.shippingCost) || 0
  const summaryBiayaLain1 = parseFloat(formData.biayaLain1) || 0
  const summaryBiayaLain2 = parseFloat(formData.biayaLain2) || 0
  const summaryGlueTotal = calculatedGlueCost + calculatedGlueBoronganSheet
  const summarySubTotal = totalPaperPrice + calculatedPrintingCost + calculatedPrintingCost2 + calculatedFinishingCost + summaryPacking + summaryShipping + summaryBiayaLain1 + summaryBiayaLain2 + summaryGlueTotal
  const summaryProfitAmount = summarySubTotal * (profitPercent / 100)
  const summaryGrandTotal = summarySubTotal + summaryProfitAmount
  const summaryQuantity = parseInt(formData.quantity) || 0
  const summaryHargaPerlembar = summaryQuantity > 0 ? summaryGrandTotal / summaryQuantity : 0

  // Plat total helper
  const platTotal = (() => {
    const warna = parseInt(formData.warna) || 0
    const wk = parseInt(formData.warnaKhusus) || 0
    const plat = selectedMachine?.platePricePerSheet || 0
    return plat * (warna + wk)
  })()

  // Plat total helper 2
  const platTotal2 = (() => {
    const warna2 = parseInt(formData.warna2) || 0
    const wk2 = parseInt(formData.warnaKhusus2) || 0
    const plat2 = selectedMachine2?.platePricePerSheet || 0
    return plat2 * (warna2 + wk2)
  })()

  // Section header component
  const SectionHeader = ({ icon, label, badge }: { icon: React.ReactNode; label: string; badge?: number }) => (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-100 bg-slate-50/60">
      <div className="w-6 h-6 rounded-md bg-emerald-100 flex items-center justify-center">{icon}</div>
      <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">{label}</h2>
      {badge !== undefined && badge > 0 && (
        <span className="text-[11px] font-semibold text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded-full">{badge}</span>
      )}
    </div>
  )

  // Display value box
  const ValueBox = ({ label, value, gradient }: { label: string; value: string; gradient: string }) => (
    <div className={`w-full h-[32px] flex items-center justify-between px-2.5 ${gradient} border rounded-lg`}>
      <span className="text-[11px] font-medium text-slate-600">{label}</span>
      <span className="text-xs font-bold">{value}</span>
    </div>
  )

  return (
    <DashboardLayout title={t('hitung_cetakan')} subtitle={t('subtitle_potong_kertas')}>
      <div className="max-w-[1400px] mx-auto">
        <div className="lg:flex lg:h-[calc(100vh-8rem)] lg:gap-[19px]">

          {/* ========== COLUMN 1: INFO & HARGA ========== */}
          <div className="flex-1 lg:overflow-y-auto min-w-0 hide-scrollbar">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

              {/* Section 1: Informasi Cetakan */}
              <div className="flex items-center gap-2 px-2 py-2 border-b border-slate-100 bg-slate-50/60">
                <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center"><Users className="w-3.5 h-3.5 text-blue-600" /></div>
                <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Informasi Cetakan</h2>
              </div>
              <div className="px-2 py-1">
                <div className="space-y-1">
                  <div>
                    <label className={labelClass}>{t('nama_customer')} <span className="text-red-500">*</span></label>
                    <select value={formData.customerName} onChange={(e) => setFormData({ ...formData, customerName: e.target.value })} className={selectClass}>
                      <option value="">{t('pilih_customer')}</option>
                      {customers.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <div>
                      <label className={labelClass}>{t('nama_cetakan')} <span className="text-red-500">*</span></label>
                      <input type="text" placeholder="Nama cetakan" value={formData.printName} onChange={(e) => setFormData({ ...formData, printName: e.target.value })} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Jumlah Cetakan <span className="text-red-500">*</span></label>
                      <input type="number" placeholder="Contoh: 1000" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} className={inputClass} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Harga Bahan */}
              <SectionHeader icon={<FileText className="w-3.5 h-3.5 text-teal-600" />} label={t('harga_bahan')} />
              <div className="px-3 py-3 lg:p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-2.5 lg:gap-3">
                  <div>
                    <label className={labelClass}>Nama Bahan <span className="text-red-500">*</span></label>
                    <select value={formData.paperId} onChange={(e) => setFormData({ ...formData, paperId: e.target.value })} className={selectClass}>
                      <option value="">Pilih bahan kertas</option>
                      {papers.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.grammage} gsm)</option>)}
                    </select>

                  </div>
                  <div>
                    <label className={labelClass}>Uk. Bahan (P×L cm)</label>
                    <div className="flex gap-1.5 items-center">
                      <input type="number" step="0.1" placeholder="P" value={formData.paperLength} onChange={(e) => setFormData({ ...formData, paperLength: e.target.value })} className={inputClass} />
                      <span className="text-slate-400 text-xs">×</span>
                      <input type="number" step="0.1" placeholder="L" value={formData.paperWidth} onChange={(e) => setFormData({ ...formData, paperWidth: e.target.value })} className={inputClass} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Uk. Potong (P×L cm)</label>
                    <div className="flex gap-1.5 items-center">
                      <input type="number" step="0.1" placeholder="P" value={formData.cutWidth} onChange={(e) => setFormData({ ...formData, cutWidth: e.target.value })} className={inputClass} />
                      <span className="text-slate-400 text-xs">×</span>
                      <input type="number" step="0.1" placeholder="L" value={formData.cutHeight} onChange={(e) => setFormData({ ...formData, cutHeight: e.target.value })} className={inputClass} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Total Harga Kertas</label>
                    <ValueBox label={t('kertas')} value={totalPaperPrice > 0 ? `Rp ${totalPaperPrice.toLocaleString('id-ID')}` : 'Rp 0'} gradient="bg-gradient-to-r from-teal-50 to-emerald-50 border-teal-200" />
                  </div>
                </div>
              </div>

              {/* Section 3: Ongkos Cetak */}
              <SectionHeader icon={<Calculator className="w-3.5 h-3.5 text-purple-600" />} label={t('ongkos_cetak_label')} />
              <div className="px-3 py-3 lg:p-4">
                <div className="grid grid-cols-2 gap-2.5 lg:gap-3">
                  <div>
                    <label className={labelClass}>{t('nama_mesin')} <span className="text-red-500">*</span></label>
                    <select value={formData.machineId} onChange={(e) => setFormData({ ...formData, machineId: e.target.value })} className={selectClass}>
                      <option value="">Pilih mesin</option>
                      {printingCosts.map((m) => <option key={m.id} value={m.id}>{m.machineName}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Warna <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Palette className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input type="number" min="1" placeholder="4" value={formData.warna} onChange={(e) => setFormData({ ...formData, warna: e.target.value })} className={`${inputClass} pl-9`} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Warna Khusus</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-500">★</span>
                      <input type="number" min="0" placeholder="0" value={formData.warnaKhusus} onChange={(e) => setFormData({ ...formData, warnaKhusus: e.target.value })} className={`${inputClass} pl-9`} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>{t('harga_plat')}</label>
                    <ValueBox label="Plat" value={platTotal > 0 ? `Rp ${platTotal.toLocaleString('id-ID')}` : 'Rp 0'} gradient="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200" />
                  </div>
                  <div>
                    <label className={labelClass}>Total Ongkos</label>
                    <ValueBox label={t('ongkos_cetak_label')} value={calculatedPrintingCost > 0 ? `Rp ${calculatedPrintingCost.toLocaleString('id-ID')}` : 'Rp 0'} gradient="bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200" />
                  </div>
              </div>
              </div>

              {/* Section 4: Ongkos Cetak 2 */}
              <SectionHeader icon={<Calculator className="w-3.5 h-3.5 text-fuchsia-600" />} label="Ongkos Cetak 2" />
              <div className="px-3 py-3 lg:p-4">
                <div className="grid grid-cols-2 gap-2.5 lg:gap-3">
                  <div>
                    <label className={labelClass}>{t('nama_mesin')}</label>
                    <select value={formData.machineId2} onChange={(e) => setFormData({ ...formData, machineId2: e.target.value })} className={selectClass}>
                      <option value="">Pilih mesin</option>
                      {printingCosts.map((m) => <option key={m.id} value={m.id}>{m.machineName}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Warna</label>
                    <div className="relative">
                      <Palette className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input type="number" min="1" placeholder="4" value={formData.warna2} onChange={(e) => setFormData({ ...formData, warna2: e.target.value })} className={`${inputClass} pl-9`} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Warna Khusus</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-500">★</span>
                      <input type="number" min="0" placeholder="0" value={formData.warnaKhusus2} onChange={(e) => setFormData({ ...formData, warnaKhusus2: e.target.value })} className={`${inputClass} pl-9`} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>{t('harga_plat')}</label>
                    <ValueBox label="Plat 2" value={platTotal2 > 0 ? `Rp ${platTotal2.toLocaleString('id-ID')}` : 'Rp 0'} gradient="bg-gradient-to-r from-fuchsia-50 to-pink-50 border-fuchsia-200" />
                  </div>
                  <div>
                    <label className={labelClass}>Total Ongkos 2</label>
                    <ValueBox label="Ongkos Cetak 2" value={calculatedPrintingCost2 > 0 ? `Rp ${calculatedPrintingCost2.toLocaleString('id-ID')}` : 'Rp 0'} gradient="bg-gradient-to-r from-fuchsia-50 to-violet-50 border-fuchsia-200" />
                  </div>
              </div>
              </div>

              {/* Mobile-only: Finishing, Ongkos Lem, Ongkos Lem Borongan, Biaya Tambahan, Summary, Buttons */}
              <div className="lg:hidden">
              {/* Finishing */}
              <div>
                <SectionHeader icon={<Layers className="w-3.5 h-3.5 text-rose-600" />} label={t('finishing_label')} badge={selectedFinishingItems.length} />
                <div className="px-3 py-3">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <select id="finishing-select" className={selectClass} defaultValue="">
                        <option value="">-- Pilih finishing --</option>
                        {finishings.filter(f => !selectedFinishings.includes(f.id)).map((f) => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </select>
                    </div>
                    <Button onClick={() => {
                      const s = document.getElementById('finishing-select') as HTMLSelectElement
                      if (s && s.value) { handleAddFinishing(s.value); s.value = '' }
                      else toast.error('Pilih finishing terlebih dahulu')
                    }} className="h-[34px] px-3 bg-rose-600 hover:bg-rose-700 text-white text-xs" size="sm">
                      <Plus className="w-3.5 h-3.5 mr-1" /> Tambah
                    </Button>
                  </div>
                  {selectedFinishingItems.length > 0 && (
                    <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto">
                      {selectedFinishingItems.map((fin) => {
                        const { cost } = getFinishingCost(fin)
                        return (
                          <div key={fin.id} className="flex items-center gap-2 p-2 bg-rose-50/80 border border-rose-200 rounded-lg">
                            <div className="w-6 h-6 rounded bg-rose-100 flex items-center justify-center flex-shrink-0"><Layers className="w-3 h-3 text-rose-600" /></div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-slate-800 truncate">{fin.name}</p>
                            </div>
                            <span className="text-xs font-bold text-rose-700 flex-shrink-0">Rp {cost.toLocaleString('id-ID')}</span>
                            <button onClick={() => handleRemoveFinishing(fin.id)} className="w-5 h-5 rounded bg-white border border-rose-200 hover:bg-rose-100 flex items-center justify-center flex-shrink-0"><X className="w-3 h-3 text-rose-500" /></button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  <div className="mt-2">
                    <ValueBox label={`Finishing (${selectedFinishingItems.length} item)`} value={calculatedFinishingCost > 0 ? `Rp ${calculatedFinishingCost.toLocaleString('id-ID')}` : 'Rp 0'} gradient="bg-gradient-to-r from-rose-50 to-pink-50 border-rose-200" />
                  </div>
                </div>
              </div>

              {/* Ongkos Lem */}
              <SectionHeader icon={<Package className="w-3.5 h-3.5 text-cyan-600" />} label="Ongkos Lem" />
              <div className="px-3 py-3">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className={labelClass}>Cm yang mau dilem</label>
                    <div className="relative">
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">cm</span>
                      <input type="number" step="0.1" placeholder="0" value={formData.glueLengthCm} onChange={(e) => setFormData({ ...formData, glueLengthCm: e.target.value })} className={`${inputClass} pr-9`} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Harga Lem per cm</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">Rp</span>
                      <input type="number" step="0.01" placeholder="0" value={formData.glueCostPerCm} onChange={(e) => setFormData({ ...formData, glueCostPerCm: e.target.value })} className={`${inputClass} pl-9`} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Total Ongkos Lem</label>
                    <ValueBox label="Total Lem" value={calculatedGlueCost > 0 ? `Rp ${Math.round(calculatedGlueCost).toLocaleString('id-ID')}` : 'Rp 0'} gradient="bg-gradient-to-r from-cyan-50 to-sky-50 border-cyan-200" />
                  </div>
                </div>
              </div>

              {/* Ongkos Lem Borongan moved to right column (desktop) */}
              {/* Mobile-only Ongkos Lem Borongan */}
              <div className="lg:hidden">
                <SectionHeader icon={<Package className="w-3.5 h-3.5 text-indigo-600" />} label="Ongkos Lem Borongan" />
                <div className="px-3 py-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelClass}>Harga Lem per Lembar</label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">Rp</span>
                        <input type="number" step="0.01" placeholder="0" value={formData.glueBoronganPerSheet} onChange={(e) => setFormData({ ...formData, glueBoronganPerSheet: e.target.value })} className={`${inputClass} pl-9`} />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Total Harga Lem per Lembar</label>
                      <ValueBox label="Total Borongan" value={calculatedGlueBoronganSheet > 0 ? `Rp ${Math.round(calculatedGlueBoronganSheet).toLocaleString('id-ID')}` : 'Rp 0'} gradient="bg-gradient-to-r from-indigo-50 to-violet-50 border-indigo-200" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Biaya Tambahan moved to right column (desktop) */}
              {/* Mobile-only Biaya Tambahan */}
              <div className="lg:hidden">
                <SectionHeader icon={<Banknote className="w-3.5 h-3.5 text-amber-600" />} label="Biaya Tambahan" />
                <div className="px-2 py-1">
                  <div className="grid grid-cols-2 gap-1">
                    <div>
                      <label className={labelClass}>{t('ongkos_packing')}</label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">Rp</span>
                        <input type="number" placeholder="0" value={formData.packingCost} onChange={(e) => setFormData({ ...formData, packingCost: e.target.value })} className={`${inputClass} pl-9`} />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>{t('ongkos_kirim')}</label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">Rp</span>
                        <input type="number" placeholder="0" value={formData.shippingCost} onChange={(e) => setFormData({ ...formData, shippingCost: e.target.value })} className={`${inputClass} pl-9`} />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Biaya Lain-lain 1</label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">Rp</span>
                        <input type="number" placeholder="0" value={formData.biayaLain1} onChange={(e) => setFormData({ ...formData, biayaLain1: e.target.value })} className={`${inputClass} pl-9`} />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Biaya Lain-lain 2</label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">Rp</span>
                        <input type="number" placeholder="0" value={formData.biayaLain2} onChange={(e) => setFormData({ ...formData, biayaLain2: e.target.value })} className={`${inputClass} pl-9`} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile-only: Summary + Buttons */}
              <div className="lg:hidden mx-3 mb-3 space-y-2">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-slate-600">Sub Total</span>
                    <span className="text-sm font-bold text-slate-700">Rp {summarySubTotal.toLocaleString('id-ID')}</span>
                  </div>
                </div>
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5"><Percent className="w-3.5 h-3.5 text-amber-600" /><span className="text-xs font-medium text-amber-800">Profit ({profitPercent}%)</span></div>
                    <span className="text-xs font-bold text-amber-700">Rp {summaryProfitAmount.toLocaleString('id-ID')}</span>
                  </div>
                </div>
                <div className="p-3 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-white">Total Hitung Cetakan</span>
                    <span className="text-lg font-extrabold text-white">Rp {summaryGrandTotal.toLocaleString('id-ID')}</span>
                  </div>
                  {summaryQuantity > 0 && (
                    <div className="flex justify-between items-center mt-1.5 pt-1.5 border-t border-white/30">
                      <span className="text-[10px] font-medium text-emerald-100">Harga Perlembar</span>
                      <span className="text-lg font-extrabold text-white">Rp {summaryHargaPerlembar.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="lg:hidden px-3 pb-3 flex flex-col sm:flex-row gap-2">
                <Button onClick={handleSaveRiwayat} className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700 text-sm"><Save className="w-4 h-4 mr-1.5" /> Simpan Riwayat</Button>
                <Button onClick={handleAddCalculation} className="flex-1 h-10 text-sm"><Plus className="w-4 h-4 mr-1.5" /> Tambah</Button>
                <Button onClick={resetForm} variant="outline" className="flex-1 h-10 text-sm"><RotateCcw className="w-4 h-4 mr-1.5" /> Reset</Button>
              </div>
              </div>{/* end mobile-only wrapper */}
            </div>{/* end column 1 card */}
          </div>{/* end COLUMN 1 */}

          {/* ========== COLUMN 2: FINISHING & ONGKOS LEM (Desktop Only) ========== */}
          <div className="hidden lg:flex flex-col flex-1 flex-shrink-0 gap-3 h-full">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              {/* Finishing */}
              <SectionHeader icon={<Layers className="w-3.5 h-3.5 text-rose-600" />} label={t('finishing_label')} badge={selectedFinishingItems.length} />
              <div className="p-3 space-y-2.5">
                <div className="flex gap-2">
                  <select id="finishing-select-desktop" className={selectClass} defaultValue="">
                    <option value="">-- Pilih finishing --</option>
                    {finishings.filter(f => !selectedFinishings.includes(f.id)).map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                  <Button onClick={() => {
                    const s = document.getElementById('finishing-select-desktop') as HTMLSelectElement
                    if (s && s.value) { handleAddFinishing(s.value); s.value = '' }
                    else toast.error('Pilih finishing terlebih dahulu')
                  }} className="h-[30px] px-2.5 bg-rose-600 hover:bg-rose-700 text-white text-[11px]" size="sm">
                    <Plus className="w-3 h-3 mr-0.5" /> Tambah
                  </Button>
                </div>
                {selectedFinishingItems.length > 0 && (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {selectedFinishingItems.map((fin) => {
                      const { cost } = getFinishingCost(fin)
                      return (
                        <div key={fin.id} className="flex items-center gap-1.5 p-1.5 bg-rose-50/80 border border-rose-200 rounded-lg">
                          <div className="w-5 h-5 rounded bg-rose-100 flex items-center justify-center flex-shrink-0"><Layers className="w-2.5 h-2.5 text-rose-600" /></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-medium text-slate-800 truncate">{fin.name}</p>
                          </div>
                          <span className="text-[11px] font-bold text-rose-700 flex-shrink-0">Rp {cost.toLocaleString('id-ID')}</span>
                          <button onClick={() => handleRemoveFinishing(fin.id)} className="w-4 h-4 rounded bg-white border border-rose-200 hover:bg-rose-100 flex items-center justify-center flex-shrink-0"><X className="w-2.5 h-2.5 text-rose-500" /></button>
                        </div>
                      )
                    })}
                  </div>
                )}
                <ValueBox label={`Finishing (${selectedFinishingItems.length} item)`} value={calculatedFinishingCost > 0 ? `Rp ${calculatedFinishingCost.toLocaleString('id-ID')}` : 'Rp 0'} gradient="bg-gradient-to-r from-rose-50 to-pink-50 border-rose-200" />
              </div>

              {/* Ongkos Lem */}
              <SectionHeader icon={<Package className="w-3.5 h-3.5 text-cyan-600" />} label="Ongkos Lem" />
              <div className="p-3">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className={labelClass}>Cm dilem</label>
                    <div className="relative">
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">cm</span>
                      <input type="number" step="0.1" placeholder="0" value={formData.glueLengthCm} onChange={(e) => setFormData({ ...formData, glueLengthCm: e.target.value })} className={`${inputClass} pr-9`} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Harga/cm</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">Rp</span>
                      <input type="number" step="0.01" placeholder="0" value={formData.glueCostPerCm} onChange={(e) => setFormData({ ...formData, glueCostPerCm: e.target.value })} className={`${inputClass} pl-9`} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Total</label>
                    <ValueBox label="Total Lem" value={calculatedGlueCost > 0 ? `Rp ${Math.round(calculatedGlueCost).toLocaleString('id-ID')}` : 'Rp 0'} gradient="bg-gradient-to-r from-cyan-50 to-sky-50 border-cyan-200" />
                  </div>
                </div>
              </div>

              {/* Ongkos Lem Borongan */}
              <SectionHeader icon={<Package className="w-3.5 h-3.5 text-indigo-600" />} label="Ongkos Lem Borongan" />
              <div className="p-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelClass}>Harga/Lembar</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">Rp</span>
                      <input type="number" step="0.01" placeholder="0" value={formData.glueBoronganPerSheet} onChange={(e) => setFormData({ ...formData, glueBoronganPerSheet: e.target.value })} className={`${inputClass} pl-9`} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Total Harga</label>
                    <ValueBox label="Total Borongan" value={calculatedGlueBoronganSheet > 0 ? `Rp ${Math.round(calculatedGlueBoronganSheet).toLocaleString('id-ID')}` : 'Rp 0'} gradient="bg-gradient-to-r from-indigo-50 to-violet-50 border-indigo-200" />
                  </div>
                </div>
              </div>

            </div>
          </div>{/* end COLUMN 2 */}

          {/* ========== COLUMN 3: SUMMARY & DAFTAR (Desktop Only) ========== */}
          <div className="hidden lg:flex flex-col flex-1 flex-shrink-0 gap-3 h-full">
            {/* Biaya Tambahan */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <SectionHeader icon={<Banknote className="w-3.5 h-3.5 text-amber-600" />} label="Biaya Tambahan" />
              <div className="px-2 py-1">
                <div className="grid grid-cols-2 gap-1">
                  <div>
                    <label className={labelClass}>{t('ongkos_packing')}</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">Rp</span>
                      <input type="number" placeholder="0" value={formData.packingCost} onChange={(e) => setFormData({ ...formData, packingCost: e.target.value })} className={`${inputClass} pl-9`} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>{t('ongkos_kirim')}</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">Rp</span>
                      <input type="number" placeholder="0" value={formData.shippingCost} onChange={(e) => setFormData({ ...formData, shippingCost: e.target.value })} className={`${inputClass} pl-9`} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Biaya Lain-lain 1</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">Rp</span>
                      <input type="number" placeholder="0" value={formData.biayaLain1} onChange={(e) => setFormData({ ...formData, biayaLain1: e.target.value })} className={`${inputClass} pl-9`} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Biaya Lain-lain 2</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">Rp</span>
                      <input type="number" placeholder="0" value={formData.biayaLain2} onChange={(e) => setFormData({ ...formData, biayaLain2: e.target.value })} className={`${inputClass} pl-9`} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Summary Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
              <div className="p-3 space-y-2">
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-medium text-slate-600">Sub Total</span>
                    <span className="text-sm font-bold text-slate-700">Rp {summarySubTotal.toLocaleString('id-ID')}</span>
                  </div>
                </div>
                <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5"><Percent className="w-3.5 h-3.5 text-amber-600" /><span className="text-[11px] font-medium text-amber-800">Profit ({profitPercent}%)</span></div>
                    <span className="text-xs font-bold text-amber-700">Rp {summaryProfitAmount.toLocaleString('id-ID')}</span>
                  </div>
                </div>
                <div className="p-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-semibold text-emerald-100">Total</span>
                    <span className="text-sm font-extrabold text-white">Rp {summaryGrandTotal.toLocaleString('id-ID')}</span>
                  </div>
                  {summaryQuantity > 0 && (
                    <div className="flex justify-between items-center mt-1 pt-1 border-t border-white/30">
                      <span className="text-[9px] font-medium text-emerald-100">Harga Perlembar</span>
                      <span className="text-sm font-extrabold text-white">Rp {summaryHargaPerlembar.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="px-3 pb-3 flex flex-col gap-1.5 mt-auto">
                <Button onClick={handleSaveRiwayat} className="w-full h-8 bg-emerald-600 hover:bg-emerald-700 text-[11px]"><Save className="w-3.5 h-3.5 mr-1" /> Simpan Riwayat</Button>
                <Button onClick={handleAddCalculation} className="w-full h-8 text-[11px]"><Plus className="w-3.5 h-3.5 mr-1" /> Tambah Cetakan</Button>
                <Button onClick={resetForm} variant="outline" className="w-full h-8 text-[11px]"><RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset Form</Button>
              </div>
            </div>

            {/* Daftar Cetakan */}
            {calculations.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col min-h-0">
                <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between flex-shrink-0">
                  <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Daftar Cetakan</span>
                  <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">{calculations.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-slate-50 ">
                  {calculations.map((calc) => (
                    <div key={calc.id} className="px-3 py-2 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">{calc.printName}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5 truncate">{calc.paperName} · {parseInt(calc.quantity).toLocaleString('id-ID')} lbr · {calc.paperLength}×{calc.paperWidth}cm</p>
                          {calc.finishingName && <p className="text-[11px] text-rose-500 truncate">{calc.finishingName}</p>}
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className="text-xs font-bold text-emerald-600">Rp {calc.totalPrice.toLocaleString('id-ID')}</span>
                          <div className="flex gap-0.5">
                            <button onClick={() => { setPreviewCalc(calc); setPreviewOpen(true) }} className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-violet-600 hover:bg-violet-50"><Eye className="w-3 h-3" /></button>
                            <button onClick={() => handlePrint(calc)} className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50"><Printer className="w-3 h-3" /></button>
                            <button onClick={() => handleDeleteCalculation(calc.id)} className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t border-slate-200 bg-emerald-50 flex justify-between items-center flex-shrink-0">
                  <span className="text-[11px] font-semibold text-emerald-800">Total</span>
                  <span className="text-sm font-bold text-emerald-700">Rp {calculations.reduce((s, c) => s + c.totalPrice, 0).toLocaleString('id-ID')}</span>
                </div>
              </div>
            )}
          </div>

            {/* Mobile Daftar Cetakan */}
            {calculations.length > 0 && (
              <div className="lg:hidden mt-4 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-emerald-100 flex items-center justify-center"><FileText className="w-3.5 h-3.5 text-emerald-600" /></div>
                    <h2 className="text-sm font-semibold text-slate-800">Daftar Cetakan</h2>
                  </div>
                  <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{calculations.length} item</span>
                </div>
                <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto ">
                  {calculations.map((calc) => (
                    <div key={calc.id} className="p-4 hover:bg-slate-50/60">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-slate-800 truncate">{calc.printName}</h3>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mt-1.5">
                            <div className="flex items-center gap-1.5"><Ruler className="w-3 h-3 text-slate-400" /><span className="text-slate-500">Ukuran:</span><span className="font-medium text-slate-700">{calc.paperLength}×{calc.paperWidth}</span></div>
                            <div className="flex items-center gap-1.5"><Layers className="w-3 h-3 text-slate-400" /><span className="text-slate-500">Jumlah:</span><span className="font-medium text-slate-700">{parseInt(calc.quantity).toLocaleString('id-ID')} lbr</span></div>
                            <div className="flex items-center gap-1.5"><FileText className="w-3 h-3 text-slate-400" /><span className="text-slate-500">Bahan:</span><span className="font-medium text-slate-700 truncate">{calc.paperName}</span></div>
                            <div className="flex items-center gap-1.5"><Cog className="w-3 h-3 text-slate-400" /><span className="text-slate-500">Mesin:</span><span className="font-medium text-slate-700">{calc.machineName}</span></div>
                            <div className="flex items-center gap-1.5"><Palette className="w-3 h-3 text-slate-400" /><span className="text-slate-500">Warna:</span><span className="font-medium text-slate-700">{calc.warna}{calc.warnaKhusus && parseInt(calc.warnaKhusus) > 0 ? `+${calc.warnaKhusus} khusus` : ''}</span></div>
                            {calc.finishingName && <div className="flex items-center gap-1.5"><Layers className="w-3 h-3 text-slate-400" /><span className="text-slate-500">Finishing:</span><span className="font-medium text-slate-700">{calc.finishingName}</span></div>}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <span className="text-sm font-bold text-emerald-600">Rp {calc.totalPrice.toLocaleString('id-ID')}</span>
                          <div className="flex gap-1">
                            <Button onClick={() => { setPreviewCalc(calc); setPreviewOpen(true) }} variant="outline" size="sm" className="h-7 text-[11px] text-violet-600"><Eye className="w-3 h-3" /></Button>
                            <Button onClick={() => handlePrint(calc)} variant="outline" size="sm" className="h-7 text-[11px]"><Printer className="w-3 h-3" /></Button>
                            <Button onClick={() => handleDeleteCalculation(calc.id)} variant="outline" size="sm" className="h-7 text-[11px] text-red-600"><Trash2 className="w-3 h-3" /></Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t border-slate-200 bg-emerald-50 flex justify-between items-center">
                  <span className="text-xs font-semibold text-emerald-800">Total ({calculations.length} item)</span>
                  <span className="text-lg font-bold text-emerald-700">Rp {calculations.reduce((s, c) => s + c.totalPrice, 0).toLocaleString('id-ID')}</span>
                </div>
              </div>
            )}

        </div>
      </div>

      {/* ===== PREVIEW DIALOG ===== */}
      <Dialog open={previewOpen} onOpenChange={(open) => { setPreviewOpen(open); if (!open) setPreviewCalc(null) }}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0 ">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>Preview Hitung Cetakan</DialogTitle>
          </DialogHeader>
          {previewCalc && (
            <div ref={previewRef} className="p-4 bg-white">
              <div className="text-center mb-4 pb-3 border-b-2 border-slate-200">
                <h1 className="text-lg font-bold text-slate-900">Preview Hitung Cetakan</h1>
                <p className="text-xs text-slate-500 mt-0.5">{previewCalc.printName} · {previewCalc.paperName} · {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                  <p className="text-[11px] text-blue-600 font-medium">Jumlah Cetakan</p>
                  <p className="text-xl font-bold text-blue-700">{parseInt(previewCalc.quantity).toLocaleString('id-ID')} <span className="text-xs font-normal">lembar</span></p>
                </div>
                <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
                  <p className="text-[11px] text-purple-600 font-medium">Ukuran Bahan</p>
                  <p className="text-xl font-bold text-purple-700">{previewCalc.paperLength} × {previewCalc.paperWidth} <span className="text-xs font-normal">cm</span></p>
                </div>
                <div className="bg-violet-50 border border-violet-100 rounded-lg p-3">
                  <p className="text-[11px] text-violet-600 font-medium">{t('nama_mesin')}</p>
                  <p className="text-sm font-bold text-violet-700">{previewCalc.machineName}</p>
                </div>
                <div className="bg-rose-50 border border-rose-100 rounded-lg p-3">
                  <p className="text-[11px] text-rose-600 font-medium">Warna</p>
                  <p className="text-sm font-bold text-rose-700">{previewCalc.warna} warna{previewCalc.warnaKhusus && parseInt(previewCalc.warnaKhusus) > 0 ? ` + ${previewCalc.warnaKhusus} khusus` : ''}</p>
                </div>
                <div className="bg-orange-50 border border-orange-100 rounded-lg p-3">
                  <p className="text-[11px] text-orange-600 font-medium">{t('ongkos_cetak_label')}</p>
                  <p className="text-lg font-bold text-orange-700">Rp {previewCalc.printingCost.toLocaleString('id-ID')}</p>

                </div>
                <div className="bg-teal-50 border border-teal-100 rounded-lg p-3">
                  <p className="text-[11px] text-teal-600 font-medium">Harga Kertas</p>
                  <p className="text-lg font-bold text-teal-700">Rp {((parseFloat(previewCalc.pricePerSheet) || 0) * (parseInt(previewCalc.quantity) || 0)).toLocaleString('id-ID')}</p>
                </div>
              </div>
              {previewCalc.finishingName && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg">
                  <p className="text-[11px] font-bold text-rose-700 mb-1">{t('finishing_label')}:</p>
                  <p className="text-xs text-rose-600 font-medium">{previewCalc.finishingName}</p>
                </div>
              )}
              <div className="mb-4">
                <h3 className="text-xs font-bold text-slate-700 mb-2">Biaya Tambahan</h3>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs"><span className="text-slate-500">{t('ongkos_packing')}</span><span className="font-medium text-slate-700">{previewCalc.packingCost && parseInt(previewCalc.packingCost) > 0 ? `Rp ${parseInt(previewCalc.packingCost).toLocaleString('id-ID')}` : '-'}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-slate-500">{t('ongkos_kirim')}</span><span className="font-medium text-slate-700">{previewCalc.shippingCost && parseInt(previewCalc.shippingCost) > 0 ? `Rp ${parseInt(previewCalc.shippingCost).toLocaleString('id-ID')}` : '-'}</span></div>
                </div>
              </div>
              <div className="p-4 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-white">Total Harga</span>
                  <span className="text-2xl font-extrabold text-white">Rp {previewCalc.totalPrice.toLocaleString('id-ID')}</span>
                </div>
                {(() => {
                  const previewQty = parseInt(previewCalc.quantity) || 0
                  const previewHPL = previewQty > 0 ? previewCalc.totalPrice / previewQty : 0
                  return previewQty > 0 ? (
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/30">
                      <span className="text-xs font-medium text-emerald-100">Harga Perlembar</span>
                      <span className="text-2xl font-extrabold text-white">Rp {previewHPL.toLocaleString('id-ID', { maximumFractionDigits: 0 })}</span>
                    </div>
                  ) : null
                })()}
              </div>
            </div>
          )}
          <div className="sticky bottom-0 bg-white border-t border-slate-200 p-4 flex gap-3">
            <button onClick={() => { if (previewCalc) handlePrint(previewCalc) }} className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors">
              <Printer className="w-4 h-4" /> Cetak
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
