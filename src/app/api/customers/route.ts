import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getServerUser, getDataFilter, requireAuth } from '@/lib/server-auth'
import { ensureSeedData } from '@/lib/auto-seed'

export async function GET(request: NextRequest) {
  try {
    const user = getServerUser(request)
    // Auto-seed if tables are empty (runs only once per serverless instance)
    await ensureSeedData(user?.id)
    const customers = await db.customer.findMany({
      where: await getDataFilter(user),
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(customers)
  } catch (error: any) {
    console.error('Error fetching customers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch customers', details: error?.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authErr = requireAuth(request)
    if (authErr) return authErr
    const user = getServerUser(request)!
    const body = await request.json()
    const { name, companyName, address, phone, email } = body

    if (!name || !address || !phone || !email) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    const customer = await db.customer.create({
      data: { name, companyName: companyName || null, address, phone, email, userId: user?.id || null }
    })

    return NextResponse.json(customer, { status: 201 })
  } catch (error: any) {
    console.error('Error creating customer:', error)
    return NextResponse.json(
      { error: 'Failed to create customer', details: error?.message },
      { status: 500 }
    )
  }
}
