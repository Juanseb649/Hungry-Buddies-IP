import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useContainer } from '../../../../app/container'
import { useAsync } from '../../../../shared/utils/use-async'
import { BottomBar, ErrorNote, Loading } from '../../../../shared/components/ui'
import { useSplashNavigate } from '../../../../shared/components/splash'
import { menuFoods } from '../../../food-catalog/domain/menu'
import { MAX_NAME_LENGTH, normalizeName, validatePlayerNames } from '../../domain/rules'
import { PLAYER_SLOTS, type PlayerSlot } from '../../domain/entities/match'
import { SLOT_COLOR_NAME } from '../components/match-ui'

type Step = 'menu' | 'players'

/** Asistente de dos pasos: qué se va a comer (menú) y quiénes juegan. */
export function NewMatchPage() {
  const { matches, menus, catalog } = useContainer()
  const splashTo = useSplashNavigate()
  const [params] = useSearchParams()
  const [step, setStep] = useState<Step>(params.get('menu') ? 'players' : 'menu')
  const [menuId, setMenuId] = useState<string | null>(params.get('menu'))
  const [names, setNames] = useState<Record<PlayerSlot, string>>({
    a: params.get('a') ?? '',
    b: params.get('b') ?? '',
  })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const options = useAsync(async () => {
    const [all, foods] = await Promise.all([menus.list(), catalog.list()])
    return all.map((menu) => ({ menu, foods: menuFoods(menu, foods) })).filter((o) => o.foods.length > 0)
  }, [menus, catalog])
  const { data: recent } = useAsync(() => matches.recentPlayers(8), [matches])

  const chosen = options.data?.find((o) => o.menu.id === menuId)
  const taken = new Set(PLAYER_SLOTS.map((s) => normalizeName(names[s]).toLocaleLowerCase()))
  const suggestions = recent?.filter((p) => !taken.has(p.displayName.toLocaleLowerCase())) ?? []

  function fillNext(name: string) {
    const slot = PLAYER_SLOTS.find((s) => !normalizeName(names[s]))
    if (slot) setNames({ ...names, [slot]: name })
    setError(null)
  }

  async function start(e: FormEvent) {
    e.preventDefault()
    if (!menuId) return setStep('menu')
    const problem = validatePlayerNames(names.a, names.b)
    if (problem) return setError(problem)
    setSaving(true)
    try {
      const match = await matches.createMatch(menuId, names.a, names.b)
      await splashTo(`/match/${match.id}/play`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setSaving(false)
    }
  }

  if (options.loading) return <Loading />

  if (step === 'menu') {
    return (
      <div className="page step" key="menu">
        <p className="step__count">Paso 1 de 2</p>
        <h1 className="page-title">¿Qué se van a comer?</h1>
        <p className="hint">Elige uno de tus menús. Solo se cuentan las comidas que están en él.</p>

        {options.data?.length === 0 ? (
          <p>No tienes menús con comidas todavía. Crea uno para poder jugar.</p>
        ) : (
          <div className="menu-pick" role="radiogroup" aria-label="Menú">
            {options.data?.map(({ menu, foods }) => (
              <button
                key={menu.id}
                type="button"
                role="radio"
                aria-checked={menuId === menu.id}
                className="menu-card"
                onClick={() => setMenuId(menu.id)}
              >
                <span className="menu-card__emoji" aria-hidden="true">
                  {menu.emoji}
                </span>
                <span className="menu-card__text">
                  <span className="menu-card__name">{menu.name}</span>
                  <span className="menu-card__foods">{foods.map((f) => `${f.emoji} ${f.name}`).join(', ')}</span>
                </span>
              </button>
            ))}
          </div>
        )}

        <Link className="link-btn" to="/settings/menus/new" viewTransition>
          Crear un menú nuevo
        </Link>

        <BottomBar>
          <button
            type="button"
            className="btn btn--primary btn--big"
            disabled={!chosen}
            onClick={() => setStep('players')}
          >
            Elegir jugadores
          </button>
        </BottomBar>
      </div>
    )
  }

  return (
    <form className="page step" key="players" onSubmit={start} noValidate>
      <p className="step__count">Paso 2 de 2</p>
      <h1 className="page-title">¿Quiénes juegan?</h1>

      {chosen && (
        <button type="button" className="menu-chosen" onClick={() => setStep('menu')}>
          <span aria-hidden="true">{chosen.menu.emoji}</span>
          <span>
            Menú: <b>{chosen.menu.name}</b>
          </span>
          <span className="menu-chosen__change">Cambiar</span>
        </button>
      )}

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
                <span aria-hidden="true">{p.avatar}</span> {p.displayName}
              </button>
            ))}
          </div>
        </div>
      )}

      <ErrorNote message={error} />

      <BottomBar>
        <button type="submit" className="btn btn--primary btn--big" disabled={saving}>
          Empezar a contar
        </button>
      </BottomBar>
    </form>
  )
}
