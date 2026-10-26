import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useContainer } from '../../../../app/container'
import { useAsync } from '../../../../shared/utils/use-async'
import { BottomBar, ErrorNote } from '../../../../shared/components/ui'
import { MAX_NAME_LENGTH, normalizeName, validatePlayerNames } from '../../domain/rules'
import { PLAYER_SLOTS, type PlayerSlot } from '../../domain/entities/match'
import { matchPath, SLOT_COLOR_NAME } from '../components/match-ui'

export function NewMatchPage() {
  const { matches } = useContainer()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [names, setNames] = useState<Record<PlayerSlot, string>>({
    a: params.get('a') ?? '',
    b: params.get('b') ?? '',
  })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const { data: recent } = useAsync(() => matches.recentPlayers(), [matches])

  const taken = new Set(PLAYER_SLOTS.map((s) => normalizeName(names[s]).toLocaleLowerCase()))
  const suggestions = recent?.filter((p) => !taken.has(p.displayName.toLocaleLowerCase())) ?? []

  function fillNext(name: string) {
    const slot = PLAYER_SLOTS.find((s) => !normalizeName(names[s]))
    if (slot) setNames({ ...names, [slot]: name })
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    const problem = validatePlayerNames(names.a, names.b)
    if (problem) return setError(problem)
    setSaving(true)
    try {
      const match = await matches.createMatch(names.a, names.b)
      navigate(matchPath(match), { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setSaving(false)
    }
  }

  return (
    <form className="page" onSubmit={submit} noValidate>
      <h1 className="page-title">¿Quiénes juegan?</h1>

      {PLAYER_SLOTS.map((slot) => (
        <label key={slot} className="name-field" data-slot={slot}>
          <span className="name-field__tag">{SLOT_COLOR_NAME[slot]}</span>
          <input
            name={`player-${slot}`}
            value={names[slot]}
            maxLength={MAX_NAME_LENGTH}
            autoComplete="off"
            enterKeyHint={slot === 'a' ? 'next' : 'go'}
            placeholder={slot === 'a' ? 'Nombre o apodo' : 'Nombre o apodo del rival'}
            aria-label={`Nombre del jugador ${SLOT_COLOR_NAME[slot]}`}
            onChange={(e) => {
              setNames({ ...names, [slot]: e.target.value })
              setError(null)
            }}
          />
        </label>
      ))}

      {suggestions.length > 0 && (
        <div className="block">
          <h2 className="block__title">Ya jugaron antes</h2>
          <div className="chips">
            {suggestions.map((p) => (
              <button key={p.id} type="button" className="chip" onClick={() => fillNext(p.displayName)}>
                {p.displayName}
              </button>
            ))}
          </div>
        </div>
      )}

      <ErrorNote message={error} />

      <BottomBar>
        <button type="submit" className="btn btn--primary btn--big" disabled={saving}>
          Empezar partida
        </button>
      </BottomBar>
    </form>
  )
}
