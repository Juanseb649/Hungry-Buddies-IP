import { useCallback, useEffect, useState } from 'react'

export interface AsyncState<T> {
  data: T | undefined
  error: Error | null
  loading: boolean
  reload: () => Promise<void>
  setData: (data: T) => void
}

export function useAsync<T>(load: () => Promise<T>, deps: readonly unknown[]): AsyncState<T> {
  const [data, setData] = useState<T>()
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(true)

  const run = useCallback(load, deps)

  const reload = useCallback(async () => {
    try {
      setData(await run())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)))
    } finally {
      setLoading(false)
    }
  }, [run])

  useEffect(() => {
    setLoading(true)
    void reload()
  }, [reload])

  return { data, error, loading, reload, setData }
}
