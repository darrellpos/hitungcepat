'use client'

import { FileText, Printer, RotateCcw, Calculator, Info, Scissors, Palette, Plus, X, Droplets, Layers } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { getAuthHeaders } from '@/lib/auth'
import { fetcher } from '@/lib/fetcher'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/language-context'

// === Interfaces ===
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

// === CSS Classes ===
const inputClass = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors'
const selectClass = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors bg-white appearance-none cursor-pointer'
const labelClass = 'flex items-center gap-1.5 text-xs font-medium text-slate-700 mb-1.5'

export default function HitungOngkosCetakPage() {
  const { t } = useLanguage()

  // === Data states ===
  const [papers, setPapers] = useState<Paper[]>([])
  const [printingCosts, setPrintingCosts] = useState<PrintingCost[]>([])
  const [finishings, setFinishings] = useState<Finishing[]>([])

  // === Form states ===
  const [namaCetakan, setNamaCetakan] = useState('')
  const [selectedPaperId, setSelectedPaperId] = useState('')
  const [customGrammage, setCustomGrammage] = useState('')
  const [customWidth, setCustomWidth] = useState('')
  const [customHeight, setCustomHeight] = useState('')
  const [customPricePerRim, setCustomPricePerRim] = useState('')
  const [selectedMachineId, setSelectedMachineId] = useState('')
  const [jumlahWarna, setJumlahWarna] = useState('')
  const [warnaKhusus, setWarnaKhusus] = useState('')
  const [hargaPlat, setHargaPlat] = useState('')
  const [selectedFinishingIds, setSelectedFinishingIds] = useState<string[]>([])
  const [panjangLem, setPanjangLem] = useState('')
  const [hargaLemPerCm, setHargaLemPerCm] = useState('')
  const [jumlahLembar, setJumlahLembar] = useState('')
  const [hargaKertasPerLembar, setHargaKertasPerLembar] = useState('')

  // === Fetch APIs ===
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [papersRes, printingRes, finishingsRes] = await Promise.all([
          fetcher('/api/papers', { headers: getAuthHeaders() }),
          fetcher('/api/printing-costs', { headers: getAuthHeaders() }),
          fetcher('/api/finishings', { headers: getAuthHeaders() }),
        ])
        const [papersData, printingData, finishingsData] = await Promise.all([
          papersRes.json(),
          printingRes.json(),
          finishingsRes.json(),
        ])
        if (Array.isArray(papersData)) setPapers(papersData)
        if (Array.isArray(printingData)) setPrintingCosts(printingData)
        if (Array.isArray(finishingsData)) setFinishings(finishingsData)
      } catch (error) {
        console.error('Error fetching data:', error)
      }
    }
    fetchAll()
  }, [])

  // === Derived values ===
  const selectedPaper = papers.find(p => p.id === selectedPaperId) || null
  const isCustom = selectedPaperId === '__custom__'
  const selectedMachine = printingCosts.find(m => m.id === selectedMachineId) || null

  const grammage = selectedPaper ? selectedPaper.grammage : (parseFloat(customGrammage) || 0)
  const paperWidth = selectedPaper ? selectedPaper.width : (parseFloat(customWidth) || 0)
  const paperHeight = selectedPaper ? selectedPaper.height : (parseFloat(customHeight) || 0)
  const pricePerRim = selectedPaper ? selectedPaper.pricePerRim : (parseFloat(customPricePerRim) || 0)
  const qty = parseInt(jumlahLembar) || 0
  const warna = parseInt(jumlahWarna) || 0
  const warnaKhususVal = parseInt(warnaKhusus) || 0
  const plat = parseFloat(hargaPlat) || 0
  const lemCm = parseFloat(panjangLem) || 0
  const lemPricePerCm = parseFloat(hargaLemPerCm) || 0
  const pricePerSheet = parseFloat(hargaKertasPerLembar) || 0
  const selectedFinishingItems = selectedFinishingIds.map(id => finishings.find(f => f.id === id)).filter(Boolean) as Finishing[]

  // Auto-fill hargaPlat when machine changes
  useEffect(() => {
    if (selectedMachine && !hargaPlat) {
      setHargaPlat(selectedMachine.platePricePerSheet?.toString() || '')
    }
  }, [selectedMachine])

  // Auto-fill hargaKertasPerLembar when paper changes
  useEffect(() => {
    if (selectedPaper && !hargaKertasPerLembar) {
      setHargaKertasPerLembar((selectedPaper.pricePerRim / 500).toFixed(2))
    }
  }, [selectedPaper])

  // === Calculations ===
  const calculations = useMemo(() => {
    // Paper cost
    const autoPricePerSheet = pricePerRim > 0 ? pricePerRim / 500 : 0
    const effectivePricePerSheet = pricePerSheet > 0 ? pricePerSheet : autoPricePerSheet
    const totalPaperCost = effectivePricePerSheet * qty

    // Printing cost
    let ongkosCetak = 0
    if (selectedMachine && qty > 0 && warna > 0) {
      ongkosCetak += (selectedMachine.pricePerColor * warna) + (selectedMachine.specialColorPrice * warnaKhususVal)
      if (qty > selectedMachine.minimumPrintQuantity) {
        ongkosCetak += (qty - selectedMachine.minimumPrintQuantity) * selectedMachine.priceAboveMinimumPerSheet
      }
      ongkosCetak += plat * (warna + warnaKhususVal)
    }

    // Finishing cost
    let totalFinishing = 0
    selectedFinishingItems.forEach(fin => {
      const isPond = fin.name.toLowerCase().includes('pond')
      if (isPond) {
        if (qty <= fin.minimumSheets) {
          totalFinishing += fin.minimumPrice
        } else {
          totalFinishing += fin.minimumPrice + (qty - fin.minimumSheets) * fin.additionalPrice
        }
      } else {
        let part1 = 0
        if (qty > fin.minimumSheets && fin.additionalPrice > 0) {
          part1 = (qty - fin.minimumSheets) * fin.additionalPrice
        }
        let part2 = 0
        if (paperWidth > 0 && paperHeight > 0 && fin.pricePerCm > 0) {
          part2 = paperWidth * paperHeight * fin.pricePerCm * qty
        }
        const total = part1 + part2
        totalFinishing += Math.max(total, fin.minimumPrice)
      }
    })

    // Glue cost
    const glueCost = (lemCm > 0 && lemPricePerCm > 0 && qty > 0) ? lemCm * lemPricePerCm * qty : 0

    // Total
    const totalOngkosCetak = totalPaperCost + ongkosCetak + totalFinishing + glueCost
    const hargaPerLembar = qty > 0 ? totalOngkosCetak / qty : 0

    return {
      effectivePricePerSheet,
      totalPaperCost,
      ongkosCetak,
      totalFinishing,
      glueCost,
      totalOngkosCetak,
      hargaPerLembar,
    }
  }, [pricePerRim, pricePerSheet, qty, selectedMachine, warna, warnaKhususVal, plat, selectedFinishingItems, lemCm, lemPricePerCm, paperWidth, paperHeight])

  // === Handlers ===
  const handleAddFinishing = (finishingId: string) => {
    if (finishingId && !selectedFinishingIds.includes(finishingId)) {
      setSelectedFinishingIds([...selectedFinishingIds, finishingId])
      toast.success('Finishing berhasil ditambahkan')
    } else if (selectedFinishingIds.includes(finishingId)) {
      toast.error('Finishing ini sudah ditambahkan')
    }
  }

  const handleRemoveFinishing = (finishingId: string) => {
    setSelectedFinishingIds(selectedFinishingIds.filter(id => id !== finishingId))
    toast.success('Finishing berhasil dihapus')
  }

  const handleReset = () => {
    setNamaCetakan('')
    setSelectedPaperId('')
    setCustomGrammage('')
    setCustomWidth('')
    setCustomHeight('')
    setCustomPricePerRim('')
    setSelectedMachineId('')
    setJumlahWarna('')
    setWarnaKhusus('')
    setHargaPlat('')
    setSelectedFinishingIds([])
    setPanjangLem('')
    setHargaLemPerCm('')
    setJumlahLembar('')
    setHargaKertasPerLembar('')
    toast.success('Form berhasil direset')
  }

  const handlePrint = () => {
    if (qty <= 0) { toast.error('Masukkan jumlah lembar terlebih dahulu'); return }
    const printWindow = window.open('', '', 'height=900,width=700')
    if (!printWindow) { toast.error('Gagal membuka jendela print'); return }
    const now = new Date().toLocaleString('id-ID')
    const paperName = selectedPaper ? selectedPaper.name : (isCustom ? 'Custom' : '-')
    const machineName = selectedMachine?.machineName || '-'
    const finishingNames = selectedFinishingItems.map(f => f.name).join(', ') || '-'
    const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Hitung Ongkos Cetak</title>
      <style>
        @page { size: A4; margin: 10mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #1e293b; width: 190mm; min-height: 277mm; }
        .page { width: 100%; min-height: 100%; display: flex; flex-direction: column; }
        .header { text-align: center; padding-bottom: 10px; border-bottom: 2px solid #e2e8f0; margin-bottom: 14px; }
        .header h1 { font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 2px; }
        .header .subtitle { font-size: 11px; color: #64748b; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px; }
        .info-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px; }
        .info-item .label { font-size: 9px; color: #64748b; font-weight: 500; }
        .info-item .value { font-size: 12px; font-weight: 700; color: #1e293b; margin-top: 1px; }
        .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; padding: 6px 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
        .detail-table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 10px; }
        .detail-table th { background: #f1f5f9; padding: 5px 8px; text-align: left; font-weight: 600; border: 1px solid #e2e8f0; font-size: 9px; text-transform: uppercase; color: #475569; }
        .detail-table td { padding: 5px 8px; border: 1px solid #e2e8f0; }
        .detail-table tr:nth-child(even) td { background: #f8fafc; }
        .text-right { text-align: right; }
        .text-bold { font-weight: 700; }
        .value-box { height: 28px; display: flex; align-items: center; justify-content: space-between; padding: 0 8px; border-radius: 6px; border: 1px solid; margin-bottom: 6px; }
        .value-box .lbl { font-size: 9px; font-weight: 500; color: #475569; }
        .value-box .val { font-size: 10px; font-weight: 700; color: #1e293b; }
        .total-card { background: linear-gradient(135deg, #f59e0b, #ea580c); border-radius: 10px; padding: 14px; color: white; margin-top: 10px; }
        .total-card .row1 { display: flex; justify-content: space-between; align-items: center; }
        .total-card .row1 .label { font-size: 12px; font-weight: 600; }
        .total-card .row1 .value { font-size: 18px; font-weight: 800; }
        .total-card .divider { height: 1px; background: rgba(255,255,255,0.25); margin: 8px 0; }
        .total-card .row2 { display: flex; justify-content: space-between; align-items: center; }
        .total-card .row2 .label { font-size: 9px; opacity: 0.8; }
        .total-card .row2 .value { font-size: 11px; font-weight: 700; }
        .footer { text-align: center; padding-top: 10px; border-top: 1px solid #e2e8f0; margin-top: auto; }
        .footer p { font-size: 9px; color: #94a3b8; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style></head><body>
      <div class="page">
        <div class="header">
          <h1>Hitung Ongkos Cetak</h1>
          <div class="subtitle">${namaCetakan || 'Tanpa Nama'} · Dicetak: ${now}</div>
        </div>

        <div class="info-grid">
          <div class="info-item"><div class="label">Nama Cetakan</div><div class="value">${namaCetakan || '-'}</div></div>
          <div class="info-item"><div class="label">Jumlah Lembar</div><div class="value">${qty.toLocaleString('id-ID')} lbr</div></div>
          <div class="info-item"><div class="label">Bahan Kertas</div><div class="value">${paperName}${grammage > 0 ? ` (${grammage} gsm)` : ''}</div></div>
          <div class="info-item"><div class="label">Mesin Cetak</div><div class="value">${machineName}</div></div>
        </div>

        <div class="section-title">&#9432; Rincian Biaya</div>
        <table class="detail-table">
          <thead><tr><th>Keterangan</th><th class="text-right">Nilai</th></tr></thead>
          <tbody>
            <tr><td>Harga Kertas / Lembar</td><td class="text-right">${fmt(calculations.effectivePricePerSheet)}</td></tr>
            <tr><td>Total Harga Kertas (${qty.toLocaleString('id-ID')} lbr)</td><td class="text-right text-bold">${fmt(calculations.totalPaperCost)}</td></tr>
            <tr><td>Ongkos Cetak (${warna} warna${warnaKhususVal > 0 ? ` + ${warnaKhususVal} khusus` : ''})</td><td class="text-right text-bold">${fmt(calculations.ongkosCetak)}</td></tr>
            <tr><td>Finishing (${finishingNames})</td><td class="text-right text-bold">${fmt(calculations.totalFinishing)}</td></tr>
            <tr><td>Ongkos Lem${lemCm > 0 ? ` (${lemCm} cm × ${fmt(lemPricePerCm)}/cm × ${qty.toLocaleString('id-ID')})` : ''}</td><td class="text-right">${calculations.glueCost > 0 ? fmt(calculations.glueCost) : '-'}</td></tr>
          </tbody>
        </table>

        <div class="value-box" style="background:#eff6ff;border-color:#bfdbfe;">
          <span class="lbl">Harga Kertas / Lembar</span>
          <span class="val">${fmt(calculations.effectivePricePerSheet)}</span>
        </div>
        <div class="value-box" style="background:#dcfce7;border-color:#bbf7d0;">
          <span class="lbl">Total Harga Kertas</span>
          <span class="val">${fmt(calculations.totalPaperCost)}</span>
        </div>
        <div class="value-box" style="background:#f3e8ff;border-color:#e9d5ff;">
          <span class="lbl">Ongkos Cetak</span>
          <span class="val">${fmt(calculations.ongkosCetak)}</span>
        </div>
        <div class="value-box" style="background:#fef3c7;border-color:#fde68a;">
          <span class="lbl">Total Finishing</span>
          <span class="val">${fmt(calculations.totalFinishing)}</span>
        </div>
        <div class="value-box" style="background:#ecfeff;border-color:#a5f3fc;">
          <span class="lbl">Ongkos Lem</span>
          <span class="val">${calculations.glueCost > 0 ? fmt(calculations.glueCost) : 'Rp 0'}</span>
        </div>

        <div class="total-card">
          <div class="row1"><span class="label">Total Ongkos Cetak</span><span class="value">${fmt(calculations.totalOngkosCetak)}</span></div>
          <div class="divider"></div>
          <div class="row2"><span class="label">Harga per Lembar (${qty.toLocaleString('id-ID')} lbr)</span><span class="value">${fmt(calculations.hargaPerLembar)}/lbr</span></div>
        </div>

        <div class="footer"><p>DarrellPOS · Kalkulator Hitung Cetakan</p></div>
      </div>
      </body></html>`
    printWindow.document.write(html)
    printWindow.document.close()
    setTimeout(() => { printWindow.print() }, 400)
    toast.success('Mencetak...')
  }

  // === Sub-components ===
  const SectionHeader = ({ icon, label, color = 'emerald', badge }: { icon: React.ReactNode; label: string; color?: string; badge?: string }) => (
    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 bg-slate-50/60">
      <div className={`w-6 h-6 rounded-md bg-${color}-100 flex items-center justify-center`}>{icon}</div>
      <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">{label}</h2>
      {badge && <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{badge}</span>}
    </div>
  )

  const ValueBox = ({ label, value, gradient }: { label: string; value: string; gradient: string }) => (
    <div className={`w-full h-[32px] flex items-center justify-between px-2.5 ${gradient} border rounded-lg`}>
      <span className="text-[11px] font-medium text-slate-600">{label}</span>
      <span className="text-xs font-bold">{value}</span>
    </div>
  )

  const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`

  // === Render ===
  return (
    <DashboardLayout title="Hitung Ongkos Cetak" subtitle="Kalkulator ongkos cetak lengkap termasuk bahan kertas, cetak, finishing, dan lem">
      <div className="max-w-[1100px] mx-auto">
        <div className="lg:flex lg:h-[calc(100vh-8rem)] lg:gap-4">

          {/* ========== LEFT COLUMN: Form ========== */}
          <div className="flex-1 lg:overflow-y-auto min-w-0 hide-scrollbar">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden space-y-0">

              {/* Section 1: Informasi */}
              <SectionHeader icon={<Info className="w-3.5 h-3.5 text-blue-600" />} label="Informasi" color="blue" />
              <div className="px-4 py-3">
                <div>
                  <label className={labelClass}>Nama Cetakan</label>
                  <input type="text" placeholder="Contoh: Brosur Lipat 3" value={namaCetakan} onChange={(e) => setNamaCetakan(e.target.value)} className={inputClass} />
                </div>
              </div>

              {/* Section 2: Bahan Kertas */}
              <SectionHeader icon={<FileText className="w-3.5 h-3.5 text-amber-600" />} label="Bahan Kertas" color="amber" />
              <div className="px-4 py-3 space-y-3">
                <div>
                  <label className={labelClass}>Pilih Kertas</label>
                  <select value={selectedPaperId} onChange={(e) => setSelectedPaperId(e.target.value)} className={selectClass}>
                    <option value="">Pilih dari master</option>
                    <option value="__custom__">Custom (Input Manual)</option>
                    {papers.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} — {p.grammage}gsm — {p.width}×{p.height}cm — {fmt(p.pricePerRim)}/rim</option>
                    ))}
                  </select>
                </div>

                {isCustom && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelClass}>Gramatur (gsm)</label>
                      <input type="number" min="0" placeholder="120" value={customGrammage} onChange={(e) => setCustomGrammage(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Harga per Rim (Rp)</label>
                      <input type="number" min="0" placeholder="1500000" value={customPricePerRim} onChange={(e) => setCustomPricePerRim(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Lebar Kertas (cm)</label>
                      <input type="number" step="0.1" min="0" placeholder="79" value={customWidth} onChange={(e) => setCustomWidth(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Tinggi Kertas (cm)</label>
                      <input type="number" step="0.1" min="0" placeholder="109" value={customHeight} onChange={(e) => setCustomHeight(e.target.value)} className={inputClass} />
                    </div>
                  </div>
                )}

                {selectedPaper && !isCustom && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <span className="text-[11px] text-amber-600">Kertas</span>
                      <p className="text-sm font-bold text-amber-800">{selectedPaper.name} ({selectedPaper.grammage}gsm)</p>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <span className="text-[11px] text-amber-600">Ukuran</span>
                      <p className="text-sm font-bold text-amber-800">{selectedPaper.width} × {selectedPaper.height} cm</p>
                    </div>
                  </div>
                )}

                <div>
                  <label className={labelClass}>Harga Kertas per Lembar (Rp)</label>
                  <input type="number" step="0.01" min="0" placeholder={selectedPaper ? (selectedPaper.pricePerRim / 500).toFixed(2) : '0'} value={hargaKertasPerLembar} onChange={(e) => setHargaKertasPerLembar(e.target.value)} className={inputClass} />
                </div>
              </div>

              {/* Section 3: Ongkos Cetak */}
              <SectionHeader icon={<Calculator className="w-3.5 h-3.5 text-purple-600" />} label="Ongkos Cetak" color="purple" />
              <div className="px-4 py-3 space-y-3">
                <div>
                  <label className={labelClass}>Mesin</label>
                  <select value={selectedMachineId} onChange={(e) => { setSelectedMachineId(e.target.value); setHargaPlat('') }} className={selectClass}>
                    <option value="">Pilih mesin</option>
                    {printingCosts.map((m) => (
                      <option key={m.id} value={m.id}>{m.machineName}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelClass}>Jumlah Warna</label>
                    <div className="relative">
                      <Palette className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input type="number" min="0" placeholder="4" value={jumlahWarna} onChange={(e) => setJumlahWarna(e.target.value)} className={`${inputClass} pl-9`} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Warna Khusus</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-500">★</span>
                      <input type="number" min="0" placeholder="0" value={warnaKhusus} onChange={(e) => setWarnaKhusus(e.target.value)} className={`${inputClass} pl-9`} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelClass}>Harga Plat per Warna (Rp)</label>
                    <input type="number" step="0.01" min="0" placeholder={selectedMachine ? selectedMachine.platePricePerSheet.toString() : '0'} value={hargaPlat} onChange={(e) => setHargaPlat(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Ongkos Cetak</label>
                    <ValueBox label="Subtotal" value={calculations.ongkosCetak > 0 ? fmt(calculations.ongkosCetak) : 'Rp 0'} gradient="bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200" />
                  </div>
                </div>

                {selectedMachine && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 text-[11px] text-purple-700 space-y-0.5">
                    <p><span className="font-semibold">Mesin:</span> {selectedMachine.machineName}</p>
                    <p><span className="font-semibold">Area Cetak:</span> {selectedMachine.printAreaWidth} × {selectedMachine.printAreaHeight} cm</p>
                    <p><span className="font-semibold">Harga/Warna:</span> {fmt(selectedMachine.pricePerColor)} · <span className="font-semibold">Warna Khusus:</span> {fmt(selectedMachine.specialColorPrice)}</p>
                    <p><span className="font-semibold">Min Cetak:</span> {selectedMachine.minimumPrintQuantity} lbr · <span className="font-semibold">Lewat Min:</span> {fmt(selectedMachine.priceAboveMinimumPerSheet)}/lbr</p>
                  </div>
                )}
              </div>

              {/* Section 4: Finishing */}
              <SectionHeader icon={<Scissors className="w-3.5 h-3.5 text-rose-600" />} label="Finishing" color="rose" badge={selectedFinishingIds.length > 0 ? `${selectedFinishingIds.length} item` : undefined} />
              <div className="px-4 py-3 space-y-3">
                <div>
                  <label className={labelClass}>Tambah Finishing</label>
                  <div className="flex gap-2">
                    <select className={`${selectClass} flex-1`} value="" onChange={(e) => { if (e.target.value) handleAddFinishing(e.target.value) }}>
                      <option value="">Pilih finishing...</option>
                      {finishings.filter(f => !selectedFinishingIds.includes(f.id)).map((f) => (
                        <option key={f.id} value={f.id}>{f.name} (min: {fmt(f.minimumPrice)})</option>
                      ))}
                    </select>
                    <Button variant="outline" size="sm" className="px-3 flex-shrink-0" disabled>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {selectedFinishingItems.length > 0 && (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {selectedFinishingItems.map((fin) => (
                      <div key={fin.id} className="flex items-center justify-between bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                        <div>
                          <p className="text-sm font-semibold text-rose-800">{fin.name}</p>
                          <p className="text-[11px] text-rose-600">Min: {fin.minimumSheets} lbr · {fmt(fin.minimumPrice)} · +{fmt(fin.additionalPrice)}/lbr · {fmt(fin.pricePerCm)}/cm²</p>
                        </div>
                        <button onClick={() => handleRemoveFinishing(fin.id)} className="w-7 h-7 rounded-md bg-rose-200 hover:bg-rose-300 flex items-center justify-center transition-colors">
                          <X className="w-3.5 h-3.5 text-rose-700" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <ValueBox label="Total Finishing" value={calculations.totalFinishing > 0 ? fmt(calculations.totalFinishing) : 'Rp 0'} gradient="bg-gradient-to-r from-rose-50 to-pink-50 border-rose-200" />
              </div>

              {/* Section 5: Ongkos Lem */}
              <SectionHeader icon={<Droplets className="w-3.5 h-3.5 text-cyan-600" />} label="Ongkos Lem" color="cyan" />
              <div className="px-4 py-3 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelClass}>Panjang Lem (cm)</label>
                    <input type="number" step="0.1" min="0" placeholder="0" value={panjangLem} onChange={(e) => setPanjangLem(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Harga per cm (Rp)</label>
                    <input type="number" step="0.01" min="0" placeholder="0" value={hargaLemPerCm} onChange={(e) => setHargaLemPerCm(e.target.value)} className={inputClass} />
                  </div>
                </div>
                <ValueBox label="Ongkos Lem" value={calculations.glueCost > 0 ? fmt(calculations.glueCost) : 'Rp 0'} gradient="bg-gradient-to-r from-cyan-50 to-sky-50 border-cyan-200" />
              </div>

              {/* Section 6: Jumlah Lembar */}
              <SectionHeader icon={<Layers className="w-3.5 h-3.5 text-emerald-600" />} label="Jumlah Lembar" color="emerald" />
              <div className="px-4 py-3">
                <div>
                  <label className={labelClass}>Jumlah Lembar</label>
                  <input type="number" min="0" placeholder="Contoh: 1000" value={jumlahLembar} onChange={(e) => setJumlahLembar(e.target.value)} className={inputClass} />
                </div>
              </div>

              {/* Empty state when no data */}
              {qty <= 0 && (
                <div className="px-4 py-6 text-center">
                  <Calculator className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm text-slate-400">Masukkan jumlah lembar untuk melihat hasil kalkulasi</p>
                </div>
              )}

            </div>
          </div>

          {/* ========== RIGHT COLUMN: Results Panel ========== */}
          <div className="w-full lg:w-[280px] flex-shrink-0 mt-4 lg:mt-0">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden lg:sticky lg:top-4">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 bg-slate-50/60">
                <div className="w-6 h-6 rounded-md bg-emerald-100 flex items-center justify-center">
                  <Calculator className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Hasil Kalkulasi</h2>
              </div>

              <div className="p-4 space-y-3">
                {qty > 0 ? (
                  <>
                    <div className="space-y-1.5">
                      <ValueBox label="Harga Kertas / Lembar" value={fmt(calculations.effectivePricePerSheet)} gradient="bg-gradient-to-r from-teal-50 to-emerald-50 border-teal-200" />
                      <ValueBox label="Total Harga Kertas" value={fmt(calculations.totalPaperCost)} gradient="bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200" />
                      <ValueBox label="Ongkos Cetak" value={fmt(calculations.ongkosCetak)} gradient="bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200" />
                      <ValueBox label="Total Finishing" value={fmt(calculations.totalFinishing)} gradient="bg-gradient-to-r from-rose-50 to-pink-50 border-rose-200" />
                      <ValueBox label="Ongkos Lem" value={calculations.glueCost > 0 ? fmt(calculations.glueCost) : 'Rp 0'} gradient="bg-gradient-to-r from-cyan-50 to-sky-50 border-cyan-200" />
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-50">
                        <span className="text-[11px] text-slate-600">Total Ongkos Cetak</span>
                        <span className="text-xs font-semibold text-slate-700">{fmt(calculations.totalOngkosCetak)}</span>
                      </div>
                      <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-50">
                        <span className="text-[11px] text-slate-600">Harga per Lembar</span>
                        <span className="text-xs font-semibold text-slate-700">{fmt(calculations.hargaPerLembar)}/lbr</span>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-3.5 text-white">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">Total Ongkos Cetak</span>
                        <span className="text-lg font-extrabold">{fmt(calculations.totalOngkosCetak)}</span>
                      </div>
                      <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-white/20">
                        <span className="text-[11px] opacity-80">Untuk {qty.toLocaleString('id-ID')} lembar</span>
                        <span className="text-xs font-bold">{fmt(calculations.hargaPerLembar)}/lbr</span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-1">
                      <Button onClick={handlePrint} className="w-full gap-2 bg-amber-600 hover:bg-amber-700 text-white" size="sm">
                        <Printer className="w-4 h-4" /> Cetak
                      </Button>
                      <Button onClick={handleReset} variant="outline" className="w-full gap-2" size="sm">
                        <RotateCcw className="w-4 h-4" /> Reset
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="py-6 text-center">
                    <Calculator className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-xs text-slate-400">Masukkan jumlah lembar untuk melihat hasil</p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  )
}
