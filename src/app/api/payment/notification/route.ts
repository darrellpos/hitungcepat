import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const notification = await request.json();

    const {
      transaction_time,
      transaction_status,
      transaction_id,
      status_message,
      status_code,
      signature_key,
      payment_type,
      order_id,
      merchant_id,
      gross_amount,
      fraud_status,
    } = notification;

    // Verify signature
    if (!MIDTRANS_SERVER_KEY || MIDTRANS_SERVER_KEY.includes('XXXXXXXX')) {
      console.error('Midtrans Server Key not configured');
      return NextResponse.json({ status: 'error', message: 'Server key not configured' }, { status: 500 });
    }

    const crypto = await import('crypto');
    const hash = crypto
      .createHash('sha512')
      .update(order_id + status_code + gross_amount + MIDTRANS_SERVER_KEY)
      .digest('hex');

    if (signature_key !== hash) {
      console.error('Invalid signature for order:', order_id);
      return NextResponse.json({ status: 'error', message: 'Invalid signature' }, { status: 403 });
    }

    // Parse order_id to get package info
    // Format: DPOS-{type}-{timestamp}-{random}
    const orderParts = order_id.split('-');
    const packageType = orderParts[1]; // bulanan, tahunan, lifetime

    const packageNames: Record<string, string> = {
      bulanan: 'Langganan Bulanan',
      tahunan: 'Langganan Tahunan',
      lifetime: 'Tanpa Langganan',
    };

    // Determine final status
    let finalStatus = transaction_status;

    if (transaction_status === 'settlement') {
      finalStatus = 'settlement'; // Payment success
    } else if (transaction_status === 'cancel' || transaction_status === 'deny' || transaction_status === 'expire') {
      finalStatus = 'failed';
    } else if (transaction_status === 'pending') {
      finalStatus = 'pending';
    } else if (transaction_status === 'refund') {
      finalStatus = 'refund';
    }

    // Upsert payment record
    try {
      await db.payment.upsert({
        where: { orderId: order_id },
        create: {
          orderId,
          packageName: packageNames[packageType] || packageType,
          packageType: packageType || 'unknown',
          grossAmount: parseFloat(gross_amount) || 0,
          paymentType: payment_type || null,
          transactionId: transaction_id || null,
          transactionTime: transaction_time ? new Date(transaction_time) : null,
          transactionStatus: finalStatus,
          fraudStatus: fraud_status || null,
          metadata: JSON.stringify(notification),
        },
        update: {
          paymentType: payment_type || null,
          transactionId: transaction_id || null,
          transactionTime: transaction_time ? new Date(transaction_time) : null,
          transactionStatus: finalStatus,
          fraudStatus: fraud_status || null,
          metadata: JSON.stringify(notification),
        },
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
    }

    console.log(`Payment notification: ${order_id} - ${finalStatus} (${payment_type})`);

    // Midtrans expects status 200 for successful webhook processing
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Payment notification error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to process notification' },
      { status: 500 }
    );
  }
}
