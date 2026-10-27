import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, ScrollRestoration, useLocation } from 'react-router'
import { useContainer } from './container'
import { useAsync } from '../shared/utils/use-async'
import { SplashProvider } from '../shared/components/splash'

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <SplashProvider>
      <div className="shell">
        <a className="skip-link" href="#main">
          Saltar al contenido
        </a>
        <header className="topbar">
          {/* El botón va a la izquierda, del mismo lado por donde sale el panel. */}
          <button
            type="button"
            className="burger"
            aria-label="Abrir navegación"
            aria-expanded={menuOpen}
            aria-controls="nav-drawer"
            onClick={() => setMenuOpen(true)}
          >
            <span />
            <span />
            <span />
          </button>
          <Link to="/" viewTransition className="topbar__brand" aria-label="Hungry Buddies, inicio">
            <img src="/icon.svg" alt="" width={32} height={32} />
            <span>Hungry Buddies</span>
          </Link>
        </header>
        <main id="main">
          <Outlet />
        </main>
        <NavDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
        <ScrollRestoration />
      </div>
    </SplashProvider>
  )
}

const CLOSE_MS = 220

function NavDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const { profiles } = useContainer()
  const location = useLocation()
  const people = useAsync(() => (open ? profiles.listProfiles() : Promise.resolve([])), [profiles, open])

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.removeAttribute('data-closing')
      dialog.showModal()
    }
    if (!open && dialog.open) {
      // Deja correr la animación de salida antes de cerrar.
      dialog.setAttribute('data-closing', '')
      const t = setTimeout(() => dialog.close(), CLOSE_MS)
      return () => clearTimeout(t)
    }
  }, [open])

  // Cerrar al navegar.
  useEffect(() => {
    onClose()
  }, [location.pathname]) // Solo al cambiar de ruta.

  return (
    <dialog
      ref={ref}
      id="nav-drawer"
      className="drawer"
      aria-label="Navegación"
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        // Un toque en el fondo oscuro (fuera del panel) cierra.
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="drawer__panel">
        <div className="drawer__head">
          <span className="drawer__brand">Hungry Buddies</span>
          <button type="button" className="drawer__close" aria-label="Cerrar navegación" onClick={onClose}>
            ×
          </button>
        </div>
        <nav className="drawer__nav">
          <NavLink to="/" end viewTransition>
            Inicio
          </NavLink>
          <NavLink to="/match/new" viewTransition>
            Nueva partida
          </NavLink>
          <NavLink to="/history" viewTransition>
            Historial
          </NavLink>
          <NavLink to="/profiles" end viewTransition>
            Perfiles
          </NavLink>
        </nav>
        {people.data && people.data.length > 0 && (
          <ul className="drawer__people" aria-label="Perfiles">
            {people.data.map(({ player, record }) => (
              <li key={player.id}>
                <NavLink to={`/profiles/${player.id}`} viewTransition>
                  <span className="avatar" aria-hidden="true">
                    {player.avatar}
                  </span>
                  <span className="drawer__person">{player.displayName}</span>
                  <span className="drawer__wins">
                    {record?.wins ?? 0} {record?.wins === 1 ? 'victoria' : 'victorias'}
                  </span>
                </NavLink>
              </li>
            ))}
          </ul>
        )}
        <NavLink to="/settings" className="drawer__settings" viewTransition>
          Ajustes
        </NavLink>
      </div>
    </dialog>
  )
}

export function NotFoundPage() {
  return (
    <div className="page">
      <h1 className="page-title">Aquí no hay nada en el menú</h1>
      <p>Esa dirección no existe en la app.</p>
      <Link className="btn btn--primary" to="/" viewTransition>
        Ir al inicio
      </Link>
    </div>
  )
}
