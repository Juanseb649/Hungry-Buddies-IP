import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { registerSW } from 'virtual:pwa-register'
import '@fontsource/bagel-fat-one/latin-400.css'
import '@fontsource/figtree/latin-400.css'
import '@fontsource/figtree/latin-600.css'
import '@fontsource/figtree/latin-800.css'
import './shared/theme/tokens.css'
import './shared/theme/app.css'
import './shared/theme/motion.css'
import { ContainerContext, createContainer } from './app/container'
import { router } from './app/router'
import { LaunchSplash } from './shared/components/splash'

function App() {
  const [splash, setSplash] = useState(true)
  return (
    <>
      <RouterProvider router={router} />
      {splash && <LaunchSplash onDone={() => setSplash(false)} />}
    </>
  )
}

registerSW({ immediate: true })

const container = createContainer()
const root = createRoot(document.getElementById('root')!)

container.db
  .open()
  .then(() =>
    root.render(
      <StrictMode>
        <ContainerContext value={container}>
          <App />
        </ContainerContext>
      </StrictMode>,
    ),
  )
  .catch(() =>
    root.render(
      <div className="page">
        <h1 className="page-title">No se pudo abrir la base de datos</h1>
        <p>
          Este navegador no permite guardar datos para este sitio. Sal del modo privado o revisa que el sitio
          tenga permiso para guardar datos, y recarga la página.
        </p>
      </div>,
    ),
  )
