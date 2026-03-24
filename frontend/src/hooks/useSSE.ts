import { useCallback, useState } from 'react'
import { SESSION_KEY } from '../services/api'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

export interface Citation {
  document_name: string
  page_number: number
  chunk_text_snippet: string
  relevance_score: number
}

interface SSEEvent {
  token: string
  citations: Citation[] | null
  done: boolean
}

export interface StreamResult {
  message: string
  citations: Citation[]
}

interface UseSSEReturn {
  isStreaming: boolean
  currentMessage: string
  error: string | null
  streamQuery: (query: string, docIds: string[]) => Promise<StreamResult | null>
  reset: () => void
}

export function useSSE(): UseSSEReturn {
  const [isStreaming, setIsStreaming] = useState(false)
  const [currentMessage, setCurrentMessage] = useState('')
  const [error, setError] = useState<string | null>(null)

  const reset = useCallback(() => {
    setCurrentMessage('')
    setError(null)
  }, [])

  const streamQuery = useCallback(
    async (query: string, docIds: string[]): Promise<StreamResult | null> => {
      setIsStreaming(true)
      setCurrentMessage('')
      setError(null)

      const sessionId = localStorage.getItem(SESSION_KEY)
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (sessionId) headers['X-Session-ID'] = sessionId

      let response: Response
      try {
        response = await fetch(`${BASE_URL}/api/v1/chat`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ query, document_ids: docIds }),
        })
      } catch {
        setError('Network error — could not reach the server.')
        setIsStreaming(false)
        return null
      }

      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: response.statusText }))
        setError(body.error ?? body.detail ?? 'Request failed.')
        setIsStreaming(false)
        return null
      }

      const reader = response.body?.getReader()
      if (!reader) {
        setError('Streaming not supported by this browser.')
        setIsStreaming(false)
        return null
      }

      const decoder = new TextDecoder()
      let buffer = ''
      let message = ''
      let finalCitations: Citation[] = []

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          // Split on double newline — SSE event boundary
          const parts = buffer.split('\n\n')
          // Last part may be incomplete — keep it in the buffer
          buffer = parts.pop() ?? ''

          for (const part of parts) {
            const line = part.trim()
            if (!line.startsWith('data:')) continue

            const json = line.slice('data:'.length).trim()
            if (!json) continue

            let event: SSEEvent
            try {
              event = JSON.parse(json) as SSEEvent
            } catch {
              continue
            }

            if (event.done) {
              finalCitations = event.citations ?? []
            } else if (event.token) {
              message += event.token
              setCurrentMessage(message)
            }
          }
        }
      } catch {
        setError('Stream interrupted.')
        return null
      } finally {
        reader.releaseLock()
        setCurrentMessage('')
        setIsStreaming(false)
      }

      return { message, citations: finalCitations }
    },
    []
  )

  return { isStreaming, currentMessage, error, streamQuery, reset }
}
