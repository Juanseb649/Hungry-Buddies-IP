import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'

type Lead = 'a' | 'b' | 'both'

const IN_MS = 520
const OUT_MS = 560

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Contorno de una salpicadura: un círculo con lóbulos irregulares. */
function splatPath(seed: number): string {
  const points: string[] = []
  for (let i = 0; i <= 96; i++) {
    const t = (i / 96) * Math.PI * 2
    const r = 40 + 4.5 * Math.sin(7 * t + seed) + 3 * Math.sin(3 * t + seed * 2) + 1.5 * Math.sin(13 * t)
    points.push(`${(50 + r * Math.cos(t)).toFixed(2)},${(50 + r * Math.sin(t)).toFixed(2)}`)
  }
  return `M${points.join('L')}Z`
}

const DROPS = [
  [92, 22, 4],
  [10, 70, 5],
  [80, 92, 3],
  [18, 12, 3],
  [96, 62, 2.5],
] as const

function Splat({ seed, className }: { seed: number; className: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
      <path d={splatPath(seed)} />
      {DROPS.map(([cx, cy, r], i) => (
        <circle key={i} cx={((cx + seed * 7) % 88) + 6} cy={cy} r={r} />
      ))}
    </svg>
  )
}

type SplashNavigate = (to: string, lead?: Lead) => Promise<void>

const SplashContext = createContext<SplashNavigate | null>(null)

/** Navega tapando la pantalla con una salpicadura de ketchup y mostaza. Para momentos clave. */
export function useSplashNavigate(): SplashNavigate {
  const go = useContext(SplashContext)
  if (!go) throw new Error('useSplashNavigate debe usarse dentro de <SplashProvider>')
  return go
}

export function SplashProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [state, setState] = useState<{ phase: 'in' | 'out'; lead: Lead } | null>(null)

  const go = useCallback<SplashNavigate>(
    async (to, lead = 'both') => {
      if (prefersReducedMotion()) {
        navigate(to)
        return
      }
      setState({ phase: 'in', lead })
      await wait(IN_MS)
      navigate(to)
      setState({ phase: 'out', lead })
      await wait(OUT_MS)
      setState(null)
    },
    [navigate],
  )

  // El "frente" de la salpicadura es el color del protagonista (por ejemplo, el ganador).
  const front = state?.lead === 'b' ? 'b' : 'a'
  const back = front === 'a' ? 'b' : 'a'

  return (
    <SplashContext value={go}>
      {children}
      {state && (
        <div className="splat" data-phase={state.phase} aria-hidden="true">
          <Splat seed={2} className={`splat__blob splat__blob--back splat--${back}`} />
          <Splat seed={5} className={`splat__blob splat__blob--front splat--${front}`} />
        </div>
      )}
    </SplashContext>
  )
}

/** Pantalla de bienvenida al abrir la app. */
export function LaunchSplash({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (prefersReducedMotion()) {
      onDone()
      return
    }
    const leave = setTimeout(() => setLeaving(true), 1350)
    const done = setTimeout(onDone, 1350 + 450)
    return () => {
      clearTimeout(leave)
      clearTimeout(done)
    }
  }, [onDone])

  return (
    <div className="launch" data-leaving={leaving || undefined} role="presentation">
      <Splat seed={3} className="launch__splat splat--b" />
      <Splat seed={6} className="launch__splat launch__splat--front splat--a" />
      <p className="launch__title" aria-label="Hungry Buddies">
        <span data-slot="a">Hungry</span>
        <span data-slot="b">Buddies</span>
      </p>
    </div>
  )
}
