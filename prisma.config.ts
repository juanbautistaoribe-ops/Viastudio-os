import { defineConfig } from 'prisma/config'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env' })

export default defineConfig({
  datasource: {
    provider: 'postgresql',
    url: process.env.DATABASE_URL ?? '',
    directUrl: process.env.DIRECT_URL,
  },
})
