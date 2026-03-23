import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../services/api'

export interface Document {
  id: string
  filename: string
  page_count: number
  status: 'uploading' | 'extracting' | 'chunking' | 'embedding' | 'ready' | 'error'
  chunk_count: number | null
  created_at: string
}

interface UseDocumentsReturn {
  documents: Document[]
  selectedDocIds: string[]
  uploadDocument: (file: File) => Promise<void>
  deleteDocument: (id: string) => Promise<void>
  toggleDocSelection: (id: string) => void
  selectAll: () => void
  deselectAll: () => void
}

const POLL_INTERVAL_MS = 2000

function applyDocs(
  setDocuments: React.Dispatch<React.SetStateAction<Document[]>>,
  setSelectedDocIds: React.Dispatch<React.SetStateAction<string[]>>,
  docs: Document[]
) {
  setDocuments(docs)
  setSelectedDocIds((prev) => {
    const readyIds = docs.filter((d) => d.status === 'ready').map((d) => d.id)
    const added = readyIds.filter((id) => !prev.includes(id))
    return added.length > 0 ? [...prev, ...added] : prev
  })
}

export function useDocuments(sessionId: string | null): UseDocumentsReturn {
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([])
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!sessionId) return

    let cancelled = false

    const tick = async () => {
      const docs = await api.get<Document[]>('/api/v1/documents')
      if (cancelled) return
      applyDocs(setDocuments, setSelectedDocIds, docs)
      const allDone = docs.every((d) => d.status === 'ready' || d.status === 'error')
      if (allDone && pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }

    tick()
    pollRef.current = setInterval(tick, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [sessionId])

  const restartPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    let cancelled = false
    const tick = async () => {
      const docs = await api.get<Document[]>('/api/v1/documents')
      if (cancelled) return
      applyDocs(setDocuments, setSelectedDocIds, docs)
      const allDone = docs.every((d) => d.status === 'ready' || d.status === 'error')
      if (allDone && pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
    pollRef.current = setInterval(tick, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
    }
  }, [])

  const uploadDocument = useCallback(
    async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      const doc = await api.upload<Document>('/api/v1/documents/upload', formData)
      setDocuments((prev) => [...prev, doc])
      restartPolling()
    },
    [restartPolling]
  )

  const deleteDocument = useCallback(async (id: string) => {
    await api.delete(`/api/v1/documents/${id}`)
    setDocuments((prev) => prev.filter((d) => d.id !== id))
    setSelectedDocIds((prev) => prev.filter((sid) => sid !== id))
  }, [])

  const toggleDocSelection = useCallback((id: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    )
  }, [])

  const selectAll = useCallback(() => {
    setSelectedDocIds(documents.filter((d) => d.status === 'ready').map((d) => d.id))
  }, [documents])

  const deselectAll = useCallback(() => setSelectedDocIds([]), [])

  return {
    documents,
    selectedDocIds,
    uploadDocument,
    deleteDocument,
    toggleDocSelection,
    selectAll,
    deselectAll,
  }
}
