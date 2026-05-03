const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || ''
const MIDTRANS_IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === 'true'

export function getMidtransConfig() {
  return {
    isProduction: MIDTRANS_IS_PRODUCTION,
    serverKey: MIDTRANS_SERVER_KEY,
    clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || '',
  }
}

export async function createSnapTransaction(params: {
  orderId: string
  amount: number
  customerName: string
  customerEmail: string
  customerPhone: string
  planName: string
  userId: string
}) {
  const snap = await import('midtrans-client').then(m => new m.Snap({
    isProduction: MIDTRANS_IS_PRODUCTION,
    serverKey: MIDTRANS_SERVER_KEY,
  }))

  const transaction = await snap.createTransaction({
    transaction_details: {
      order_id: params.orderId,
      gross_amount: params.amount,
    },
    item_details: [{
      id: params.planName.toLowerCase().replace(/\s+/g, '-'),
      price: params.amount,
      quantity: 1,
      name: `Paket ${params.planName}`,
    }],
    customer_details: {
      first_name: params.customerName,
      email: params.customerEmail,
      phone: params.customerPhone,
    },
    callbacks: {
      finish: `${process.env.NEXT_PUBLIC_BASE_URL || ''}/?payment=finish`,
      error: `${process.env.NEXT_PUBLIC_BASE_URL || ''}/?payment=error`,
      pending: `${process.env.NEXT_PUBLIC_BASE_URL || ''}/?payment=pending`,
    },
    credit_card: {
      secure: true,
    },
  })

  return transaction
}

export function verifySignature(orderId: string, statusCode: string, grossAmount: string, serverKey: string, signatureKey: string): boolean {
  const crypto = require('crypto')
  const hash = crypto.createHash('sha512')
    .update(orderId + statusCode + grossAmount + serverKey)
    .digest('hex')
  return hash === signatureKey
}

export function generateOrderId(prefix: string = 'SUB'): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `${prefix}-${timestamp}-${random}`
}

// Simulated VA numbers for demo (when Midtrans sandbox is unavailable)
export function generateVirtualAccount(provider: string): string {
  const prefixes: Record<string, string> = {
    bca: '8800',
    bni: '8001',
    bri: '1088',
    mandiri: '8900',
    permata: '70001234',
  }
  const prefix = prefixes[provider] || '8800'
  const random = Math.floor(Math.random() * 9000000000 + 1000000000).toString()
  return `${prefix}${random}`
}
