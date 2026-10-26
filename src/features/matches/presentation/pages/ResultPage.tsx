import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { useMatch } from '../../application/hooks/use-match'
import { useContainer } from '../../../../app/container'
import { Loading } from '../../../../shared/components/ui'
import { calculateMatchResult, consumedPointsOf } from '../../domain/scoring'
import { PLAYER_SLOTS, type Match, type PlayerSlot } from '../../domain/entities/match'
import { formatDate, formatQuantity, pointsLabel, portionsLabel } from '../../../../shared/utils/format'
import { matchPath, MatchNotFound, PlateStack, plateHeightFor } from '../components/match-ui'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Una línea por jugador comparando lo que dijo con lo que hizo. */
export function planVerdict(match: Match, slot: PlayerSlot): string {
  const name = match.players[slot].displayName
  const mine = match.selections.filter((s) => s.slot === slot)
  const planned = mine.reduce((t, s) => t + s.plannedQuantity, 0)
  const eaten = mine.reduce((t, s) => t + (s.consumedQuantity ?? 0), 0)
  const diff = eaten - planned
  if (eaten === 0) return `${name} no probó bocado.`
  if (diff === 0) return `${name} cumplió su plan al pie de la letra.`
  if (diff > 0) return `${name} se comió ${portionsLabel(diff)} más de lo que dijo.`
  return `${name} dejó ${portionsLabel(-diff)} en el plato.`
}

export function ResultPage() {
  const { id = '' } = useParams()
  const m = useMatch(id)
  const { matches } = useContainer()
  const navigate = useNavigate()

  if (m.loading) return <Loading />
  if (m.loadError || !m.match) return <MatchNotFound message={m.loadError?.message ?? ''} />
  const match = m.match
  if (match.status !== 'finished') return <Navigate to={matchPath(match)} replace />

  const { points, winner } = calculateMatchResult(match)
  const margin = Math.abs(points.a - points.b)
  const animate = !prefersReducedMotion()

  async function rematch() {
    const next = await matches.createMatch(match.players.a.displayName, match.players.b.displayName)
    navigate(matchPath(next))
  }

  return (
    <div className="page result">
      <header className="result__head" data-slot={winner === 'tie' ? undefined : winner}>
        <h1 className="result__title">
          {winner === 'tie' ? 'Empate' : `Ganó ${match.players[winner].displayName}`}
        </h1>
        <p className="result__sub">
          {winner === 'tie'
            ? `Los dos llegaron a ${pointsLabel(points.a)}.`
            : `Por ${pointsLabel(margin)} de diferencia.`}
        </p>
      </header>

      <div className="stacks">
        {PLAYER_SLOTS.map((slot) => (
          <PlateStack
            key={slot}
            slot={slot}
            points={points[slot]}
            name={match.players[slot].displayName}
            isWinner={winner === slot}
            animate={animate}
            plateHeight={plateHeightFor(points.a, points.b)}
          />
        ))}
      </div>

      <ul className="verdicts">
        {PLAYER_SLOTS.map((slot) => (
          <li key={slot} data-slot={slot}>
            {planVerdict(match, slot)}
          </li>
        ))}
      </ul>

      {PLAYER_SLOTS.map((slot) => (
        <section key={slot} className="block breakdown" data-slot={slot}>
          <h2 className="block__title">Lo que comió {match.players[slot].displayName}</h2>
          <ul>
            {match.selections
              .filter((s) => s.slot === slot && (s.consumedQuantity ?? 0) > 0)
              .map((s) => (
                <li key={s.id}>
                  <span aria-hidden="true">{s.foodEmoji}</span>
                  <span className="breakdown__name">
                    {formatQuantity(s.consumedQuantity ?? 0)} × {s.foodName}
                  </span>
                  <span className="breakdown__pts">{pointsLabel(consumedPointsOf(s))}</span>
                </li>
              ))}
          </ul>
        </section>
      ))}

      <p className="result__date">Partida cerrada el {formatDate(match.finishedAt ?? match.startedAt)}</p>

      <div className="actions">
        <button type="button" className="btn btn--primary btn--big" onClick={rematch}>
          Jugar la revancha
        </button>
        <Link className="btn btn--ghost" to="/history">
          Ver historial
        </Link>
      </div>
    </div>
  )
}
