import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { useMatch } from '../../application/hooks/use-match'
import { useContainer } from '../../../../app/container'
import { Loading } from '../../../../shared/components/ui'
import { prefersReducedMotion, useSplashNavigate } from '../../../../shared/components/splash'
import { calculateMatchResult, favoriteOf, pointsOf } from '../../domain/scoring'
import { PLAYER_SLOTS, type Match, type PlayerSlot } from '../../domain/entities/match'
import { formatDate, formatQuantity, pointsLabel, portionsLabel } from '../../../../shared/utils/format'
import { formatDuration } from '../../../../shared/utils/use-elapsed'
import { matchPath, MatchNotFound, PlateStack, plateHeightFor } from '../components/match-ui'

/** Una línea por jugador con lo que más comió. */
export function favoriteLine(match: Match, slot: PlayerSlot): string {
  const name = match.players[slot].displayName
  const fav = favoriteOf(match, slot)
  if (!fav) return `${name} no probó bocado.`
  return `${name} le dio con todo a ${fav.foodEmoji} ${fav.foodName}: ${portionsLabel(fav.consumedQuantity)}.`
}

export function ResultPage() {
  const { id = '' } = useParams()
  const m = useMatch(id)
  const { matches } = useContainer()
  const navigate = useNavigate()
  const splashTo = useSplashNavigate()

  if (m.loading) return <Loading />
  if (m.loadError || !m.match) return <MatchNotFound message={m.loadError?.message ?? ''} />
  const match = m.match
  if (match.status !== 'finished') return <Navigate to={matchPath(match)} replace />

  const { points, winner } = calculateMatchResult(match)
  const margin = Math.abs(points.a - points.b)
  const plateHeight = plateHeightFor(points.a, points.b)
  const animate = !prefersReducedMotion()
  const duration = formatDuration(Date.parse(match.finishedAt ?? match.startedAt) - Date.parse(match.startedAt))

  async function rematch() {
    const { a, b } = match.players
    try {
      const next = await matches.createMatch(match.menu.id, a.displayName, b.displayName)
      await splashTo(matchPath(next))
    } catch {
      // El menú pudo haberse borrado: que elijan otro con los mismos nombres.
      const q = new URLSearchParams({ a: a.displayName, b: b.displayName })
      navigate(`/match/new?${q}`, { viewTransition: true })
    }
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
            plateHeight={plateHeight}
          />
        ))}
      </div>

      <ul className="verdicts">
        {PLAYER_SLOTS.map((slot) => (
          <li key={slot} data-slot={slot}>
            {favoriteLine(match, slot)}
          </li>
        ))}
      </ul>

      {PLAYER_SLOTS.map((slot) => (
        <section key={slot} className="block breakdown" data-slot={slot}>
          <h2 className="block__title">Lo que comió {match.players[slot].displayName}</h2>
          <ul>
            {match.selections
              .filter((s) => s.slot === slot && s.consumedQuantity > 0)
              .map((s) => (
                <li key={s.id}>
                  <span aria-hidden="true">{s.foodEmoji}</span>
                  <span className="breakdown__name">
                    {formatQuantity(s.consumedQuantity)} × {s.foodName}
                  </span>
                  <span className="breakdown__pts">{pointsLabel(pointsOf(s))}</span>
                </li>
              ))}
          </ul>
        </section>
      ))}

      <p className="result__date">
        Menú {match.menu.emoji} {match.menu.name}. Duró {duration} y terminó el{' '}
        {formatDate(match.finishedAt ?? match.startedAt)}.
      </p>

      <div className="actions">
        <button type="button" className="btn btn--primary btn--big" onClick={rematch}>
          Jugar la revancha
        </button>
        <Link className="btn btn--ghost" to="/history" viewTransition>
          Ver historial
        </Link>
      </div>
    </div>
  )
}
