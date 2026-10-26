import { createBrowserRouter, Navigate, useParams } from 'react-router'
import { AppLayout, NotFoundPage } from './AppLayout'
import { HomePage } from '../features/matches/presentation/pages/HomePage'
import { NewMatchPage } from '../features/matches/presentation/pages/NewMatchPage'
import { PlayPage } from '../features/matches/presentation/pages/PlayPage'
import { ResultPage } from '../features/matches/presentation/pages/ResultPage'
import { HistoryPage } from '../features/history/presentation/HistoryPage'
import { ProfilePage, ProfilesPage } from '../features/profiles/presentation/ProfilesPage'
import { SettingsPage } from '../features/settings/presentation/SettingsPage'
import { MenuEditPage } from '../features/settings/presentation/MenuEditPage'

/** Rutas de la versión con fase de plan: ahora todo pasa en el contador. */
function LegacyMatchRedirect() {
  const { id } = useParams()
  return <Navigate to={`/match/${id}/play`} replace />
}

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/match/new', element: <NewMatchPage /> },
      { path: '/match/:id/play', element: <PlayPage /> },
      { path: '/match/:id/result', element: <ResultPage /> },
      { path: '/match/:id/select', element: <LegacyMatchRedirect /> },
      { path: '/match/:id/confirm', element: <LegacyMatchRedirect /> },
      { path: '/history', element: <HistoryPage /> },
      { path: '/profiles', element: <ProfilesPage /> },
      { path: '/profiles/:id', element: <ProfilePage /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '/settings/menus/:id', element: <MenuEditPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
