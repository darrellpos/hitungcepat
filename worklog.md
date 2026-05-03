---
Task ID: 1
Agent: Main Agent
Task: Build Netflix-style Midtrans payment gateway for subscription packages

Work Log:
- Installed midtrans-client npm package
- Added Midtrans sandbox env vars to .env (MIDTRANS_SERVER_KEY, MIDTRANS_CLIENT_KEY, NEXT_PUBLIC_MIDTRANS_CLIENT_KEY)
- Added Payment model to prisma/schema.prisma and ran db push + generate
- Created src/lib/midtrans.ts (Snap transaction, signature verification, save/update helpers)
- Created API routes: /api/midtrans/create-transaction, /api/midtrans/notification, /api/midtrans/check-status
- Built Netflix-style PaymentDialog component (src/components/payment-dialog.tsx) with 5-step flow
- Integrated PaymentDialog into page.tsx via dynamic import with openPayment wiring
- Fixed db import (prisma -> db) across all API routes
- Build passed, dev server running with HTTP 200

Stage Summary:
- Netflix-style dark theme payment dialog with step-by-step flow (Confirm → Info → Method → Paying → Result)
- Supports GoPay, ShopeePay, VA BCA/BNI/Mandiri/BRI, QRIS, Credit Card via Midtrans Snap
- Midtrans webhook auto-extends user subscription on successful payment
- All files saved, build clean, server running
