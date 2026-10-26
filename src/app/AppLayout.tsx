import { Link, NavLink, Outlet, ScrollRestoration } from 'react-router'

export function AppLayout() {
  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        Saltar al contenido
      </a>
      <header className="topbar">
        <Link to="/" className="topbar__brand" aria-label="Hungry Buddies, inicio">
          <img src="/icon.svg" alt="" width={32} height={32} />
          <span>Hungry Buddies</span>
        </Link>
        <nav className="topbar__nav" aria-label="Principal">
          <NavLink to="/history">Historial</NavLink>
          <NavLink to="/settings">Ajustes</NavLink>
        </nav>
      </header>
      <main id="main">
        <Outlet />
      </main>
      <ScrollRestoration />
    </div>
  )
}

export function NotFoundPage() {
  return (
    <div className="page">
      <h1 className="page-title">Aquí no hay nada en el menú</h1>
      <p>Esa dirección no existe en la app.</p>
      <Link className="btn btn--primary" to="/">
        Ir al inicio
      </Link>
    </div>
  )
}
