import { useRef, useState, type FormEvent } from 'react'
import { useContainer } from '../../../app/container'
import { useCatalog } from '../../food-catalog/application/use-catalog'
import { MAX_POINTS_PER_PORTION, validateFoodItem, type FoodItem } from '../../food-catalog/domain/food-item'
import { ConfirmDialog, ErrorNote, Loading } from '../../../shared/components/ui'
import { exportBackup, importBackup, parseBackup, type BackupFile } from '../../../shared/database/backup'
import { useAsync } from '../../../shared/utils/use-async'

export function SettingsPage() {
  return (
    <div className="page">
      <h1 className="page-title">Ajustes</h1>
      <CatalogEditor />
      <StorageSection />
      <BackupSection />
    </div>
  )
}

function PointsInput({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="stepper stepper--points" role="group" aria-label={`Puntos por porción de ${label}`}>
      <button type="button" className="stepper__btn" aria-label="Un punto menos" disabled={value <= 1} onClick={() => onChange(value - 1)}>
        −
      </button>
      <span className="stepper__value" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className="stepper__btn"
        aria-label="Un punto más"
        disabled={value >= MAX_POINTS_PER_PORTION}
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </div>
  )
}

function CatalogEditor() {
  const { catalog, ids } = useContainer()
  const { data, loading, reload, setData } = useCatalog()
  const [draft, setDraft] = useState({ emoji: '', name: '', points: 1 })
  const [error, setError] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<FoodItem | null>(null)

  async function save(item: FoodItem) {
    // Actualiza la pantalla al instante para que varios toques seguidos se acumulen.
    if (data?.some((f) => f.id === item.id)) setData(data.map((f) => (f.id === item.id ? item : f)))
    await catalog.save(item)
    await reload()
  }

  async function add(e: FormEvent) {
    e.preventDefault()
    const problem = validateFoodItem({ name: draft.name, pointsPerPortion: draft.points })
    if (problem) return setError(problem)
    await save({
      id: ids.next(),
      name: draft.name.trim(),
      emoji: draft.emoji.trim() || '🍽️',
      pointsPerPortion: draft.points,
      isCustom: true,
    })
    setDraft({ emoji: '', name: '', points: 1 })
    setError(null)
  }

  if (loading) return <Loading />

  return (
    <section className="block">
      <h2 className="block__title">Catálogo y puntos</h2>
      <p className="hint">
        Cambiar los puntos solo afecta a partidas nuevas. Las partidas guardadas conservan los puntos con que se
        jugaron.
      </p>
      <ul className="food-list">
        {data?.map((food) => (
          <li key={food.id} className="food-row">
            <span className="food-row__emoji" aria-hidden="true">
              {food.emoji}
            </span>
            <span className="food-row__text">
              <span className="food-row__name">{food.name}</span>
              <button type="button" className="link-btn link-btn--danger link-btn--inline" onClick={() => setToDelete(food)}>
                Quitar
              </button>
            </span>
            <PointsInput label={food.name} value={food.pointsPerPortion} onChange={(v) => save({ ...food, pointsPerPortion: v })} />
          </li>
        ))}
      </ul>

      <form className="add-food" onSubmit={add} noValidate>
        <h3 className="add-food__title">Añadir comida</h3>
        <div className="add-food__fields">
          <input
            className="input add-food__emoji"
            aria-label="Emoji (opcional)"
            placeholder="🍽️"
            value={draft.emoji}
            maxLength={8}
            onChange={(e) => setDraft({ ...draft, emoji: e.target.value })}
          />
          <input
            className="input"
            aria-label="Nombre de la comida"
            placeholder="Nombre, por ejemplo Salchipapa"
            value={draft.name}
            maxLength={40}
            onChange={(e) => {
              setDraft({ ...draft, name: e.target.value })
              setError(null)
            }}
          />
        </div>
        <div className="add-food__row">
          <span>Puntos por porción</span>
          <PointsInput label="la comida nueva" value={draft.points} onChange={(v) => setDraft({ ...draft, points: v })} />
        </div>
        <ErrorNote message={error} />
        <button type="submit" className="btn btn--primary">
          Añadir al catálogo
        </button>
      </form>

      <ConfirmDialog
        open={toDelete !== null}
        title={`¿Quitar ${toDelete?.name ?? ''} del catálogo?`}
        body="Ya no se podrá elegir en partidas nuevas. Las partidas guardadas no cambian."
        confirmLabel="Quitar del catálogo"
        danger
        onConfirm={async () => {
          if (toDelete) await catalog.remove(toDelete.id)
          setToDelete(null)
          await reload()
        }}
        onCancel={() => setToDelete(null)}
      />
    </section>
  )
}

function StorageSection() {
  const supported = typeof navigator !== 'undefined' && !!navigator.storage?.persist
  const persisted = useAsync(async () => (supported ? navigator.storage.persisted() : false), [supported])
  const [denied, setDenied] = useState(false)

  async function request() {
    const granted = await navigator.storage.persist()
    setDenied(!granted)
    await persisted.reload()
  }

  return (
    <section className="block">
      <h2 className="block__title">Dónde se guardan los datos</h2>
      <p>
        Todo se guarda solo en este navegador. Si borras los datos del sitio, usas una ventana privada o cambias
        de teléfono, el historial no te sigue. Descarga un respaldo de vez en cuando.
      </p>
      {supported &&
        (persisted.data ? (
          <p className="ok-note">Este navegador no borrará los datos por falta de espacio.</p>
        ) : (
          <>
            <button type="button" className="btn btn--ghost" onClick={request}>
              Pedir que el navegador no borre los datos
            </button>
            {denied && (
              <p className="hint">
                El navegador no lo permitió por ahora. Instalar la app en la pantalla de inicio suele ayudar.
              </p>
            )}
          </>
        ))}
    </section>
  )
}

function BackupSection() {
  const { db, clock } = useContainer()
  const fileInput = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<BackupFile | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function download() {
    const backup = await exportBackup(db, clock.now())
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `hungry-buddies-${backup.exportedAt.slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMessage('Respaldo descargado.')
  }

  async function pick(file: File | undefined) {
    if (!file) return
    setError(null)
    setMessage(null)
    try {
      setPending(parseBackup(await file.text()))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  async function restore() {
    if (!pending) return
    try {
      await importBackup(db, pending)
      setMessage('Respaldo restaurado.')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
    setPending(null)
  }

  return (
    <section className="block">
      <h2 className="block__title">Respaldo</h2>
      <div className="actions actions--row">
        <button type="button" className="btn btn--primary" onClick={download}>
          Descargar respaldo
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => fileInput.current?.click()}>
          Restaurar respaldo
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => pick(e.target.files?.[0])}
        />
      </div>
      {message && (
        <p className="ok-note" role="status">
          {message}
        </p>
      )}
      <ErrorNote message={error} />
      <ConfirmDialog
        open={pending !== null}
        title="¿Restaurar este respaldo?"
        body={`Se reemplazan todos los datos de este navegador por los del respaldo (${pending?.tables.matches.length ?? 0} partidas). Lo que no esté en el respaldo se pierde.`}
        confirmLabel="Restaurar respaldo"
        danger
        onConfirm={restore}
        onCancel={() => setPending(null)}
      />
    </section>
  )
}
