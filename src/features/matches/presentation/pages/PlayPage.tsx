import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { useMatch } from '../../application/hooks/use-match'
import { useContainer } from '../../../../app/container'
import { BottomBar, ConfirmDialog, ErrorNote, Loading } from '../../../../shared/components/ui'
import { useSplashNavigate } from '../../../../shared/components/splash'
import { canFinish, consumedOf } from '../../domain/rules'
import { calculateMatchResult } from '../../domain/scoring'
import { PLAYER_SLOTS, type Match, type MenuItemSnapshot, type PlayerSlot } from '../../domain/entities/match'
import { formatQuantity, pointsLabel } from '../../../../shared/utils/format'
import { formatClock, useElapsed } from '../../../../shared/utils/use-elapsed'
import { matchPath, MatchNotFound, Scoreboard } from '../components/match-ui'

/** El contador en vivo: cada jugador toca su lado cuando se come una porción. */
export function PlayPage() {
  const { id = '' } = useParams()
  const m = useMatch(id)
  const { matches } = useContainer()
  const navigate = useNavigate()
  const splashTo = useSplashNavigate()
  const [dialog, setDialog] = useState<'finish' | 'discard' | null>(null)

  if (m.loading) return <Loading />
  if (m.loadError || !m.match) return <MatchNotFound message={m.loadError?.message ?? ''} />
  const match = m.match
  if (match.status !== 'playing') return <Navigate to={matchPath(match)} replace />

  async function finish() {
    setDialog(null)
    const done = await m.finish()
    if (!done) return
    const { winner } = calculateMatchResult(done)
    await splashTo(matchPath(done), winner === 'tie' ? 'both' : winner)
  }

  async function discard() {
    await matches.discardMatch(id)
    navigate('/', { replace: true, viewTransition: true })
  }

  return (
    <div className="page play">
      <div className="play__head">
        <span className="play__menu">
          <span aria-hidden="true">{match.menu.emoji}</span> {match.menu.name}
        </span>
        <Clock since={match.startedAt} />
      </div>

      <Scoreboard match={match} />

      <p className="hint">Toca tu lado cada vez que te comas una porción.</p>

      <ul className="counter">
        {match.menu.items.map((item) => (
          <CounterRow key={item.foodId} match={match} item={item} onCount={m.count} />
        ))}
      </ul>

      <ErrorNote message={m.actionError} onDismiss={m.clearActionError} />

      <button type="button" className="link-btn link-btn--danger" onClick={() => setDialog('discard')}>
        Descartar partida
      </button>

      <BottomBar>
        <button
          type="button"
          className="btn btn--primary btn--big"
          disabled={!canFinish(match)}
          onClick={() => setDialog('finish')}
        >
          Terminar partida
        </button>
      </BottomBar>

      <ConfirmDialog
        open={dialog === 'finish'}
        title="¿Terminar la partida?"
        body="Se calcula el ganador y el marcador ya no se puede cambiar."
        confirmLabel="Terminar partida"
        onConfirm={finish}
        onCancel={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog === 'discard'}
        title="¿Descartar esta partida?"
        body="Se borra el marcador y no queda en el historial."
        confirmLabel="Descartar partida"
        danger
        onConfirm={discard}
        onCancel={() => setDialog(null)}
      />
    </div>
  )
}

function Clock({ since }: { since: string }) {
  const elapsed = useElapsed(since)
  return (
    <span className="play__clock" aria-label={`Tiempo de partida ${formatClock(elapsed)}`}>
      <span aria-hidden="true">⏱</span> {formatClock(elapsed)}
    </span>
  )
}

function CounterRow({
  match,
  item,
  onCount,
}: {
  match: Match
  item: MenuItemSnapshot
  onCount: (slot: PlayerSlot, foodId: string, delta: number) => void
}) {
  return (
    <li className="counter__row">
      {PLAYER_SLOTS.map((slot) => {
        const n = consumedOf(match, slot, item.foodId)
        const name = match.players[slot].displayName
        return (
          <div key={slot} className="counter__side" data-slot={slot} data-active={n > 0 || undefined}>
            <button
              type="button"
              className="counter__tap"
              aria-label={`Sumar una porción de ${item.name} a ${name}. Lleva ${formatQuantity(n)}`}
              onClick={() => onCount(slot, item.foodId, 1)}
            >
              {/* La key reinicia la animación de "pop" en cada cambio. */}
              <span key={n} className="counter__n">
                {formatQuantity(n)}
              </span>
            </button>
            <button
              type="button"
              className="counter__undo"
              aria-label={`Quitar una porción de ${item.name} a ${name}`}
              disabled={n === 0}
              onClick={() => onCount(slot, item.foodId, -1)}
            >
              −
            </button>
          </div>
        )
      })}
      <div className="counter__food">
        <span className="counter__emoji" aria-hidden="true">
          {item.emoji}
        </span>
        <span className="counter__name">{item.name}</span>
        <span className="counter__pts">{pointsLabel(item.pointsPerPortion)}</span>
      </div>
    </li>
  )
}
