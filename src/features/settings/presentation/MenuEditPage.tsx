import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useContainer } from '../../../app/container'
import { useCatalog } from '../../food-catalog/application/use-catalog'
import { validateMenu, type Menu } from '../../food-catalog/domain/menu'
import { BottomBar, ConfirmDialog, ErrorNote, Loading } from '../../../shared/components/ui'
import { pointsLabel } from '../../../shared/utils/format'

const MENU_EMOJIS = ['🍔', '🍕', '🌮', '🍣', '🍗', '🥟', '🍩', '🍦', '🥗', '🍝', '🍜', '🍽️']

export function MenuEditPage() {
  const { id = 'new' } = useParams()
  const isNew = id === 'new'
  const { menus, ids } = useContainer()
  const catalog = useCatalog()
  const navigate = useNavigate()
  const [menu, setMenu] = useState<Menu | null>(isNew ? { id: '', name: '', emoji: '🍽️', foodIds: [] } : null)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    if (isNew) return
    void menus.findById(id).then((found) => (found ? setMenu(found) : setMissing(true)))
  }, [menus, id, isNew])

  if (missing) {
    return (
      <div className="page">
        <h1 className="page-title">Menú no encontrado</h1>
        <Link className="btn btn--primary" to="/settings" viewTransition>
          Volver a ajustes
        </Link>
      </div>
    )
  }
  if (!menu || catalog.loading) return <Loading />

  function toggle(foodId: string) {
    if (!menu) return
    const foodIds = menu.foodIds.includes(foodId)
      ? menu.foodIds.filter((f) => f !== foodId)
      : [...menu.foodIds, foodId]
    setMenu({ ...menu, foodIds })
    setError(null)
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!menu) return
    // Ignora comidas que ya no existen en el catálogo.
    const foodIds = menu.foodIds.filter((f) => catalog.data?.some((c) => c.id === f))
    const problem = validateMenu({ ...menu, foodIds })
    if (problem) return setError(problem)
    await menus.save({ ...menu, id: menu.id || ids.next(), foodIds })
    navigate(-1)
  }

  async function remove() {
    await menus.remove(id)
    navigate('/settings', { replace: true, viewTransition: true })
  }

  return (
    <form className="page" onSubmit={save} noValidate>
      <h1 className="page-title">{isNew ? 'Menú nuevo' : 'Editar menú'}</h1>

      <label className="field">
        <span className="field__label">Nombre</span>
        <input
          className="input"
          value={menu.name}
          maxLength={32}
          placeholder="Por ejemplo, Noche de pizza"
          onChange={(e) => {
            setMenu({ ...menu, name: e.target.value })
            setError(null)
          }}
        />
      </label>

      <fieldset className="avatar-pick">
        <legend className="field__label">Ícono</legend>
        {MENU_EMOJIS.map((em) => (
          <label key={em} className="avatar-pick__option">
            <input
              type="radio"
              name="menu-emoji"
              value={em}
              aria-label={`Ícono ${em}`}
              checked={menu.emoji === em}
              onChange={() => setMenu({ ...menu, emoji: em })}
            />
            <span aria-hidden="true">{em}</span>
          </label>
        ))}
      </fieldset>

      <section className="block">
        <h2 className="block__title">Comidas del menú</h2>
        <p className="hint">
          {menu.foodIds.length === 0
            ? 'Toca las comidas que se pueden contar en este menú.'
            : `${menu.foodIds.length} ${menu.foodIds.length === 1 ? 'comida elegida' : 'comidas elegidas'}.`}{' '}
          Los puntos se cambian en el catálogo de Ajustes.
        </p>
        <ul className="food-list">
          {catalog.data?.map((food) => {
            const on = menu.foodIds.includes(food.id)
            return (
              <li key={food.id}>
                <label className="food-row food-row--check" data-picked={on || undefined}>
                  <span className="food-row__emoji" aria-hidden="true">
                    {food.emoji}
                  </span>
                  <span className="food-row__text">
                    <span className="food-row__name">{food.name}</span>
                    <span className="food-row__meta">{pointsLabel(food.pointsPerPortion)} por porción</span>
                  </span>
                  <input type="checkbox" className="check" checked={on} onChange={() => toggle(food.id)} />
                </label>
              </li>
            )
          })}
        </ul>
      </section>

      {!isNew && (
        <button type="button" className="link-btn link-btn--danger" onClick={() => setConfirmDelete(true)}>
          Borrar menú
        </button>
      )}

      <ErrorNote message={error} />

      <BottomBar>
        <button type="submit" className="btn btn--primary btn--big">
          Guardar menú
        </button>
      </BottomBar>

      <ConfirmDialog
        open={confirmDelete}
        title={`¿Borrar el menú ${menu.name}?`}
        body="Las partidas que ya se jugaron con este menú no cambian."
        confirmLabel="Borrar menú"
        danger
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      />
    </form>
  )
}
