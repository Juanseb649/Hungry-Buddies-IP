import { useEffect, useState } from 'react'

/** Milisegundos desde `since` hasta `until` (o hasta ahora, actualizado cada segundo). */
export function useElapsed(since: string, until: string | null = null): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (until) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [until])
  const end = until ? Date.parse(until) : now
  return Math.max(0, end - Date.parse(since))
}

/** 65000 -> "1:05"; 3725000 -> "1:02:05" */
export function formatClock(ms: number): string {
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

/** 65000 -> "1 min"; 3725000 -> "1 h 2 min" */
export function formatDuration(ms: number): string {
  const minutes = Math.max(1, Math.round(ms / 60000))
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}
