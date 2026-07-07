import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL
  const authToken = process.env.DATABASE_AUTH_TOKEN

  if (url?.startsWith('libsql://') && authToken) {
    const { createClient } = require('@libsql/client')
    const adapterModule = require('@prisma/adapter-libsql')
    const Adapter = adapterModule.PrismaLibSql || adapterModule.PrismaLibSQL
    const libsql = createClient({ url, authToken })
    const adapter = new Adapter(libsql)
    return new PrismaClient({ adapter } as any)
  }

  return new PrismaClient({
    log: process.env.NODE_ENV !== 'production' ? ['query'] : [],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db