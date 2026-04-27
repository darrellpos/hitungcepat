import { NextRequest, NextResponse } from 'next/server';

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || '';
const MIDTRANS_IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === 'true';

const BASE_URL = MIDTRANS_IS_PRODUCTION
  ? 'https://app.midtrans.com/snap/v1'
  : 'https://app.sandbox.midtrans.com/snap/v1';

interface PackageConfig {
  name: string;
  type: string;
  price: number;
}

const PACKAGES: Record<string, PackageConfig> = {
  bulanan: { name: 'Langganan Bulanan', type: 'bulanan', price: 128000 },
  tahunan: { name: 'Langganan Tahunan', type: 'tahunan', price: 888000 },
  lifetime: { name: 'Tanpa Langganan', type: 'lifetime', price: 3888000 },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { packageType, customerName, customerEmail, customerPhone } = body;

    // Validate package type
    const pkg = PACKAGES[packageType];
    if (!pkg) {
      return NextResponse.json(
        { error: 'Paket tidak valid', validPackages: Object.keys(PACKAGES) },
        { status: 400 }
      );
    }

    if (!MIDTRANS_SERVER_KEY || MIDTRANS_SERVER_KEY.includes('XXXXXXXX')) {
      return NextResponse.json(
        { error: 'Midtrans Server Key belum dikonfigurasi. Silakan hubungi admin.' },
        { status: 500 }
      );
    }

    // Generate unique order ID
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const orderId = `DPOS-${pkg.type}-${timestamp}-${random}`;

    // Create Snap transaction via API
    const payload = {
      transaction_details: {
        order_id: orderId,
        gross_amount: pkg.price,
      },
      item_details: [
        {
          id: pkg.type,
          price: pkg.price,
          quantity: 1,
          name: pkg.name,
          category: 'Software Subscription',
          merchant_name: 'Darrell POS',
        },
      ],
      customer_details: {
        first_name: customerName || '',
        email: customerEmail || '',
        phone: customerPhone || '',
      },
      callbacks: {
        finish: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://darrellpos-new.vercel.app'}/payment?status=finish`,
        error: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://darrellpos-new.vercel.app'}/payment?status=error`,
        pending: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://darrellpos-new.vercel.app'}/payment?status=pending`,
      },
    };

    const authString = Buffer.from(MIDTRANS_SERVER_KEY + ':').toString('base64');

    const response = await fetch(`${BASE_URL}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Basic ${authString}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Midtrans API error:', response.status, errorData);
      return NextResponse.json(
        { error: 'Gagal membuat transaksi payment gateway' },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      token: data.token,
      redirect_url: data.redirect_url,
      order_id: orderId,
      package: pkg,
    });
  } catch (error) {
    console.error('Create transaction error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat membuat transaksi' },
      { status: 500 }
    );
  }
}
