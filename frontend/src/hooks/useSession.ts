import { useEffect, useState } from 'react'
import { api, SESSION_KEY } from '../services/api'

export function useSession(): string | null {
  const [sessionId, setSessionId] = useState<string | null>(() =>
    localStorage.getItem(SESSION_KEY)
  )

  useEffect(() => {
    if (sessionId) return
    api.get<{ status: string }>('/api/v1/health').then(() => {
      setSessionId(localStorage.getItem(SESSION_KEY))
    })
  }, [sessionId])

  return sessionId
}
