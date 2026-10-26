import { Link } from 'react-router'
import { useContainer } from '../../../app/container'
import { useAsync } from '../../../shared/utils/use-async'
import { Loading } from '../../../shared/components/ui'
import { computeHistoryStats } from '../application/history-stats'
import { formatPoints, formatQuantity, pointsLabel } from '../../../shared/utils/format'
import { MatchRow } from '../../matches/presentation/pages/HomePage'

export function HistoryPage() {
  const { matches } = useContainer()
  const { data, loading } = useAsync(async () => computeHistoryStats(await matches.getMatchHistory()), [matches])

  if (loading || !data) return <Loading />

  if (data.finished.length === 0) {
    return (
      <div className="page">
        <h1 className="page-title">Historial</h1>
        <p>Todavía no hay partidas terminadas. Cuando terminen una, el resultado se guarda aquí.</p>
        <Link className="btn btn--primary btn--big" to="/match/new" viewTransition>
          Nueva partida
        </Link>
      </div>
    )
  }

  return (
    <div className="page">
      <h1 className="page-title">Historial</h1>

      <section className="records">
        {data.bestMatch && (
          <Link className="record" to={`/match/${data.bestMatch.matchId}/result`} viewTransition>
            <span className="record__value">{formatPoints(data.bestMatch.points)}</span>
            <span className="record__label">Récord en una partida, de {data.bestMatch.displayName}</span>
          </Link>
        )}
        {data.topFood && (
          <div className="record">
            <span className="record__value" aria-hidden="true">
              {data.topFood.emoji}
            </span>
            <span className="record__label">
              Lo más comido: {data.topFood.name}, {formatQuantity(data.topFood.portions)} en total
            </span>
          </div>
        )}
      </section>

      <section className="block">
        <h2 className="block__title">Jugadores</h2>
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Nombre</th>
              <th scope="col">Ganadas</th>
              <th scope="col">Empates</th>
              <th scope="col">Jugadas</th>
            </tr>
          </thead>
          <tbody>
            {data.players.map((p) => (
              <tr key={p.playerId}>
                <th scope="row">
                  <Link to={`/profiles/${p.playerId}`} viewTransition>
                    {p.displayName}
                  </Link>
                  <span className="table__sub">{pointsLabel(p.totalPoints)} en total</span>
                </th>
                <td>{p.wins}</td>
                <td>{p.ties}</td>
                <td>{p.played}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="block">
        <h2 className="block__title">Partidas</h2>
        <ul className="match-list">
          {data.finished.map((m) => (
            <MatchRow key={m.id} match={m} />
          ))}
        </ul>
      </section>
    </div>
  )
}
