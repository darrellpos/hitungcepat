'use client'

import { FileText, Printer, RotateCcw, Calculator, Ruler, Info, Scissors, AlertTriangle } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { getAuthHeaders } from '@/lib/auth'
import { fetcher } from '@/lib/fetcher'
import { Button } from '@/components/ui/button'
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

const inputClass = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors'
const selectClass = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors bg-white appearance-none cursor-pointer'
const labelClass = 'flex items-center gap-1.5 text-xs font-medium text-slate-700 mb-1.5'

export default function HitungOngkosKertasPage() {
  const { t } = useLanguage()
  const [papers, setPapers] = useState<Paper[]>([])
  const [selectedPaperId, setSelectedPaperId] = useState('')
  const [namaCetakan, setNamaCetakan] = useState('')
  const [cutWidth, setCutWidth] = useState('')
  const [cutHeight, setCutHeight] = useState('')
  const [quantity, setQuantity] = useState('')
  const [wastePercent, setWastePercent] = useState('5')
  const [customGrammage, setCustomGrammage] = useState('')
  const [customWidth, setCustomWidth] = useState('')
  const [customHeight, setCustomHeight] = useState('')
  const [customPricePerRim, setCustomPricePerRim] = useState('')

  const fetchPapers = async () => {
    try {
      const response = await fetcher('/api/papers', { headers: getAuthHeaders() })
      const data = await response.json()
      if (Array.isArray(data)) setPapers(data)
    } catch (error) {
      console.error('Error fetching papers:', error)
    }
  }

  useEffect(() => { fetchPapers() }, [])

  const selectedPaper = papers.find(p => p.id === selectedPaperId) || null
  const isCustom = !selectedPaperId

  const grammage = selectedPaper ? selectedPaper.grammage : (parseFloat(customGrammage) || 0)
  const paperWidth = selectedPaper ? selectedPaper.width : (parseFloat(customWidth) || 0)
  const paperHeight = selectedPaper ? selectedPaper.height : (parseFloat(customHeight) || 0)
  const pricePerRim = selectedPaper ? selectedPaper.pricePerRim : (parseFloat(customPricePerRim) || 0)
  const qty = parseFloat(quantity) || 0
  const cw = parseFloat(cutWidth) || 0
  const ch = parseFloat(cutHeight) || 0
  const waste = parseFloat(wastePercent) || 0

  const calculations = useMemo(() => {
    if (paperWidth <= 0 || paperHeight <= 0 || cw <= 0 || ch <= 0 || pricePerRim <= 0) return null

    const pricePerSheet = pricePerRim / 500

    // Calculate how many pieces fit per sheet (grid layout)
    // Add small gap (2mm = 0.2cm) between pieces for cutting
    const gap = 0.3
    const piecesX = Math.floor((paperWidth + gap) / (cw + gap))
    const piecesY = Math.floor((paperHeight + gap) / (ch + gap))
    const piecesPerSheet = piecesX * piecesY

    if (piecesPerSheet <= 0) return null

    // Sheets needed (with waste)
    const sheetsExact = qty / piecesPerSheet
    const sheetsWithWaste = Math.ceil(sheetsExact * (1 + waste / 100))
    const actualPieces = sheetsWithWaste * piecesPerSheet

    // Costs
    const totalPaperCost = sheetsWithWaste * pricePerSheet
    const costPerPiece = qty > 0 ? totalPaperCost / qty : 0

    // Paper weight
    const areaM2 = (paperWidth * paperHeight) / 10000
    const weightPerSheetGram = grammage * areaM2
    const totalWeightKg = (weightPerSheetGram * sheetsWithWaste) / 1000

    // Paper utilization
    const cutArea = cw * ch
    const paperArea = paperWidth * paperHeight
    const utilization = (piecesPerSheet * cutArea) / paperArea * 100

    return {
      piecesX,
      piecesY,
      piecesPerSheet,
      sheetsExact,
      sheetsWithWaste,
      actualPieces,
      pricePerSheet,
      totalPaperCost,
      costPerPiece,
      totalWeightKg,
      utilization,
      wastePcs: actualPieces - qty,
    }
  }, [paperWidth, paperHeight, cw, ch, pricePerRim, qty, waste, grammage])

  const handleReset = () => {
    setSelectedPaperId('')
    setNamaCetakan('')
    setCutWidth('')
    setCutHeight('')
    setQuantity('')
    setWastePercent('5')
    setCustomGrammage('')
    setCustomWidth('')
    setCustomHeight('')
    setCustomPricePerRim('')
    toast.success('Form berhasil direset')
  }

  const handlePrint = () => {
    if (!calculations) { toast.error('Lengkapi semua data terlebih dahulu'); return }
    const printWindow = window.open('', '', 'height=800,width=700')
    if (!printWindow) { toast.error('Gagal membuka jendela print'); return }
    const now = new Date().toLocaleString('id-ID')
    const paperName = selectedPaper ? selectedPaper.name : 'Custom'
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Hitung Ongkos Kertas</title>
      <style>body{font-family:Arial,sans-serif;padding:20px;font-size:12px;color:#1e293b}
      h1{text-align:center;font-size:18px;margin-bottom:4px}
      .subtitle{text-align:center;color:#64748b;font-size:11px;margin-bottom:16px}
      .info{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px 12px;margin-bottom:16px;font-size:11px}
      .info span{color:#64748b}
      table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:16px}
      th{background:#f8fafc;border:1px solid #ddd;padding:6px;font-weight:600;text-align:left}
      td{border:1px solid #ddd;padding:6px}
      .right{text-align:right}
      .total{background:linear-gradient(135deg,#f59e0b,#d97706);color:white;border-radius:8px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;margin-top:12px}
      .total .label{font-size:13px;font-weight:600}
      .total .value{font-size:20px;font-weight:800}
      .warn{background:#fef3c7;border:1px solid #fbbf24;border-radius:6px;padding:8px 12px;margin-bottom:16px;font-size:11px;color:#92400e}
      .footer{text-align:center;color:#94a3b8;font-size:10px;margin-top:16px}
      </style></head><body>
      <h1>Hitung Ongkos Kertas</h1>
      <p class="subtitle">${namaCetakan || '-'} · Dicetak: ${now}</p>
      <div class="info">
        <span>Kertas:</span> <strong>${paperName}</strong> &nbsp;|&nbsp;
        <span>Ukuran Kertas:</span> <strong>${paperWidth} × ${paperHeight} cm</strong> &nbsp;|&nbsp;
        <span>Ukuran Potong:</span> <strong>${cw} × ${ch} cm</strong> &nbsp;|&nbsp;
        <span>Jumlah:</span> <strong>${qty.toLocaleString('id-ID')} pcs</strong>
      </div>
      ${calculations.utilization < 50 ? '<div class="warn">⚠️ Pemanfaatan kertas rendah (' + calculations.utilization.toFixed(1) + '%). Pertimbangkan ukuran kertas yang lebih sesuai.</div>' : ''}
      <table>
        <thead><tr><th>Keterangan</th><th class="right">Nilai</th></tr></thead>
        <tbody>
          <tr><td>Jumlah per Baris (X)</td><td class="right">${calculations.piecesX} pcs</td></tr>
          <tr><td>Jumlah per Kolom (Y)</td><td class="right">${calculations.piecesY} pcs</td></tr>
          <tr><td><strong>Potongan per Lembar</strong></td><td class="right"><strong>${calculations.piecesPerSheet} pcs</strong></td></tr>
          <tr><td>Pemanfaatan Kertas</td><td class="right">${calculations.utilization.toFixed(1)}%</td></tr>
          <tr><td>Lembar Dibutuhkan (persis)</td><td class="right">${calculations.sheetsExact.toFixed(1)} lbr</td></tr>
          <tr><td>Lembar Dibutuhkan (+waste ${waste}%)</td><td class="right"><strong>${calculations.sheetsWithWaste} lbr</strong></td></tr>
          <tr><td>Total Potongan (termasuk sisa)</td><td class="right">${calculations.actualPieces.toLocaleString('id-ID')} pcs</td></tr>
          <tr><td>Sisa Potongan</td><td class="right">${calculations.wastePcs.toLocaleString('id-ID')} pcs</td></tr>
          <tr><td>Harga per Lembar Kertas</td><td class="right">Rp ${calculations.pricePerSheet.toLocaleString('id-ID')}</td></tr>
        </tbody>
      </table>
      <div class="total">
        <span class="label">Total Ongkos Kertas</span>
        <span class="value">Rp ${calculations.totalPaperCost.toLocaleString('id-ID')}</span>
      </div>
      <table style="margin-top:12px">
        <tbody>
          <tr><td>Ongkos per Potongan</td><td class="right"><strong>Rp ${calculations.costPerPiece.toLocaleString('id-ID')}</strong></td></tr>
          <tr><td>Total Berat Kertas</td><td class="right">${calculations.totalWeightKg.toFixed(2)} kg</td></tr>
        </tbody>
      </table>
      <div class="footer">DarrellPOS · Kalkulator Hitung Cetakan</div>
      </body></html>`
    printWindow.document.write(html)
    printWindow.document.close()
    setTimeout(() => { printWindow.print() }, 250)
    toast.success('Mencetak...')
  }

  const SectionHeader = ({ icon, label, badge }: { icon: React.ReactNode; label: string; badge?: string }) => (
    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 bg-slate-50/60">
      <div className="w-6 h-6 rounded-md bg-emerald-100 flex items-center justify-center">{icon}</div>
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

  return (
    <DashboardLayout title="Hitung Ongkos Kertas" subtitle="Kalkulator ongkos bahan kertas untuk cetakan">
      <div className="max-w-[900px] mx-auto">
        <div className="lg:flex lg:h-[calc(100vh-8rem)] lg:gap-4">

          <div className="flex-1 lg:overflow-y-auto min-w-0 hide-scrollbar">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

              <SectionHeader icon={<Info className="w-3.5 h-3.5 text-blue-600" />} label="Informasi" />
              <div className="px-4 py-3">
                <div>
                  <label className={labelClass}>Nama Cetakan</label>
                  <input type="text" placeholder="Contoh: Brosur Lipat 3" value={namaCetakan} onChange={(e) => setNamaCetakan(e.target.value)} className={inputClass} />
                </div>
              </div>

              <SectionHeader icon={<FileText className="w-3.5 h-3.5 text-amber-600" />} label="Pilih Kertas" />
              <div className="px-4 py-3 space-y-3">
                <div>
                  <label className={labelClass}>Jenis Kertas</label>
                  <select value={selectedPaperId} onChange={(e) => setSelectedPaperId(e.target.value)} className={selectClass}>
                    <option value="">Custom (Input Manual)</option>
                    {papers.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} — {p.grammage}gsm — {p.width}×{p.height}cm</option>
                    ))}
                  </select>
                </div>

                {isCustom ? (
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
                ) : selectedPaper && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <span className="text-[11px] text-amber-600">Kertas</span>
                      <p className="text-sm font-bold text-amber-800">{selectedPaper.name}</p>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <span className="text-[11px] text-amber-600">Ukuran</span>
                      <p className="text-sm font-bold text-amber-800">{selectedPaper.width} × {selectedPaper.height} cm</p>
                    </div>
                  </div>
                )}
              </div>

              <SectionHeader icon={<Scissors className="w-3.5 h-3.5 text-rose-600" />} label="Ukuran Potongan & Jumlah" />
              <div className="px-4 py-3 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelClass}>Lebar Potongan (cm)</label>
                    <div className="relative">
                      <Ruler className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input type="number" step="0.1" min="0" placeholder="21" value={cutWidth} onChange={(e) => setCutWidth(e.target.value)} className={`${inputClass} pl-9`} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Tinggi Potongan (cm)</label>
                    <div className="relative">
                      <Ruler className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input type="number" step="0.1" min="0" placeholder="29.7" value={cutHeight} onChange={(e) => setCutHeight(e.target.value)} className={`${inputClass} pl-9`} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Jumlah (pcs)</label>
                    <div className="relative">
                      <FileText className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input type="number" min="0" placeholder="1000" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={`${inputClass} pl-9`} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Waste (%)</label>
                    <input type="number" min="0" max="100" step="1" placeholder="5" value={wastePercent} onChange={(e) => setWastePercent(e.target.value)} className={inputClass} />
                  </div>
                </div>

                {/* Visual preview of layout */}
                {calculations && (
                  <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                    <p className="text-[11px] text-slate-500 mb-2 font-medium">Preview Tata Letak pada Kertas:</p>
                    <div className="relative border-2 border-dashed border-slate-300 rounded" style={{ aspectRatio: `${paperWidth}/${paperHeight}`, maxWidth: '200px', margin: '0 auto' }}>
                      <div className="absolute inset-1 grid gap-0.5" style={{ gridTemplateColumns: `repeat(${calculations.piecesX}, 1fr)`, gridTemplateRows: `repeat(${calculations.piecesY}, 1fr)` }}>
                        {Array.from({ length: calculations.piecesPerSheet }).map((_, i) => (
                          <div key={i} className="bg-emerald-200/60 border border-emerald-400/40 rounded-[2px]" />
                        ))}
                      </div>
                    </div>
                    <p className="text-center text-[11px] text-slate-500 mt-2">
                      {calculations.piecesX} × {calculations.piecesY} = {calculations.piecesPerSheet} pcs/lembar
                    </p>
                  </div>
                )}
              </div>

              {!calculations && (
                <div className="px-4 py-6 text-center">
                  <Calculator className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm text-slate-400">Lengkapi data kertas dan ukuran potongan</p>
                </div>
              )}

            </div>
          </div>

          <div className="w-full lg:w-[280px] flex-shrink-0 mt-4 lg:mt-0">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden lg:sticky lg:top-4">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 bg-slate-50/60">
                <div className="w-6 h-6 rounded-md bg-emerald-100 flex items-center justify-center">
                  <Calculator className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Hasil Kalkulasi</h2>
              </div>

              <div className="p-4 space-y-3">
                {calculations ? (
                  <>
                    {/* Warning for low utilization */}
                    {calculations.utilization < 50 && (
                      <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="text-[11px] text-amber-700">Pemanfaatan kertas rendah ({calculations.utilization.toFixed(1)}%). Sisa banyak terbuang.</p>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <ValueBox label="Potongan / Lembar" value={`${calculations.piecesPerSheet} pcs (${calculations.piecesX}×${calculations.piecesY})`} gradient="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200" />
                      <ValueBox label="Pemanfaatan Kertas" value={`${calculations.utilization.toFixed(1)}%`} gradient={calculations.utilization >= 70 ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200' : calculations.utilization >= 50 ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200' : 'bg-gradient-to-r from-red-50 to-rose-50 border-red-200'} />
                      <ValueBox label="Lembar Dibutuhkan" value={`${calculations.sheetsWithWaste} lbr (+${waste}% waste)`} gradient="bg-gradient-to-r from-violet-50 to-purple-50 border-violet-200" />
                      <ValueBox label="Total Potongan" value={`${calculations.actualPieces.toLocaleString('id-ID')} pcs`} gradient="bg-gradient-to-r from-cyan-50 to-sky-50 border-cyan-200" />
                      <ValueBox label="Sisa Potongan" value={`${calculations.wastePcs.toLocaleString('id-ID')} pcs`} gradient="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200" />
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-50">
                        <span className="text-[11px] text-slate-600">Ongkos / Potongan</span>
                        <span className="text-xs font-semibold text-slate-700">Rp {calculations.costPerPiece.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-50">
                        <span className="text-[11px] text-slate-600">Total Berat</span>
                        <span className="text-xs font-semibold text-slate-700">{calculations.totalWeightKg.toFixed(2)} kg</span>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-3.5 text-white">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">Total Ongkos Kertas</span>
                        <span className="text-lg font-extrabold">Rp {calculations.totalPaperCost.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-white/20">
                        <span className="text-[11px] opacity-80">Untuk {qty.toLocaleString('id-ID')} pcs</span>
                        <span className="text-xs font-bold">Rp {calculations.costPerPiece.toLocaleString('id-ID')}/pcs</span>
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
                    <Scissors className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-xs text-slate-400">Masukkan ukuran potongan & jumlah</p>
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
