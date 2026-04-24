// Swap Prisma provider for Vercel build (sqlite → postgresql)
const fs = require('fs')
const path = require('path')

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma')
let content = fs.readFileSync(schemaPath, 'utf8')
content = content.replace('provider = "sqlite"', 'provider = "postgresql"')
fs.writeFileSync(schemaPath, content)
console.log('✅ Schema provider swapped to postgresql')
