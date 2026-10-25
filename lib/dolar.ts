// Dólar blue del día (DolarAPI, gratuita). Cacheado 1 hora; null si la API no responde.
export type Dolar = { compra: number; venta: number; fecha: string }

export async function getDolarBlue(): Promise<Dolar | null> {
  try {
    const res = await fetch('https://dolarapi.com/v1/dolares/blue', { next: { revalidate: 3600 } })
    if (!res.ok) return null
    const d = await res.json()
    if (typeof d?.venta !== 'number') return null
    return { compra: d.compra, venta: d.venta, fecha: d.fechaActualizacion }
  } catch {
    return null
  }
}
