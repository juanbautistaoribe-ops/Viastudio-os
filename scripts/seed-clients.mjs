import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { readFileSync } from 'fs'

// Load .env.local
const envFile = readFileSync('.env.local', 'utf8')
const env = {}
for (const line of envFile.split('\n')) {
  const [key, ...rest] = line.split('=')
  if (key && rest.length) env[key.trim()] = rest.join('=').trim()
}

// Use .env (encoded URL) as fallback
const connString = env.DATABASE_URL?.includes('%')
  ? env.DATABASE_URL
  : env.DATABASE_URL?.replace('!', '%21').replace('*', '%2A')
const adapter = new PrismaPg({ connectionString: connString })
const prisma = new PrismaClient({ adapter })

const clients = [
  {
    name: 'Aura Reconquista',
    company: 'Aura Reconquista',
    email: 'aura@aurareconquista.com',
    status: 'ACTIVE',
    services: ['CONTENT'],
    monthlyValue: 200000,
    currency: 'ARS',
    industry: 'Perfumería',
    planType: 'Solo contenido',
    planNotes: '16 videos/mes',
    startDate: new Date('2025-01-01'),
  },
  {
    name: 'Vive Construcciones',
    company: 'Vive Construcciones',
    email: 'info@viveconstrucciones.com',
    status: 'ACTIVE',
    services: ['SOCIAL_MEDIA', 'CONTENT'],
    monthlyValue: 250000,
    currency: 'ARS',
    industry: 'Construcción',
    planType: 'Plan único',
    planNotes: '',
    startDate: new Date('2025-01-01'),
  },
  {
    name: 'Chapero Automotores',
    company: 'Chapero Automotores',
    email: 'info@chaperoautos.com',
    status: 'ACTIVE',
    services: ['CONTENT', 'PAID_ADS', 'SOCIAL_MEDIA'],
    monthlyValue: 150000,
    currency: 'ARS',
    industry: 'Automotores',
    planType: '2 reels + programación + pauta',
    planNotes: 'A renegociar',
    startDate: new Date('2025-01-01'),
  },
  {
    name: 'Zapatolandia',
    company: 'Zapatolandia',
    email: 'info@zapatolandia.com',
    status: 'ACTIVE',
    services: ['CONTENT', 'PAID_ADS', 'SOCIAL_MEDIA'],
    monthlyValue: 165000,
    currency: 'ARS',
    industry: 'Calzado',
    planType: '3 reels, 10 placas, 1 pauta',
    planNotes: '',
    startDate: new Date('2025-01-01'),
  },
  {
    name: 'Marian',
    company: 'Marian Nutricionista',
    email: 'marian@nutricionista.com',
    status: 'ACTIVE',
    services: ['CONTENT', 'SOCIAL_MEDIA'],
    monthlyValue: 200000,
    currency: 'ARS',
    industry: 'Salud y nutrición',
    planType: '4-5 videos/mes',
    planNotes: '',
    startDate: new Date('2025-01-01'),
  },
  {
    name: '4 Reinas y 1 Buffón',
    company: '4 Reinas y 1 Buffón',
    email: 'info@4reinasyunbuffon.com',
    status: 'ACTIVE',
    services: ['CONTENT', 'SOCIAL_MEDIA'],
    monthlyValue: 200000,
    currency: 'ARS',
    industry: 'Gastronomía',
    planType: 'Historias diarias, fotos, cartas',
    planNotes: '',
    startDate: new Date('2025-01-01'),
  },
  {
    name: 'La Tercera Barbershop',
    company: 'La Tercera Barbershop',
    email: 'info@latercerabarbershop.com',
    status: 'ACTIVE',
    services: ['CONTENT', 'SOCIAL_MEDIA'],
    monthlyValue: 300000,
    currency: 'ARS',
    industry: 'Barbería',
    planType: 'Sin formalizar',
    planNotes: '~$300mil, en negociación hacia plan único',
    startDate: new Date('2025-01-01'),
  },
  {
    name: 'Que Hubo Patrón',
    company: 'Que Hubo Patrón',
    email: 'info@quehubopatron.com',
    status: 'PROSPECT',
    services: ['SOCIAL_MEDIA', 'CONTENT'],
    monthlyValue: 0,
    currency: 'ARS',
    industry: 'Delivery / Gastronomía',
    planType: 'Plan único',
    planNotes: 'Arranca agosto 2025',
    startDate: new Date('2025-08-01'),
  },
  {
    name: 'Kleist',
    company: 'Kleist',
    email: 'info@kleist.com',
    status: 'PROSPECT',
    services: ['SOCIAL_MEDIA', 'CONTENT', 'PAID_ADS'],
    monthlyValue: 0,
    currency: 'ARS',
    industry: 'Electricidad',
    planType: 'Plan único enfocado en venta al público',
    planNotes: 'Arranca agosto 2025',
    startDate: new Date('2025-08-01'),
  },
]

try {
  const existing = await prisma.client.findMany({ select: { name: true } })
  const existingNames = new Set(existing.map(c => c.name))

  for (const c of clients) {
    if (existingNames.has(c.name)) {
      console.log(`Skipping (ya existe): ${c.name}`)
      continue
    }
    await prisma.client.create({ data: c })
    console.log(`Creado: ${c.name}`)
  }
  console.log('\nListo!')
} catch (e) {
  console.error('Error:', e.message)
} finally {
  await prisma.$disconnect()
}
