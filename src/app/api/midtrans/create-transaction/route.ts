import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  createSnapTransaction,
  savePaymentRecord,
} from '@/lib/midtrans';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { packageName, packageType, price, customerName, customerEmail, customerPhone } = body;

    if (!packageName || !packageType || !price || !customerName || !customerEmail || !customerPhone) {
      return NextResponse.json(
        { success: false, message: 'Semua field wajib diisi' },
        { status: 400 }
      );
    }

    // Generate unique order ID
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const orderId = `PKG-${packageType.toUpperCase()}-${timestamp}-${random}`;

    // Save payment record to database
    await savePaymentRecord(db, {
      orderId,
      packageName,
      packageType,
      grossAmount: Number(price),
      customerName,
      customerEmail,
      customerPhone,
    });

    // Create Midtrans snap transaction
    const transaction = await createSnapTransaction({
      orderId,
      amount: Number(price),
      packageName,
      packageType,
      customerName,
      customerEmail,
      customerPhone,
    });

    return NextResponse.json({
      success: true,
      token: transaction.token,
      redirectUrl: transaction.redirect_url,
      orderId,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal membuat transaksi';
    console.error('Create transaction error:', error);
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
