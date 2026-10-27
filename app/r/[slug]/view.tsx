// Monthly Meta Ads report body (public page /r/{slug})
import { change, fmtMoney, monthLabel } from '@/lib/meta-reports'
import { previousPeriod, type ReportData } from '@/lib/meta'

const num = (n: number) => n.toLocaleString('es-AR')

// lowerIsBetter: for costs, going down is good news. neutral: spend, neither good nor bad
function Delta({ cur, prev, lowerIsBetter = false, neutral = false }: { cur: number; prev: number; lowerIsBetter?: boolean; neutral?: boolean }) {
  const pct = change(cur, prev)
  if (pct === null || cur === 0) return null
  const good = pct === 0 || neutral ? null : (pct < 0) === lowerIsBetter
  return (
    <p className="mt-1 text-xs" style={{ color: good === null ? 'var(--color-text-muted)' : good ? 'var(--color-success)' : '#F5A524' }}>
      {pct > 0 ? '▲' : pct < 0 ? '▼' : '='} {Math.abs(pct)}% vs mes anterior
    </p>
  )
}

function Kpi({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <div className="card p-4">
      <p className="text-xs" style={{ color: 'var(--color-text-2)' }}>{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
      {children}
    </div>
  )
}

export function ReportView({ company, period, data: d, summary }: { company: string; period: string; data: ReportData; summary: string | null }) {
  const cur = d.current
  const prev = d.previous
  const ccy = d.account.currency
  const month = monthLabel(period)
  const [resumen, proximo] = (summary ?? '').split('\n\n')

  return (
    <main className="min-h-full px-4 py-10" style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}>
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/via-logo.svg" alt="ViaStudio" className="h-10 w-10 rounded-xl object-cover" />
          <div>
            <p className="text-sm font-semibold">ViaStudio</p>
            <p className="text-xs" style={{ color: 'var(--color-text-2)' }}>Marketing digital y automatización · Reconquista</p>
          </div>
        </header>

        <section className="rounded-2xl p-6" style={{ background: 'linear-gradient(135deg, #3300A6 0%, #6F2BFA 100%)' }}>
          <p className="text-xs font-medium uppercase tracking-wide opacity-80">Reporte de anuncios · {company}</p>
          <h1 className="mt-2 text-2xl font-bold leading-tight first-letter:uppercase">{month}</h1>
          <p className="mt-3 text-sm opacity-90">Tus anuncios en Facebook e Instagram, comparados con {monthLabel(previousPeriod(period))}.</p>
        </section>

        {cur.spend === 0 ? (
          <section className="card p-5 text-sm" style={{ color: 'var(--color-text-2)' }}>
            Este mes no hubo anuncios activos en la cuenta.
          </section>
        ) : (
          <>
            <section className="grid grid-cols-2 gap-3">
              <Kpi label={d.resultLabel.charAt(0).toUpperCase() + d.resultLabel.slice(1)} value={num(cur.results)}>
                <Delta cur={cur.results} prev={prev.results} />
              </Kpi>
              <Kpi label={`Costo por ${d.resultSingular}`} value={cur.costPerResult ? fmtMoney(cur.costPerResult, ccy) : '-'}>
                {cur.costPerResult && prev.costPerResult ? <Delta cur={cur.costPerResult} prev={prev.costPerResult} lowerIsBetter /> : null}
              </Kpi>
              <Kpi label="Inversión" value={fmtMoney(cur.spend, ccy)}>
                <Delta cur={cur.spend} prev={prev.spend} neutral />
              </Kpi>
              <Kpi label="Personas alcanzadas" value={num(cur.reach)}>
                <Delta cur={cur.reach} prev={prev.reach} />
              </Kpi>
            </section>

            {resumen && (
              <section className="card p-5">
                <h2 className="mb-2 text-sm font-semibold" style={{ color: 'var(--color-accent)' }}>Cómo nos fue</h2>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-2)' }}>{resumen}</p>
              </section>
            )}

            {d.topAds.length > 0 && (
              <section className="card p-5">
                <h2 className="mb-3 text-sm font-semibold" style={{ color: 'var(--color-accent)' }}>Los anuncios que mejor funcionaron</h2>
                <ul className="space-y-3">
                  {d.topAds.map((a, i) => (
                    <li key={a.name + i} className="flex items-center gap-3">
                      {a.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.thumbnail} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                      ) : (
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg text-lg font-bold" style={{ background: 'var(--color-border-subtle)' }}>{i + 1}</div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{a.name}</p>
                        <p className="text-xs" style={{ color: 'var(--color-text-2)' }}>
                          {num(a.results)} {d.resultLabel}{a.costPerResult ? ` · ${fmtMoney(a.costPerResult, ccy)} c/u` : ''} · {fmtMoney(a.spend, ccy)} invertidos
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {d.campaigns.length > 1 && (
              <section className="card p-5">
                <h2 className="mb-3 text-sm font-semibold" style={{ color: 'var(--color-accent)' }}>Por campaña</h2>
                <ul className="divide-y text-sm" style={{ borderColor: 'var(--color-border-subtle)' }}>
                  {d.campaigns.map((c, i) => (
                    <li key={c.name + i} className="py-2" style={{ borderColor: 'var(--color-border-subtle)' }}>
                      <p>{c.name}</p>
                      <p className="text-xs tabular-nums" style={{ color: 'var(--color-text-2)' }}>
                        {num(c.results)} {d.resultLabel}{c.costPerResult ? ` · ${fmtMoney(c.costPerResult, ccy)} c/u` : ''} · {fmtMoney(c.spend, ccy)} invertidos
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="grid grid-cols-2 gap-3">
              <Kpi label="Veces que se vieron" value={num(cur.impressions)} />
              <Kpi label="Clics al link" value={num(cur.clicks)} />
            </section>

            {proximo && (
              <section className="card p-5">
                <h2 className="mb-2 text-sm font-semibold" style={{ color: 'var(--color-accent)' }}>Para el mes que viene</h2>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-2)' }}>{proximo}</p>
              </section>
            )}
          </>
        )}

        <footer className="pb-6 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Datos de Meta Ads · ViaStudio · Reconquista, Santa Fe
        </footer>
      </div>
    </main>
  )
}
