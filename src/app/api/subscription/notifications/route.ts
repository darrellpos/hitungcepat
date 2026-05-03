import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/subscription/notifications?userId=xxx - List notifications
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      )
    }

    const notifications = await db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })

    const unreadCount = notifications.filter((n) => !n.isRead).length

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        unreadCount,
        total: notifications.length,
      },
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

// POST /api/subscription/notifications - Mark all as read
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, action, notificationId } = body

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      )
    }

    if (action === 'read-all') {
      await db.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
      })

      return NextResponse.json({
        success: true,
        message: 'All notifications marked as read',
      })
    }

    if (action === 'read' && notificationId) {
      const notification = await db.notification.findFirst({
        where: { id: notificationId, userId },
      })

      if (!notification) {
        return NextResponse.json(
          { success: false, error: 'Notification not found' },
          { status: 404 }
        )
      }

      await db.notification.update({
        where: { id: notificationId },
        data: { isRead: true },
      })

      return NextResponse.json({
        success: true,
        message: 'Notification marked as read',
      })
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action. Use "read-all" or "read" with notificationId.' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error updating notifications:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update notifications' },
      { status: 500 }
    )
  }
}
