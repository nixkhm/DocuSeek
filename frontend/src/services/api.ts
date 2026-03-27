const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

export const SESSION_KEY = 'docuseek_session_id'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const sessionId = localStorage.getItem(SESSION_KEY)

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  }

  if (sessionId) {
    headers['X-Session-ID'] = sessionId
  }

  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers })

  // Store session ID returned by the backend (new session creation or refresh)
  const returnedId = response.headers.get('X-Session-ID')
  if (returnedId) {
    localStorage.setItem(SESSION_KEY, returnedId)
  }

  if (response.status === 401) {
    localStorage.removeItem(SESSION_KEY)
    window.location.reload()
    throw new Error('Session expired')
  }

  if (response.status === 204) {
    return undefined as T
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: response.statusText }))
    throw new Error(body.detail ?? 'Request failed')
  }

  return response.json() as Promise<T>
}

export const api = {
  get: <T>(path: string) => request<T>(path),

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),

  upload: <T>(path: string, formData: FormData) =>
    request<T>(path, { method: 'POST', body: formData }),

  fetchPdfBlob: async (docId: string): Promise<string> => {
    const sessionId = localStorage.getItem(SESSION_KEY)
    const response = await fetch(`${BASE_URL}/api/v1/documents/${docId}/file`, {
      headers: sessionId ? { 'X-Session-ID': sessionId } : {},
    })
    if (!response.ok) throw new Error('Failed to load PDF')
    const blob = await response.blob()
    return URL.createObjectURL(blob)
  },
}
