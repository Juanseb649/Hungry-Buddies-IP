import { useContainer } from '../../../app/container'
import { useAsync } from '../../../shared/utils/use-async'

export function useCatalog() {
  const { catalog } = useContainer()
  return useAsync(() => catalog.list(), [catalog])
}
