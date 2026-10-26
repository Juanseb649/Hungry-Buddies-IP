import { useCallback, useRef, useState } from 'react'
import { useContainer } from '../../../../app/container'
import type { Match, PlayerSlot } from '../../domain/entities/match'
import { consumedOf, MAX_QUANTITY } from '../../domain/rules'
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
  const queue = useRef<Promise<Match | undefined>>(Promise.resolve(undefined))
  const latest = useRef<Match | undefined>(undefined)
  latest.current ??= state.data

  const run = useCallback(
    (action: (current: Match) => Promise<Match>) => {
      queue.current = queue.current.then(async () => {
        const current = latest.current
        if (!current) return undefined
        try {
          const next = await action(current)
          latest.current = next
          setData(next)
          setActionError(null)
          return next
        } catch (e) {
          setActionError(e instanceof Error ? e.message : String(e))
          return undefined
        }
      })
      return queue.current
    },
    [setData],
  )

  return {
    match: state.data,
    loadError: state.error,
    loading: state.loading,
    actionError,
    clearActionError: () => setActionError(null),
    /** Suma (o resta, con delta negativo) porciones al contador de un jugador. */
    count: (slot: PlayerSlot, foodId: string, delta: number) =>
      run((m) => matches.updateConsumedQuantity(id, slot, foodId, clamp(consumedOf(m, slot, foodId) + delta))),
    /** Resuelve con la partida terminada, o undefined si no se pudo. */
    finish: () => run(() => matches.finishMatch(id)),
  }
}
