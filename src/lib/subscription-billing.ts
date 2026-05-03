import { db } from '@/lib/db'

/**
 * Subscription Billing Utility
 * Handles auto-billing, retry logic, and payment simulation
 */

function generateTransactionId(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `TXN-RENEW-${timestamp}-${random}`
}

function generateVANumber(provider: string): string {
  const prefixes: Record<string, string> = {
    BCA: '8800',
    Mandiri: '8900',
    BNI: '8700',
    BRI: '8600',
    Permata: '7100',
  }
  const prefix = prefixes[provider] || '8800'
  const segment1 = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  const segment2 = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  const segment3 = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `${prefix}-${segment1}-${segment2}-${segment3}`
}

function getRetryInterval(retryCount: number): number {
  // Exponential backoff: 1h, 6h, 24h
  const intervals = [1, 6, 24]
  return intervals[Math.min(retryCount, intervals.length - 1)]
}

/**
 * Process auto-billing for active subscriptions expiring within 3 days
 * Creates PaymentRecord for each and implements retry logic
 */
export async function processAutoBilling(): Promise<{
  processed: number
  skipped: number
  errors: number
  details: Array<{ subscriptionId: string; action: string; message: string }>
}> {
  const result = {
    processed: 0,
    skipped: 0,
    errors: 0,
    details: [] as Array<{ subscriptionId: string; action: string; message: string }>,
  }

  try {
    const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)

    // Find active subscriptions expiring within 3 days that have auto-renew enabled
    const expiringSubscriptions = await db.userSubscription.findMany({
      where: {
        status: 'active',
        autoRenew: true,
        endDate: {
          lte: threeDaysFromNow,
        },
      },
      include: {
        plan: true,
      },
    })

    for (const subscription of expiringSubscriptions) {
      try {
        // Check if there's already a pending payment for this subscription
        const existingPending = await db.paymentRecord.findFirst({
          where: {
            subscriptionId: subscription.id,
            status: 'pending',
          },
        })

        if (existingPending) {
          // Check if the pending payment has expired
          if (existingPending.expiredAt && existingPending.expiredAt < new Date()) {
            // Mark as failed and create retry
            await simulatePaymentFailure(existingPending.id)
            result.details.push({
              subscriptionId: subscription.id,
              action: 'expired_retry',
              message: `Expired payment ${existingPending.id} marked as failed, retry triggered`,
            })
          } else {
            result.skipped++
            result.details.push({
              subscriptionId: subscription.id,
              action: 'skipped',
              message: 'Pending payment already exists and has not expired',
            })
            continue
          }
        }

        // Check for failed payments that can be retried
        const failedPayment = await db.paymentRecord.findFirst({
          where: {
            subscriptionId: subscription.id,
            status: 'failed',
            retryCount: { lt: 3 },
          },
          orderBy: { createdAt: 'desc' },
        })

        if (failedPayment) {
          // Process retry
          await retryPayment(failedPayment.id)
          result.processed++
          result.details.push({
            subscriptionId: subscription.id,
            action: 'retry',
            message: `Payment ${failedPayment.id} retried (attempt ${failedPayment.retryCount + 1})`,
          })
          continue
        }

        // Create new billing payment
        const paymentMethod = subscription.paymentMethodId
          ? await db.paymentMethod.findUnique({
              where: { id: subscription.paymentMethodId },
            })
          : null

        const provider = paymentMethod?.provider || 'BCA'
        const paymentType = paymentMethod?.type || 'bank_transfer'

        let vaNumber = ''
        let ewalletUrl = ''

        if (paymentType === 'bank_transfer') {
          vaNumber = generateVANumber(provider)
        } else if (paymentType === 'ewallet') {
          ewalletUrl = `https://api.sandbox.midtrans.com/v2/${provider}/pay?id=${Date.now()}`
        }

        const transactionId = generateTransactionId()
        const expiredAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

        await db.paymentRecord.create({
          data: {
            userId: subscription.userId,
            subscriptionId: subscription.id,
            paymentMethodId: paymentMethod?.id || null,
            amount: subscription.plan.price,
            currency: subscription.plan.currency,
            status: 'pending',
            paymentType: 'subscription',
            provider,
            transactionId,
            vaNumber,
            ewalletUrl,
            expiredAt,
            metadata: JSON.stringify({
              planName: subscription.plan.name,
              planInterval: subscription.plan.interval,
              billingType: 'auto_renewal',
            }),
          },
        })

        await db.notification.create({
          data: {
            userId: subscription.userId,
            title: 'Billing Reminder',
            message: `Your ${subscription.plan.name} plan will auto-renew soon. A payment of Rp ${subscription.plan.price.toLocaleString('id-ID')} has been created. Please complete the payment.`,
            type: 'info',
            link: '/billing',
          },
        })

        result.processed++
        result.details.push({
          subscriptionId: subscription.id,
          action: 'new_billing',
          message: `New billing payment created for ${subscription.plan.name} plan`,
        })
      } catch (error) {
        result.errors++
        result.details.push({
          subscriptionId: subscription.id,
          action: 'error',
          message: `Error processing subscription: ${error instanceof Error ? error.message : 'Unknown error'}`,
        })
      }
    }

    // Also process retry-eligible payments (not linked to a specific subscription's expiry)
    const retryEligiblePayments = await db.paymentRecord.findMany({
      where: {
        status: 'failed',
        retryCount: { lt: 3 },
        nextRetryAt: { lte: new Date() },
      },
    })

    for (const payment of retryEligiblePayments) {
      try {
        await retryPayment(payment.id)
        result.processed++
        result.details.push({
          subscriptionId: payment.subscriptionId || 'standalone',
          action: 'auto_retry',
          message: `Auto-retry triggered for payment ${payment.id}`,
        })
      } catch (error) {
        result.errors++
      }
    }
  } catch (error) {
    console.error('Error in processAutoBilling:', error)
  }

  return result
}

/**
 * Retry a failed payment
 */
async function retryPayment(paymentId: string): Promise<void> {
  const payment = await db.paymentRecord.findUnique({
    where: { id: paymentId },
  })

  if (!payment) {
    throw new Error('Payment not found')
  }

  if (payment.status !== 'failed') {
    throw new Error('Only failed payments can be retried')
  }

  if (payment.retryCount >= payment.maxRetry) {
    throw new Error('Maximum retry attempts reached')
  }

  const nextRetryHours = getRetryInterval(payment.retryCount)
  const nextRetryAt = new Date(Date.now() + nextRetryHours * 60 * 60 * 1000)

  // Generate new payment details
  const provider = payment.provider || 'BCA'
  const newVANumber = generateVANumber(provider)

  await db.paymentRecord.update({
    where: { id: paymentId },
    data: {
      status: 'pending',
      retryCount: payment.retryCount + 1,
      nextRetryAt,
      vaNumber: newVANumber,
      ewalletUrl: payment.ewalletUrl
        ? `https://api.sandbox.midtrans.com/v2/ewallet/pay?retry=${Date.now()}`
        : payment.ewalletUrl,
      expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  })

  await db.notification.create({
    data: {
      userId: payment.userId,
      title: 'Payment Retry Scheduled',
      message: `Your payment of Rp ${payment.amount.toLocaleString('id-ID')} will be retried. Retry attempt ${payment.retryCount + 1} of ${payment.maxRetry}. Next attempt at ${nextRetryAt.toLocaleString('id-ID')}.`,
      type: 'warning',
      link: '/payments',
    },
  })
}

/**
 * Simulate successful payment (for demo purposes)
 */
export async function simulatePaymentSuccess(paymentId: string): Promise<{
  success: boolean
  message: string
  payment?: Record<string, unknown>
}> {
  try {
    const payment = await db.paymentRecord.findUnique({
      where: { id: paymentId },
    })

    if (!payment) {
      return { success: false, message: 'Payment not found' }
    }

    const updatedPayment = await db.paymentRecord.update({
      where: { id: paymentId },
      data: {
        status: 'success',
        paidAt: new Date(),
      },
    })

    // Update subscription if linked
    if (payment.subscriptionId) {
      const subscription = await db.userSubscription.findUnique({
        where: { id: payment.subscriptionId },
        include: { plan: true },
      })

      if (subscription) {
        const now = new Date()
        let endDate: Date | null = null

        if (subscription.plan.interval === 'monthly') {
          endDate = new Date(now)
          endDate.setMonth(endDate.getMonth() + 1)
        } else if (subscription.plan.interval === 'yearly') {
          endDate = new Date(now)
          endDate.setFullYear(endDate.getFullYear() + 1)
        }

        await db.userSubscription.update({
          where: { id: subscription.id },
          data: {
            status: 'active',
            startDate: now,
            endDate,
          },
        })
      }
    }

    await db.notification.create({
      data: {
        userId: payment.userId,
        title: 'Payment Successful',
        message: `Your payment of Rp ${payment.amount.toLocaleString('id-ID')} has been processed successfully. ${payment.subscriptionId ? 'Your subscription has been renewed.' : 'Thank you!'}`,
        type: 'success',
        link: '/billing',
      },
    })

    return {
      success: true,
      message: 'Payment simulated as successful',
      payment: {
        ...updatedPayment,
        metadata: JSON.parse(updatedPayment.metadata || '{}'),
      },
    }
  } catch (error) {
    console.error('Error simulating payment success:', error)
    return {
      success: false,
      message: `Failed to simulate payment: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Simulate payment failure (for demo purposes)
 * Triggers retry logic with exponential backoff
 */
export async function simulatePaymentFailure(paymentId: string): Promise<{
  success: boolean
  message: string
  payment?: Record<string, unknown>
  willRetry?: boolean
  nextRetryAt?: string
}> {
  try {
    const payment = await db.paymentRecord.findUnique({
      where: { id: paymentId },
    })

    if (!payment) {
      return { success: false, message: 'Payment not found' }
    }

    const newRetryCount = payment.retryCount + 1
    const canRetry = newRetryCount < payment.maxRetry
    let nextRetryAt: Date | null = null

    if (canRetry) {
      const intervalHours = getRetryInterval(payment.retryCount)
      nextRetryAt = new Date(Date.now() + intervalHours * 60 * 60 * 1000)
    }

    const updatedPayment = await db.paymentRecord.update({
      where: { id: paymentId },
      data: {
        status: canRetry ? 'failed' : 'failed',
        retryCount: newRetryCount,
        nextRetryAt,
      },
    })

    // If max retries exceeded, mark subscription as past_due
    if (!canRetry && payment.subscriptionId) {
      await db.userSubscription.update({
        where: { id: payment.subscriptionId },
        data: { status: 'past_due' },
      })

      await db.notification.create({
        data: {
          userId: payment.userId,
          title: 'Subscription Payment Failed',
          message: `Your payment of Rp ${payment.amount.toLocaleString('id-ID')} has failed after ${payment.maxRetry} attempts. Your subscription has been marked as past due. Please update your payment method.`,
          type: 'error',
          link: '/billing',
        },
      })
    } else if (canRetry) {
      await db.notification.create({
        data: {
          userId: payment.userId,
          title: 'Payment Failed - Will Retry',
          message: `Your payment of Rp ${payment.amount.toLocaleString('id-ID')} failed. We will automatically retry in ${getRetryInterval(payment.retryCount)} hour(s). Attempt ${newRetryCount} of ${payment.maxRetry}.`,
          type: 'warning',
          link: '/payments',
        },
      })
    } else {
      await db.notification.create({
        data: {
          userId: payment.userId,
          title: 'Payment Failed',
          message: `Your payment of Rp ${payment.amount.toLocaleString('id-ID')} has failed.`,
          type: 'error',
          link: '/payments',
        },
      })
    }

    return {
      success: true,
      message: canRetry
        ? `Payment failed. Retry ${newRetryCount} of ${payment.maxRetry} scheduled.`
        : `Payment failed. Maximum retries (${payment.maxRetry}) exceeded.`,
      payment: {
        ...updatedPayment,
        metadata: JSON.parse(updatedPayment.metadata || '{}'),
      },
      willRetry: canRetry,
      nextRetryAt: nextRetryAt?.toISOString(),
    }
  } catch (error) {
    console.error('Error simulating payment failure:', error)
    return {
      success: false,
      message: `Failed to simulate payment failure: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  reason?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const subscription = await db.userSubscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    })

    if (!subscription) {
      return { success: false, message: 'Subscription not found' }
    }

    await db.userSubscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'cancelled',
        autoRenew: false,
        cancelledAt: new Date(),
        cancelReason: reason || 'User requested cancellation',
      },
    })

    // Cancel any pending payments for this subscription
    await db.paymentRecord.updateMany({
      where: {
        subscriptionId,
        status: 'pending',
      },
      data: { status: 'failed' },
    })

    await db.notification.create({
      data: {
        userId: subscription.userId,
        title: 'Subscription Cancelled',
        message: `Your ${subscription.plan.name} subscription has been cancelled. ${subscription.endDate ? `Your access will continue until ${subscription.endDate.toLocaleDateString('id-ID')}.` : ''}`,
        type: 'info',
        link: '/billing',
      },
    })

    return {
      success: true,
      message: 'Subscription cancelled successfully',
    }
  } catch (error) {
    console.error('Error cancelling subscription:', error)
    return {
      success: false,
      message: `Failed to cancel subscription: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}
