import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = createPrismaClient()
}

export const db = process.env.NODE_ENV === 'production'
  ? createPrismaClient()
  : globalForPrisma.prisma!
