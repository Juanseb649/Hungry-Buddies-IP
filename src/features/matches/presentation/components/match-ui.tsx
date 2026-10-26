import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { PLAYER_SLOTS, type Match, type PlayerSlot } from '../../domain/entities/match'
import { calculateMatchResult } from '../../domain/scoring'
import { formatPoints } from '../../../../shared/utils/format'

export const SLOT_COLOR_NAME: Record<PlayerSlot, string> = { a: 'Ketchup', b: 'Mostaza' }

export function matchPath(match: Pick<Match, 'id' | 'status'>): string {
  switch (match.status) {
    case 'planning':
      return `/match/${match.id}/select`
    case 'eating':
      return `/match/${match.id}/confirm`
    case 'finished':
      return `/match/${match.id}/result`
  }
}

export function Scoreboard({ match, caption }: { match: Match; caption: string }) {
  const { points } = calculateMatchResult(match)
  return (
    <section className="scoreboard" aria-label={`Marcador: ${caption}`}>
      {PLAYER_SLOTS.map((slot) => (
        <div key={slot} className="scoreboard__side" data-slot={slot}>
          <span className="scoreboard__name">{match.players[slot].displayName}</span>
          <span className="scoreboard__points">{formatPoints(points[slot])}</span>
        </div>
      ))}
      <p className="scoreboard__caption">{caption}</p>
    </section>
  )
}

export function PlayerToggle({
  match,
  active,
  onChange,
  count,
}: {
  match: Match
  active: PlayerSlot
  onChange: (slot: PlayerSlot) => void
  /** Cantidad de comidas por jugador, para mostrarla en la pestaña. */
  count: (slot: PlayerSlot) => number
}) {
  return (
    <div className="player-toggle" role="tablist" aria-label="Jugador">
      {PLAYER_SLOTS.map((slot) => (
        <button
          key={slot}
          type="button"
          role="tab"
          aria-selected={active === slot}
          className="player-toggle__tab"
          data-slot={slot}
          onClick={() => onChange(slot)}
        >
          <span>{match.players[slot].displayName}</span>
          <span className="player-toggle__count">{count(slot)}</span>
        </button>
      ))}
    </div>
  )
}

const STACK_HEIGHT = 240
const PLATE_MAX = 22

const plateCount = (points: number) => Math.ceil(points)

/** Grosor de plato común a las dos pilas, para que la altura se pueda comparar. */
export function plateHeightFor(...points: number[]): number {
  const most = Math.max(1, ...points.map(plateCount))
  return Math.min(PLATE_MAX, STACK_HEIGHT / most)
}

/** Cada punto es un plato. Media porción de un plato de 1 punto es medio plato. */
export function PlateStack({
  points,
  slot,
  name,
  isWinner,
  animate,
  plateHeight,
}: {
  plateHeight: number
  points: number
  slot: PlayerSlot
  name: string
  isWinner: boolean
  animate: boolean
}) {
  const whole = Math.floor(points)
  const half = points - whole >= 0.5
  const count = plateCount(points)
  const plate = plateHeight
  const delayStep = Math.min(60, 1100 / Math.max(count, 1))
  return (
    <figure className="stack" data-slot={slot} data-winner={isWinner || undefined}>
      <div className="stack__plates" style={{ height: STACK_HEIGHT }} aria-hidden="true">
        {Array.from({ length: count }, (_, i) => (
          <span
            key={i}
            className="stack__plate"
            data-half={(half && i === count - 1) || undefined}
            data-animate={animate || undefined}
            style={{ '--plate-h': `${plate}px`, '--delay': `${i * delayStep}ms` } as CSSProperties}
          />
        ))}
        {count === 0 && <span className="stack__empty">Mesa vacía</span>}
      </div>
      <figcaption>
        <span className="stack__points">{formatPoints(points)}</span>
        <span className="stack__name">{name}</span>
      </figcaption>
    </figure>
  )
}

export function MatchNotFound({ message }: { message: string }) {
  return (
    <div className="page">
      <h1 className="page-title">Partida no encontrada</h1>
      <p>{message}</p>
      <Link className="btn btn--primary" to="/">
        Ir al inicio
      </Link>
    </div>
  )
}
