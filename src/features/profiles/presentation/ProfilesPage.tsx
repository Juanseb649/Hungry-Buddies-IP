import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import { useContainer } from '../../../app/container'
import { useAsync } from '../../../shared/utils/use-async'
import { ErrorNote, Loading } from '../../../shared/components/ui'
import { formatPoints, formatQuantity } from '../../../shared/utils/format'
import { AVATARS } from '../../matches/domain/ports/repositories'
import { MAX_NAME_LENGTH } from '../../matches/domain/rules'
import { MatchRow } from '../../matches/presentation/pages/HomePage'

export function ProfilesPage() {
  const { profiles } = useContainer()
  const { data, loading } = useAsync(() => profiles.listProfiles(), [profiles])

  if (loading || !data) return <Loading />

  return (
    <div className="page">
      <h1 className="page-title">Perfiles</h1>
      {data.length === 0 ? (
        <>
          <p>Todavía no hay nadie. Cada persona tiene su perfil desde su primera partida.</p>
          <Link className="btn btn--primary btn--big" to="/match/new" viewTransition>
            Nueva partida
          </Link>
        </>
      ) : (
        <ul className="people">
          {data.map(({ player, record }) => (
            <li key={player.id}>
              <Link className="person" to={`/profiles/${player.id}`} viewTransition>
                <span className="avatar avatar--big" aria-hidden="true">
                  {player.avatar}
                </span>
                <span className="person__name">{player.displayName}</span>
                <span className="person__meta">
                  {record
                    ? `${record.wins} de ${record.played} ${record.played === 1 ? 'partida ganada' : 'partidas ganadas'}`
                    : 'Sin partidas terminadas'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function ProfilePage() {
  const { id = '' } = useParams()
  const { profiles } = useContainer()
  const { data, loading, error, reload } = useAsync(() => profiles.getProfile(id), [profiles, id])
  const [editing, setEditing] = useState(false)

  if (loading) return <Loading />
  if (error || !data) {
    return (
      <div className="page">
        <h1 className="page-title">Perfil no encontrado</h1>
        <p>{error?.message}</p>
        <Link className="btn btn--primary" to="/profiles" viewTransition>
          Ver perfiles
        </Link>
      </div>
    )
  }

  const { player, record, favoriteFood, matches } = data

  return (
    <div className="page">
      <header className="profile-head">
        <span className="avatar avatar--huge" aria-hidden="true">
          {player.avatar}
        </span>
        <h1 className="page-title">{player.displayName}</h1>
        {!editing && (
          <button type="button" className="btn btn--ghost btn--small" onClick={() => setEditing(true)}>
            Editar perfil
          </button>
        )}
      </header>

      {editing && (
        <ProfileForm
          id={player.id}
          initialName={player.displayName}
          initialAvatar={player.avatar}
          onDone={async (saved) => {
            setEditing(false)
            if (saved) await reload()
          }}
        />
      )}

      {record ? (
        <section className="stat-grid" aria-label="Estadísticas">
          <Stat value={String(record.played)} label={record.played === 1 ? 'Partida' : 'Partidas'} />
          <Stat value={String(record.wins)} label={record.wins === 1 ? 'Victoria' : 'Victorias'} />
          <Stat value={String(record.ties)} label={record.ties === 1 ? 'Empate' : 'Empates'} />
          <Stat value={formatPoints(record.bestPoints)} label="Récord en una partida" />
          {favoriteFood && (
            <div className="stat stat--wide">
              <span className="stat__value" aria-hidden="true">
                {favoriteFood.emoji}
              </span>
              <span className="stat__label">
                Su favorita: {favoriteFood.name}, {formatQuantity(favoriteFood.portions)} en total
              </span>
            </div>
          )}
          <div className="stat stat--wide">
            <span className="stat__value">{formatPoints(record.totalPoints)}</span>
            <span className="stat__label">{record.totalPoints === 1 ? 'Punto' : 'Puntos'} en toda su historia</span>
          </div>
        </section>
      ) : (
        <p>Todavía no termina ninguna partida. Sus estadísticas aparecen después de la primera.</p>
      )}

      {matches.length > 0 && (
        <section className="block">
          <h2 className="block__title">Sus partidas</h2>
          <ul className="match-list">
            {matches.map((m) => (
              <MatchRow key={m.id} match={m} />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="stat">
      <span className="stat__value">{value}</span>
      <span className="stat__label">{label}</span>
    </div>
  )
}

function ProfileForm({
  id,
  initialName,
  initialAvatar,
  onDone,
}: {
  id: string
  initialName: string
  initialAvatar: string
  onDone: (saved: boolean) => void
}) {
  const { profiles } = useContainer()
  const [name, setName] = useState(initialName)
  const [avatar, setAvatar] = useState(AVATARS.includes(initialAvatar) ? initialAvatar : AVATARS[0])
  const [error, setError] = useState<string | null>(null)

  async function save(e: FormEvent) {
    e.preventDefault()
    try {
      await profiles.updateProfile(id, { displayName: name, avatar })
      onDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <form className="profile-form" onSubmit={save} noValidate>
      <label className="field">
        <span className="field__label">Nombre o apodo</span>
        <input
          className="input"
          value={name}
          maxLength={MAX_NAME_LENGTH}
          onChange={(e) => {
            setName(e.target.value)
            setError(null)
          }}
        />
      </label>
      <fieldset className="avatar-pick">
        <legend className="field__label">Avatar</legend>
        {AVATARS.map((a) => (
          <label key={a} className="avatar-pick__option">
            <input
              type="radio"
              name="avatar"
              value={a}
              aria-label={`Avatar ${a}`}
              checked={avatar === a}
              onChange={() => setAvatar(a)}
            />
            <span aria-hidden="true">{a}</span>
          </label>
        ))}
      </fieldset>
      <p className="hint">Las partidas anteriores conservan el nombre con que se jugaron.</p>
      <ErrorNote message={error} />
      <div className="actions actions--row">
        <button type="submit" className="btn btn--primary">
          Guardar perfil
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => onDone(false)}>
          Cancelar
        </button>
      </div>
    </form>
  )
}
