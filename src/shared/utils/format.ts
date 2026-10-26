/** 2.5 -> "2½" */
export function formatQuantity(quantity: number): string {
  const whole = Math.floor(quantity)
  const half = quantity - whole === 0.5
  if (!half) return String(whole)
  return whole === 0 ? '½' : `${whole}½`
}

export function formatPoints(points: number): string {
  return formatQuantity(points)
}

export function pointsLabel(points: number): string {
  return `${formatPoints(points)} ${points === 1 || points === 0.5 ? 'punto' : 'puntos'}`
}

export function portionsLabel(quantity: number): string {
  return `${formatQuantity(quantity)} ${quantity === 1 || quantity === 0.5 ? 'porción' : 'porciones'}`
}

const dateFormat = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

export function formatDate(iso: string): string {
  return dateFormat.format(new Date(iso))
}
