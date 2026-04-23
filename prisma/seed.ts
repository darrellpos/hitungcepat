import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  const papers = [
    { name: 'HVS 70', grammage: 70, width: 21.0, height: 29.7, pricePerRim: 45000 },
    { name: 'HVS 80', grammage: 80, width: 21.0, height: 29.7, pricePerRim: 52000 },
    { name: 'Art Paper 120', grammage: 120, width: 21.0, height: 29.7, pricePerRim: 85000 },
    { name: 'Art Paper 150', grammage: 150, width: 21.0, height: 29.7, pricePerRim: 95000 },
    { name: 'Art Paper 260', grammage: 260, width: 21.0, height: 29.7, pricePerRim: 145000 },
    { name: 'Art Carton 230', grammage: 230, width: 31.5, height: 47.0, pricePerRim: 180000 },
    { name: 'Art Carton 260', grammage: 260, width: 31.5, height: 47.0, pricePerRim: 210000 },
    { name: 'Art Carton 310', grammage: 310, width: 31.5, height: 47.0, pricePerRim: 250000 },
    { name: 'Corrugated Duplex', grammage: 250, width: 70.0, height: 100.0, pricePerRim: 350000 },
    { name: 'Plano FBB', grammage: 250, width: 70.0, height: 100.0, pricePerRim: 380000 },
  ]

  for (const paper of papers) {
    await prisma.paper.upsert({
      where: { id: `${paper.name.toLowerCase().replace(/\s+/g, '-')}-seed` },
      update: paper,
      create: { ...paper, id: `${paper.name.toLowerCase().replace(/\s+/g, '-')}-seed` },
    })
  }
  console.log(`✅ Seeded ${papers.length} papers`)

  const customers = [
    { name: 'CV. Maju Bersama', address: 'Jl. Raya Darmo No. 45, Surabaya', phone: '031-5678901', email: 'info@majubersama.co.id' },
    { name: 'PT. Berkah Printing', address: 'Jl. Basuki Rahmat No. 100, Surabaya', phone: '031-3456789', email: 'order@berkahprinting.com' },
    { name: 'Toko Harapan Baru', address: 'Jl. Pasar Besar No. 22, Jakarta', phone: '021-2345678', email: 'tokoharapan@gmail.com' },
  ]

  for (const customer of customers) {
    await prisma.customer.upsert({
      where: { id: `${customer.name.toLowerCase().replace(/[\s,.]+/g, '-')}-seed` },
      update: customer,
      create: { ...customer, id: `${customer.name.toLowerCase().replace(/[\s,.]+/g, '-')}-seed` },
    })
  }
  console.log(`✅ Seeded ${customers.length} customers`)

  const printingCosts = [
    { id: 'mesin-offset-70', machineName: 'Off-set 1 Warna', grammage: 70, printAreaWidth: 29.7, printAreaHeight: 42.0, pricePerColor: 500, specialColorPrice: 1500, minimumPrintQuantity: 500, priceAboveMinimumPerSheet: 400, platePricePerSheet: 150 },
    { id: 'mesin-offset-120', machineName: 'Off-set 1 Warna', grammage: 120, printAreaWidth: 29.7, printAreaHeight: 42.0, pricePerColor: 650, specialColorPrice: 1800, minimumPrintQuantity: 300, priceAboveMinimumPerSheet: 550, platePricePerSheet: 150 },
    { id: 'mesin-digital-70', machineName: 'Mesin Digital', grammage: 70, printAreaWidth: 21.0, printAreaHeight: 29.7, pricePerColor: 1000, specialColorPrice: 2500, minimumPrintQuantity: 1, priceAboveMinimumPerSheet: 800, platePricePerSheet: 0 },
  ]

  for (const cost of printingCosts) {
    await prisma.printingCost.upsert({
      where: { id: cost.id },
      update: cost,
      create: cost,
    })
  }
  console.log(`✅ Seeded ${printingCosts.length} printing costs`)

  const finishings = [
    { id: 'fin-laminating-glossy', name: 'Laminating Glossy', minimumSheets: 50, minimumPrice: 5000, additionalPrice: 100, pricePerCm: 35 },
    { id: 'fin-laminating-doff', name: 'Laminating Doff', minimumSheets: 50, minimumPrice: 5000, additionalPrice: 100, pricePerCm: 35 },
    { id: 'fin-uv-spot', name: 'UV Spot', minimumSheets: 100, minimumPrice: 10000, additionalPrice: 200, pricePerCm: 50 },
    { id: 'fin-emboss', name: 'Emboss', minimumSheets: 50, minimumPrice: 8000, additionalPrice: 200, pricePerCm: 45 },
    { id: 'fin-deboss', name: 'Deboss', minimumSheets: 50, minimumPrice: 8000, additionalPrice: 200, pricePerCm: 45 },
    { id: 'fin-hotprint-gold', name: 'Hot Print Gold', minimumSheets: 100, minimumPrice: 15000, additionalPrice: 300, pricePerCm: 60 },
    { id: 'fin-hotprint-silver', name: 'Hot Print Silver', minimumSheets: 100, minimumPrice: 15000, additionalPrice: 300, pricePerCm: 60 },
    { id: 'fin-potong-standar', name: 'Potong Standar', minimumSheets: 1, minimumPrice: 1000, additionalPrice: 0, pricePerCm: 5 },
    { id: 'fin-folding', name: 'Folding / Lipat', minimumSheets: 100, minimumPrice: 3000, additionalPrice: 50, pricePerCm: 15 },
    { id: 'fin-spine', name: 'Spine / Jilid', minimumSheets: 25, minimumPrice: 5000, additionalPrice: 100, pricePerCm: 30 },
  ]

  for (const finishing of finishings) {
    await prisma.finishing.upsert({
      where: { id: finishing.id },
      update: finishing,
      create: finishing,
    })
  }
  console.log(`✅ Seeded ${finishings.length} finishings`)

  const settings = [
    { key: 'appName', value: 'Sistem Cetak' },
    { key: 'companyName', value: 'Percetakan' },
    { key: 'currency', value: 'IDR' },
    { key: 'defaultProfitPercent', value: '10' },
    { key: 'packingCostDefault', value: '5000' },
    { key: 'shippingCostDefault', value: '15000' },
  ]

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    })
  }
  console.log(`✅ Seeded ${settings.length} settings`)
  console.log('🎉 Database seeding completed!')
}

main()
  .catch((e) => { console.error('❌ Seed error:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
