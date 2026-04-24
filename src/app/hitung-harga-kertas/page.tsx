'use client'

import { FileText, Printer, RotateCcw, Calculator, Ruler, Info } from 'lucide-react'
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

export default function HitungHargaKertasPage() {
  const { t } = useLanguage()
  const [papers, setPapers] = useState<Paper[]>([])
  const [selectedPaperId, setSelectedPaperId] = useState('')
  const [namaCetakan, setNamaCetakan] = useState('')
  const [customGrammage, setCustomGrammage] = useState('')
  const [customWidth, setCustomWidth] = useState('')
  const [customHeight, setCustomHeight] = useState('')
  const [customPricePerRim, setCustomPricePerRim] = useState('')
  const [quantity, setQuantity] = useState('')

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
  const qty = parseInt(quantity) || 0

  const calculations = useMemo(() => {
    if (pricePerRim <= 0) return null

    const pricePerSheet = pricePerRim / 500
    const areaCm2 = paperWidth * paperHeight
    const areaM2 = areaCm2 / 10000
    const pricePerM2 = areaM2 > 0 ? pricePerSheet / areaM2 : 0
    const weightPerSheetGram = areaM2 > 0 ? grammage * areaM2 : 0
    const weightPerRimKg = (weightPerSheetGram * 500) / 1000
    const totalPrice = pricePerSheet * qty
    const costPerPiece = qty > 0 ? totalPrice / qty : 0
    const totalWeightKg = (weightPerSheetGram * qty) / 1000

    return {
      pricePerSheet,
      pricePerM2,
      weightPerSheetGram,
      weightPerRimKg,
      totalPrice,
      costPerPiece,
      totalWeightKg,
      areaM2,
    }
  }, [pricePerRim, paperWidth, paperHeight, grammage, qty])

  const handleReset = () => {
    setSelectedPaperId('')
    setNamaCetakan('')
    setCustomGrammage('')
    setCustomWidth('')
    setCustomHeight('')
    setCustomPricePerRim('')
    setQuantity('')
    toast.success('Form berhasil direset')
  }

  const handlePrint = () => {
    if (!calculations) { toast.error('Masukkan data kertas terlebih dahulu'); return }
    const printWindow = window.open('', '', 'height=700,width=600')
    if (!printWindow) { toast.error('Gagal membuka jendela print'); return }
    const now = new Date().toLocaleString('id-ID')
    const paperName = selectedPaper ? selectedPaper.name : 'Custom'
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Hitung Harga Kertas</title>
      <style>body{font-family:Arial,sans-serif;padding:20px;font-size:12px;color:#1e293b}
      h1{text-align:center;font-size:18px;margin-bottom:4px}
      .subtitle{text-align:center;color:#64748b;font-size:11px;margin-bottom:16px}
      .info{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px 12px;margin-bottom:16px;font-size:11px}
      .info span{color:#64748b}
      table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:16px}
      th{background:#f8fafc;border:1px solid #ddd;padding:6px;font-weight:600;text-align:left}
      td{border:1px solid #ddd;padding:6px}
      .right{text-align:right}
      .total{background:linear-gradient(135deg,#059669,#0d9488);color:white;border-radius:8px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;margin-top:12px}
      .total .label{font-size:13px;font-weight:600}
      .total .value{font-size:20px;font-weight:800}
      .footer{text-align:center;color:#94a3b8;font-size:10px;margin-top:16px}
      </style></head><body>
      <h1>Hitung Harga Kertas</h1>
      <p class="subtitle">${namaCetakan || '-'} · Dicetak: ${now}</p>
      <div class="info">
        <span>Kertas:</span> <strong>${paperName}</strong> &nbsp;|&nbsp;
        <span>Gramatur:</span> <strong>${grammage} gsm</strong> &nbsp;|&nbsp;
        <span>Ukuran:</span> <strong>${paperWidth} × ${paperHeight} cm</strong> &nbsp;|&nbsp;
        <span>Harga/Rim:</span> <strong>Rp ${pricePerRim.toLocaleString('id-ID')}</strong>
      </div>
      <table>
        <thead><tr><th>Keterangan</th><th class="right">Nilai</th></tr></thead>
        <tbody>
          <tr><td>Harga per Lembar (1 rim = 500 lbr)</td><td class="right">Rp ${calculations.pricePerSheet.toLocaleString('id-ID')}</td></tr>
          <tr><td>Harga per m²</td><td class="right">Rp ${calculations.pricePerM2.toLocaleString('id-ID')}</td></tr>
          <tr><td>Berat per Lembar</td><td class="right">${calculations.weightPerSheetGram.toFixed(1)} gram</td></tr>
          <tr><td>Berat per Rim</td><td class="right">${calculations.weightPerRimKg.toFixed(2)} kg</td></tr>
          ${qty > 0 ? `
          <tr><td><strong>Jumlah</strong></td><td class="right"><strong>${qty.toLocaleString('id-ID')} lembar</strong></td></tr>
          <tr><td><strong>Total Harga</strong></td><td class="right"><strong>Rp ${calculations.totalPrice.toLocaleString('id-ID')}</strong></td></tr>
          <tr><td>Harga per Lembar (Cost/Piece)</td><td class="right">Rp ${calculations.costPerPiece.toLocaleString('id-ID')}</td></tr>
          <tr><td>Total Berat</td><td class="right">${calculations.totalWeightKg.toFixed(2)} kg</td></tr>
          ` : ''}
        </tbody>
      </table>
      <div class="footer">DarrellPOS · Kalkulator Hitung Cetakan</div>
      </body></html>`
    printWindow.document.write(html)
    printWindow.document.close()
    setTimeout(() => { printWindow.print() }, 250)
    toast.success('Mencetak...')
  }

  const SectionHeader = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 bg-slate-50/60">
      <div className="w-6 h-6 rounded-md bg-emerald-100 flex items-center justify-center">{icon}</div>
      <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">{label}</h2>
    </div>
  )

  const ValueBox = ({ label, value, gradient }: { label: string; value: string; gradient: string }) => (
    <div className={`w-full h-[32px] flex items-center justify-between px-2.5 ${gradient} border rounded-lg`}>
      <span className="text-[11px] font-medium text-slate-600">{label}</span>
      <span className="text-xs font-bold">{value}</span>
    </div>
  )

  return (
    <DashboardLayout title="Hitung Harga Kertas" subtitle="Kalkulator harga kertas per lembar, per m², dan per rim">
      <div className="max-w-[900px] mx-auto">
        <div className="lg:flex lg:h-[calc(100vh-8rem)] lg:gap-4">

          <div className="flex-1 lg:overflow-y-auto min-w-0 hide-scrollbar">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

              <SectionHeader icon={<Info className="w-3.5 h-3.5 text-blue-600" />} label="Informasi" />
              <div className="px-4 py-3 space-y-2">
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
                      <span className="text-[11px] text-amber-600">Gramatur</span>
                      <p className="text-sm font-bold text-amber-800">{selectedPaper.grammage} gsm</p>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <span className="text-[11px] text-amber-600">Harga per Rim</span>
                      <p className="text-sm font-bold text-amber-800">Rp {selectedPaper.pricePerRim.toLocaleString('id-ID')}</p>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <span className="text-[11px] text-amber-600">Ukuran</span>
                      <p className="text-sm font-bold text-amber-800">{selectedPaper.width} × {selectedPaper.height} cm</p>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <span className="text-[11px] text-amber-600">Nama</span>
                      <p className="text-sm font-bold text-amber-800">{selectedPaper.name}</p>
                    </div>
                  </div>
                )}

                <div>
                  <label className={labelClass}>Jumlah Lembar (opsional)</label>
                  <div className="relative">
                    <FileText className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input type="number" min="0" placeholder="1000" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={`${inputClass} pl-9`} />
                  </div>
                </div>
              </div>

              {!calculations && (
                <div className="px-4 py-8 text-center">
                  <Calculator className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm text-slate-400">Masukkan data kertas untuk mulai menghitung</p>
                  <p className="text-xs text-slate-300 mt-1">Pilih dari master kertas atau input manual</p>
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
                    <div className="space-y-1.5">
                      <ValueBox label="Harga / Lembar" value={`Rp ${calculations.pricePerSheet.toLocaleString('id-ID')}`} gradient="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200" />
                      <ValueBox label="Harga / m²" value={`Rp ${Math.round(calculations.pricePerM2).toLocaleString('id-ID')}`} gradient="bg-gradient-to-r from-violet-50 to-purple-50 border-violet-200" />
                      <ValueBox label="Berat / Lembar" value={`${calculations.weightPerSheetGram.toFixed(1)} gram`} gradient="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200" />
                      <ValueBox label="Berat / Rim" value={`${calculations.weightPerRimKg.toFixed(2)} kg`} gradient="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200" />
                    </div>

                    {qty > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-50">
                          <span className="text-[11px] text-slate-600">Total Harga</span>
                          <span className="text-xs font-semibold text-slate-700">Rp {calculations.totalPrice.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-50">
                          <span className="text-[11px] text-slate-600">Total Berat</span>
                          <span className="text-xs font-semibold text-slate-700">{calculations.totalWeightKg.toFixed(2)} kg</span>
                        </div>
                      </div>
                    )}

                    <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl p-3.5 text-white">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">Harga / Lembar</span>
                        <span className="text-lg font-extrabold">Rp {calculations.pricePerSheet.toLocaleString('id-ID')}</span>
                      </div>
                      {qty > 0 && (
                        <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-white/20">
                          <span className="text-[11px] opacity-80">Total ({qty.toLocaleString('id-ID')} lbr)</span>
                          <span className="text-xs font-bold">Rp {calculations.totalPrice.toLocaleString('id-ID')}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 pt-1">
                      <Button onClick={handlePrint} className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" size="sm">
                        <Printer className="w-4 h-4" /> Cetak
                      </Button>
                      <Button onClick={handleReset} variant="outline" className="w-full gap-2" size="sm">
                        <RotateCcw className="w-4 h-4" /> Reset
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="py-6 text-center">
                    <Ruler className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-xs text-slate-400">Masukkan harga per rim untuk melihat hasil</p>
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
