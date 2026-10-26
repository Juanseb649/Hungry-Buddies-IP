import { useCallback, useRef, useState } from 'react'
import { useContainer } from '../../../../app/container'
import type { Match, PlayerSlot } from '../../domain/entities/match'
import { MAX_QUANTITY } from '../../domain/rules'
import { useAsync } from '../../../../shared/utils/use-async'

const clamp = (q: number) => Math.min(MAX_QUANTITY, Math.max(0, q))

/** Carga una partida y expone los casos de uso que la modifican. */
export function useMatch(id: string) {
  const { matches } = useContainer()
  const state = useAsync(() => matches.getMatch(id), [matches, id])
  const [actionError, setActionError] = useState<string | null>(null)
  const { setData } = state
  // Las acciones van en cola y cada una parte de la partida más reciente,
  // así varios toques rápidos en "+" suman todos en vez de pisarse.
  const queue = useRef<Promise<void>>(Promise.resolve())
  const latest = useRef<Match | undefined>(undefined)
  latest.current ??= state.data

  const run = useCallback(
    (action: (current: Match) => Promise<Match>) => {
      queue.current = queue.current.then(async () => {
        const current = latest.current
        if (!current) return
        try {
          const next = await action(current)
          latest.current = next
          setData(next)
          setActionError(null)
        } catch (e) {
          setActionError(e instanceof Error ? e.message : String(e))
        }
      })
      return queue.current
    },
    [setData],
  )

  const quantityOf = (match: Match, slot: PlayerSlot, foodId: string, field: 'plannedQuantity' | 'consumedQuantity') =>
    match.selections.find((s) => s.slot === slot && s.foodId === foodId)?.[field] ?? 0

  return {
    match: state.data,
    loadError: state.error,
    loading: state.loading,
    actionError,
    clearActionError: () => setActionError(null),
    /** Suma (o resta, con delta negativo) porciones al plan. */
    plan: (slot: PlayerSlot, foodId: string, delta: number) =>
      run((m) =>
        matches.addFoodSelection(id, slot, foodId, clamp(quantityOf(m, slot, foodId, 'plannedQuantity') + delta)),
      ),
    /** Suma (o resta) porciones a lo comido. */
    consume: (slot: PlayerSlot, foodId: string, delta: number) =>
      run((m) =>
        matches.updateConsumedQuantity(id, slot, foodId, clamp(quantityOf(m, slot, foodId, 'consumedQuantity') + delta)),
      ),
    startEating: () => run(() => matches.startEating(id)),
    backToPlanning: () => run(() => matches.backToPlanning(id)),
    finish: () => run(() => matches.finishMatch(id)),
  }
}
