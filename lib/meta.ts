import { getDolarBlue } from '@/lib/dolar'

// Meta Marketing API (read only). The token is a system user's from the ViaStudio business portfolio,
// with the clients' ad accounts shared to it as partner ("Ver rendimiento").

const GRAPH = `https://graph.facebook.com/${process.env.META_API_VERSION ?? 'v23.0'}`

export function metaConfigured() {
  return !!process.env.META_ACCESS_TOKEN
}

async function graph<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const token = process.env.META_ACCESS_TOKEN
  if (!token) throw new Error('Falta META_ACCESS_TOKEN en Vercel')
  const url = new URL(`${GRAPH}/${path}`)
  for (const [k, v] of Object.entries({ ...params, access_token: token })) url.searchParams.set(k, v)
  const res = await fetch(url, { cache: 'no-store' })
  const json = await res.json()
  if (!res.ok || json.error) throw new Error(`Meta: ${json.error?.message ?? res.status}`)
  return json as T
}

// Follows paging.next up to a few pages
async function graphAll<T>(path: string, params: Record<string, string>): Promise<T[]> {
  const first = await graph<{ data: T[]; paging?: { next?: string } }>(path, { limit: '100', ...params })
  const rows = [...first.data]
  let next = first.paging?.next
  for (let i = 0; next && i < 5; i++) {
    const res = await fetch(next, { cache: 'no-store' })
    const json = await res.json()
    if (!res.ok || json.error) break
    rows.push(...json.data)
    next = json.paging?.next
  }
  return rows
}

export type AdAccount = { id: string; name: string; status: string; currency: string; business: string | null }

const ACCOUNT_STATUS: Record<number, string> = { 1: 'activa', 2: 'deshabilitada', 3: 'pago pendiente', 7: 'en revisión', 8: 'pendiente de cierre', 9: 'en período de gracia', 101: 'cerrada' }

export async function adAccounts(): Promise<AdAccount[]> {
  const rows = await graphAll<{ id: string; name: string; account_status: number; currency: string; business?: { name: string } }>(
    'me/adaccounts', { fields: 'name,account_status,currency,business{name}' })
  return rows.map((a) => ({ id: a.id, name: a.name, status: ACCOUNT_STATUS[a.account_status] ?? String(a.account_status), currency: a.currency, business: a.business?.name ?? null }))
}

type Action = { action_type: string; value: string }
type InsightRow = {
  spend?: string; impressions?: string; reach?: string; inline_link_clicks?: string; frequency?: string
  actions?: Action[]; ad_id?: string; ad_name?: string; campaign_name?: string; objective?: string
}

// What counts as "a result" for a small business, in priority order. The first one with data wins
const RESULTS: { types: string[]; label: string; singular: string }[] = [
  { types: ['onsite_conversion.messaging_conversation_started_7d'], label: 'conversaciones iniciadas', singular: 'conversación' },
  { types: ['lead', 'onsite_conversion.lead_grouped', 'offsite_conversion.fb_pixel_lead'], label: 'leads', singular: 'lead' },
  { types: ['purchase', 'offsite_conversion.fb_pixel_purchase', 'onsite_web_purchase'], label: 'compras', singular: 'compra' },
  { types: ['link_click'], label: 'clics al link', singular: 'clic' },
]

function actionCount(actions: Action[] | undefined, types: string[]) {
  // Several types can describe the same event (lead vs lead_grouped): take the largest, don't add them up
  return Math.max(0, ...(actions ?? []).filter((a) => types.includes(a.action_type)).map((a) => Number(a.value) || 0))
}

export type Metrics = { spend: number; impressions: number; reach: number; clicks: number; frequency: number; results: number; costPerResult: number | null }

function metrics(row: InsightRow | undefined, resultTypes: string[]): Metrics {
  const spend = Number(row?.spend ?? 0)
  const results = actionCount(row?.actions, resultTypes)
  return {
    spend,
    impressions: Number(row?.impressions ?? 0),
    reach: Number(row?.reach ?? 0),
    clicks: Number(row?.inline_link_clicks ?? 0),
    frequency: Number(row?.frequency ?? 0),
    results,
    costPerResult: results ? spend / results : null,
  }
}

const FIELDS = 'spend,impressions,reach,inline_link_clicks,frequency,actions'

function range(period: string) {
  const [y, m] = period.split('-').map(Number)
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return JSON.stringify({ since: `${period}-01`, until: `${period}-${String(last).padStart(2, '0')}` })
}

export function previousPeriod(period: string) {
  const [y, m] = period.split('-').map(Number)
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`
}

export type ReportData = {
  period: string
  account: { id: string; name: string; currency: string }
  resultLabel: string
  resultSingular: string
  current: Metrics
  previous: Metrics
  campaigns: { name: string; spend: number; results: number; costPerResult: number | null }[]
  topAds: { name: string; spend: number; results: number; costPerResult: number | null; thumbnail: string | null }[]
}

type Raw = { id: string; name: string; currency: string; cur?: InsightRow; prev?: InsightRow; campaigns: InsightRow[]; ads: InsightRow[] }

async function fetchAccount(id: string, period: string): Promise<Raw> {
  const [account, cur, prev, campaigns, ads] = await Promise.all([
    graph<{ name: string; currency: string }>(id, { fields: 'name,currency' }),
    graph<{ data: InsightRow[] }>(`${id}/insights`, { fields: FIELDS, time_range: range(period) }),
    graph<{ data: InsightRow[] }>(`${id}/insights`, { fields: FIELDS, time_range: range(previousPeriod(period)) }),
    graphAll<InsightRow>(`${id}/insights`, { level: 'campaign', fields: `campaign_name,${FIELDS}`, time_range: range(period) }),
    graphAll<InsightRow>(`${id}/insights`, { level: 'ad', fields: `ad_id,ad_name,${FIELDS}`, time_range: range(period) }),
  ])
  return { id, name: account.name, currency: account.currency, cur: cur.data[0], prev: prev.data[0], campaigns, ads }
}

// Totals of several accounts. Reach is added up: the same person reached by two accounts counts twice
function sum(ms: Metrics[]): Metrics {
  if (ms.length === 1) return ms[0]
  const t = ms.reduce((a, m) => ({ ...a, spend: a.spend + m.spend, impressions: a.impressions + m.impressions, reach: a.reach + m.reach, clicks: a.clicks + m.clicks, results: a.results + m.results }))
  return { ...t, frequency: t.reach ? t.impressions / t.reach : 0, costPerResult: t.results ? t.spend / t.results : null }
}

// accountIds: one id or several separated by commas (a client with more than one ad account).
// Several accounts make one report; if they're in different currencies everything goes to pesos at the blue rate
export async function accountReport(accountIds: string, period: string): Promise<ReportData> {
  const ids = accountIds.split(',').map((a) => a.trim()).filter(Boolean).map((a) => (a.startsWith('act_') ? a : `act_${a}`))
  const raw = await Promise.all(ids.map((id) => fetchAccount(id, period)))
  const currencies = [...new Set(raw.map((a) => a.currency))]
  const currency = currencies.length === 1 ? currencies[0] : 'ARS'
  let blue = 1
  if (currencies.length > 1) {
    const odd = currencies.find((c) => c !== 'ARS' && c !== 'USD')
    if (odd) throw new Error(`No sé pasar ${odd} a pesos`)
    const dolar = await getDolarBlue()
    if (!dolar) throw new Error('No pude obtener el dólar blue para sumar cuentas en pesos y dólares')
    blue = dolar.venta
  }
  const rate = (a: Raw) => (a.currency === currency ? 1 : blue)
  const kind = RESULTS.find((r) => raw.some((a) => actionCount(a.cur?.actions, r.types) > 0)) ?? RESULTS[RESULTS.length - 1]
  const m = (row: InsightRow | undefined, a: Raw) => {
    const x = metrics(row, kind.types)
    const spend = x.spend * rate(a)
    return { ...x, spend, costPerResult: x.results ? spend / x.results : null }
  }

  const byResults = <T extends { results: number; spend: number }>(a: T, b: T) => b.results - a.results || b.spend - a.spend
  const adRows = raw.flatMap((a) => a.ads.map((ad) => ({ id: ad.ad_id!, name: ad.ad_name ?? 'Anuncio', ...m(ad, a) }))).filter((a) => a.spend > 0).sort(byResults).slice(0, 3)
  // Thumbnails are Meta CDN links: fine for the weeks a report is read
  const thumbs = await Promise.all(adRows.map((a) =>
    graph<{ creative?: { thumbnail_url?: string; image_url?: string } }>(a.id, { fields: 'creative{thumbnail_url,image_url}', thumbnail_width: '400', thumbnail_height: '400' })
      .then((r) => r.creative?.image_url ?? r.creative?.thumbnail_url ?? null)
      .catch(() => null)))

  return {
    period,
    account: { id: ids.join(','), name: raw.map((a) => a.name).join(' + '), currency },
    resultLabel: kind.label,
    resultSingular: kind.singular,
    current: sum(raw.map((a) => m(a.cur, a))),
    previous: sum(raw.map((a) => m(a.prev, a))),
    campaigns: raw.flatMap((a) => a.campaigns.map((c) => ({ name: c.campaign_name ?? 'Campaña', ...m(c, a) }))).filter((c) => c.spend > 0).sort(byResults)
      .map(({ name, spend, results, costPerResult }) => ({ name, spend, results, costPerResult })),
    topAds: adRows.map((a, i) => ({ name: a.name, spend: a.spend, results: a.results, costPerResult: a.costPerResult, thumbnail: thumbs[i] })),
  }
}
