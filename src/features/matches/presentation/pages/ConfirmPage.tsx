import { useState } from 'react'
import { Navigate, useParams } from 'react-router'
import { useMatch } from '../../application/hooks/use-match'
import { useCatalog } from '../../../food-catalog/application/use-catalog'
import { BottomBar, ConfirmDialog, ErrorNote, Loading, Stepper } from '../../../../shared/components/ui'
import type { PlayerSlot } from '../../domain/entities/match'
import { formatQuantity, pointsLabel } from '../../../../shared/utils/format'
import { matchPath, MatchNotFound, PlayerToggle, Scoreboard } from '../components/match-ui'

export function ConfirmPage() {
  const { id = '' } = useParams()
  const m = useMatch(id)
  const catalog = useCatalog()
  const [slot, setSlot] = useState<PlayerSlot>('a')
  const [showExtras, setShowExtras] = useState(false)
  const [dialog, setDialog] = useState<'finish' | 'back' | null>(null)

  if (m.loading || catalog.loading) return <Loading />
  if (m.loadError || !m.match) return <MatchNotFound message={m.loadError?.message ?? ''} />
  const match = m.match
  if (match.status !== 'eating') return <Navigate to={matchPath(match)} replace />

  const mine = match.selections.filter((s) => s.slot === slot)
  const extras = catalog.data?.filter((f) => !mine.some((s) => s.foodId === f.id)) ?? []
  const name = match.players[slot].displayName

  return (
    <div className="page">
      <Scoreboard match={match} caption="Puntos de lo que se comieron" />

      <PlayerToggle match={match} active={slot} onChange={setSlot} count={(s) => match.selections.filter((x) => x.slot === s).length} />

      <p className="hint">¿Cuánto se comió {name} de verdad? Ajusta lo que no coincida con el plan.</p>

      <ul className="food-list" data-slot={slot}>
        {mine.map((s) => {
          const eaten = s.consumedQuantity ?? 0
          const diff = eaten - s.plannedQuantity
          return (
            <li key={s.id} className="food-row" data-picked={eaten > 0 || undefined}>
              <span className="food-row__emoji" aria-hidden="true">
                {s.foodEmoji}
              </span>
              <span className="food-row__text">
                <span className="food-row__name">{s.foodName}</span>
                <span className="food-row__meta">
                  {s.plannedQuantity === 0 ? 'No estaba en el plan' : `Planeó ${formatQuantity(s.plannedQuantity)}`}
                  {s.plannedQuantity > 0 && diff !== 0 && (
                    <span className="food-row__diff">
                      {' '}
                      ({diff > 0 ? '+' : '−'}
                      {formatQuantity(Math.abs(diff))})
                    </span>
                  )}
                </span>
              </span>
              <Stepper label={s.foodName} value={eaten} onStep={(d) => m.consume(slot, s.foodId, d)} />
            </li>
          )
        })}
      </ul>

      {showExtras ? (
        <section className="block">
          <h2 className="block__title">Lo que {name} comió sin avisar</h2>
          <ul className="food-list food-list--compact" data-slot={slot}>
            {extras.map((food) => (
              <li key={food.id} className="food-row">
                <span className="food-row__emoji" aria-hidden="true">
                  {food.emoji}
                </span>
                <span className="food-row__text">
                  <span className="food-row__name">{food.name}</span>
                  <span className="food-row__meta">{pointsLabel(food.pointsPerPortion)} por porción</span>
                </span>
                <button type="button" className="btn btn--small" onClick={() => m.consume(slot, food.id, 1)}>
                  Añadir
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <button type="button" className="btn btn--ghost" onClick={() => setShowExtras(true)}>
          {name} comió algo que no planeó
        </button>
      )}

      <ErrorNote message={m.actionError} onDismiss={m.clearActionError} />

      <button type="button" className="link-btn" onClick={() => setDialog('back')}>
        Volver a elegir comida
      </button>

      <BottomBar>
        <button type="button" className="btn btn--primary btn--big" onClick={() => setDialog('finish')}>
          Cerrar partida
        </button>
      </BottomBar>

      <ConfirmDialog
        open={dialog === 'finish'}
        title="¿Cerrar la partida?"
        body="Se calcula el ganador y ya no se pueden cambiar las cantidades."
        confirmLabel="Cerrar partida"
        onConfirm={() => {
          setDialog(null)
          void m.finish()
        }}
        onCancel={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog === 'back'}
        title="¿Volver a elegir comida?"
        body="Se pierden los ajustes de lo que se comió y lo que se añadió sin estar en el plan."
        confirmLabel="Volver al plan"
        danger
        onConfirm={() => {
          setDialog(null)
          void m.backToPlanning()
        }}
        onCancel={() => setDialog(null)}
      />
    </div>
  )
}
