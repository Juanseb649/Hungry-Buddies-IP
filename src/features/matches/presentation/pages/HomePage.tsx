import { Link } from 'react-router'
import { useContainer } from '../../../../app/container'
import { useAsync } from '../../../../shared/utils/use-async'
import { Loading } from '../../../../shared/components/ui'
import { calculateMatchResult } from '../../domain/scoring'
import { formatDate, formatPoints } from '../../../../shared/utils/format'
import { matchPath } from '../components/match-ui'
import type { Match } from '../../domain/entities/match'

const STATUS_LABEL: Record<Match['status'], string> = {
  planning: 'Eligiendo comida',
  eating: 'Comiendo',
  finished: 'Cerrada',
}

export function HomePage() {
  const { matches } = useContainer()
  const { data, loading } = useAsync(() => matches.getMatchHistory(), [matches])
  const open = data?.filter((m) => m.status !== 'finished') ?? []
  const last = data?.find((m) => m.status === 'finished')

  return (
    <div className="page home">
      <section className="hero">
        <h1 className="hero__title">
          <span data-slot="a">Hungry</span>
          <span data-slot="b">Buddies</span>
        </h1>
        <p className="hero__lede">
          Dos amigos, una mesa. Cada uno dice qué se va a comer, después cuenta lo que de verdad se comió, y
          gana la pila de platos más alta.
        </p>
        <Link className="btn btn--primary btn--big" to="/match/new">
          Nueva partida
        </Link>
      </section>

      {loading && <Loading />}

      {open.length > 0 && (
        <section className="block">
          <h2 className="block__title">Partidas abiertas</h2>
          <ul className="match-list">
            {open.map((m) => (
              <MatchRow key={m.id} match={m} />
            ))}
          </ul>
        </section>
      )}

      {last && (
        <section className="block">
          <h2 className="block__title">La última</h2>
          <ul className="match-list">
            <MatchRow match={last} />
          </ul>
          <Link className="link-btn" to="/history">
            Ver todo el historial
          </Link>
        </section>
      )}
    </div>
  )
}

export function MatchRow({ match }: { match: Match }) {
  const { points, winner } = calculateMatchResult(match)
  const finished = match.status === 'finished'
  return (
    <li>
      <Link className="match-row" to={matchPath(match)}>
        <span className="match-row__players">
          <span data-slot="a" data-winner={(finished && winner === 'a') || undefined}>
            {match.players.a.displayName} <b>{formatPoints(points.a)}</b>
          </span>
          <span data-slot="b" data-winner={(finished && winner === 'b') || undefined}>
            {match.players.b.displayName} <b>{formatPoints(points.b)}</b>
          </span>
        </span>
        <span className="match-row__meta">
          {finished ? (winner === 'tie' ? 'Empate' : `Ganó ${match.players[winner].displayName}`) : STATUS_LABEL[match.status]}
          <span>{formatDate(match.finishedAt ?? match.startedAt)}</span>
        </span>
      </Link>
    </li>
  )
}
