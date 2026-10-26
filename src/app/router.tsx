import { createBrowserRouter } from 'react-router'
import { AppLayout, NotFoundPage } from './AppLayout'
import { HomePage } from '../features/matches/presentation/pages/HomePage'
import { NewMatchPage } from '../features/matches/presentation/pages/NewMatchPage'
import { SelectPage } from '../features/matches/presentation/pages/SelectPage'
import { ConfirmPage } from '../features/matches/presentation/pages/ConfirmPage'
import { ResultPage } from '../features/matches/presentation/pages/ResultPage'
import { HistoryPage } from '../features/history/presentation/HistoryPage'
import { SettingsPage } from '../features/settings/presentation/SettingsPage'

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/match/new', element: <NewMatchPage /> },
      { path: '/match/:id/select', element: <SelectPage /> },
      { path: '/match/:id/confirm', element: <ConfirmPage /> },
      { path: '/match/:id/result', element: <ResultPage /> },
      { path: '/history', element: <HistoryPage /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
