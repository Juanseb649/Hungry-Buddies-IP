import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { useMatch } from '../../application/hooks/use-match'
import { useCatalog } from '../../../food-catalog/application/use-catalog'
import { BottomBar, ConfirmDialog, ErrorNote, Loading, Stepper } from '../../../../shared/components/ui'
import { useContainer } from '../../../../app/container'
import { canStartEating } from '../../domain/rules'
import type { PlayerSlot } from '../../domain/entities/match'
import { pointsLabel } from '../../../../shared/utils/format'
import { matchPath, MatchNotFound, PlayerToggle, Scoreboard } from '../components/match-ui'

export function SelectPage() {
  const { id = '' } = useParams()
  const m = useMatch(id)
  const catalog = useCatalog()
  const { matches } = useContainer()
  const navigate = useNavigate()
  const [slot, setSlot] = useState<PlayerSlot>('a')
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  if (m.loading || catalog.loading) return <Loading />
  if (m.loadError || !m.match) return <MatchNotFound message={m.loadError?.message ?? ''} />
  const match = m.match
  if (match.status !== 'planning') return <Navigate to={matchPath(match)} replace />

  const planned = (foodId: string) =>
    match.selections.find((s) => s.slot === slot && s.foodId === foodId)?.plannedQuantity ?? 0
  const missing = (['a', 'b'] as const).filter((s) => !match.selections.some((x) => x.slot === s))

  async function discard() {
    await matches.discardMatch(id)
    navigate('/', { replace: true })
  }

  return (
    <div className="page">
      <Scoreboard match={match} caption="Puntos si se comen todo lo que eligen" />

      <PlayerToggle
        match={match}
        active={slot}
        onChange={setSlot}
        count={(s) => match.selections.filter((x) => x.slot === s).length}
      />

      <p className="hint">
        ¿Qué se va a comer {match.players[slot].displayName}? Toca el número para sumar o quitar media
        porción.
      </p>

      <ul className="food-list" data-slot={slot}>
        {catalog.data?.map((food) => {
          const qty = planned(food.id)
          return (
            <li key={food.id} className="food-row" data-picked={qty > 0 || undefined}>
              <span className="food-row__emoji" aria-hidden="true">
                {food.emoji}
              </span>
              <span className="food-row__text">
                <span className="food-row__name">{food.name}</span>
                <span className="food-row__meta">{pointsLabel(food.pointsPerPortion)} por porción</span>
              </span>
              <Stepper label={food.name} value={qty} onStep={(d) => m.plan(slot, food.id, d)} />
            </li>
          )
        })}
      </ul>

      <ErrorNote message={m.actionError} onDismiss={m.clearActionError} />

      <button type="button" className="link-btn link-btn--danger" onClick={() => setConfirmDiscard(true)}>
        Descartar partida
      </button>

      <BottomBar>
        {missing.length > 0 && (
          <p className="bottom-bar__note">
            {missing.length === 2 ? 'Falta que los dos elijan algo.' : `Falta que ${match.players[missing[0]].displayName} elija algo.`}
          </p>
        )}
        <button
          type="button"
          className="btn btn--primary btn--big"
          disabled={!canStartEating(match)}
          onClick={() => m.startEating()}
        >
          Listo, a comer
        </button>
      </BottomBar>

      <ConfirmDialog
        open={confirmDiscard}
        title="¿Descartar esta partida?"
        body="Se borra el plan de los dos y no queda en el historial."
        confirmLabel="Descartar partida"
        danger
        onConfirm={discard}
        onCancel={() => setConfirmDiscard(false)}
      />
    </div>
  )
}
