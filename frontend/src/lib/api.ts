// Single typed API client for the Nerum backend.
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const TOKEN_KEY = 'nerum_token'

function authHeaders(extra?: HeadersInit): HeadersInit {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `Request failed (${res.status})`
    try {
      const body = (await res.json()) as { detail?: string | { msg?: string }[] }
      if (typeof body.detail === 'string') detail = body.detail
      else if (Array.isArray(body.detail) && body.detail[0]?.msg) detail = body.detail[0].msg!
    } catch {
      /* non-JSON error */
    }
    throw new Error(detail)
  }
  return (await res.json()) as T
}

export interface SSEEvent {
  type: string
  content?: string
  data?: unknown
  session_id?: string
}

export const api = {
  url: API_URL,

  get<T>(path: string): Promise<T> {
    return fetch(`${API_URL}${path}`, { headers: authHeaders() }).then(handle<T>)
  },
  post<T>(path: string, body?: unknown): Promise<T> {
    return fetch(`${API_URL}${path}`, { method: 'POST', headers: authHeaders(), body: body ? JSON.stringify(body) : undefined }).then(handle<T>)
  },
  put<T>(path: string, body?: unknown): Promise<T> {
    return fetch(`${API_URL}${path}`, { method: 'PUT', headers: authHeaders(), body: body ? JSON.stringify(body) : undefined }).then(handle<T>)
  },
  del<T>(path: string): Promise<T> {
    return fetch(`${API_URL}${path}`, { method: 'DELETE', headers: authHeaders() }).then(handle<T>)
  },

  /** POST a body and stream SSE `data:` frames. Throws on non-2xx before streaming. */
  async stream(path: string, body: unknown, onEvent: (e: SSEEvent) => void, signal?: AbortSignal): Promise<void> {
    const res = await fetch(`${API_URL}${path}`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body), signal })
    if (!res.ok || !res.body) {
      let detail = `Request failed (${res.status})`
      try {
        const j = (await res.json()) as { detail?: string }
        if (j.detail) detail = j.detail
      } catch {
        /* ignore */
      }
      throw new Error(detail)
    }
    const reader = res.body.getReader()
    const dec = new TextDecoder()
    let buf = ''
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buf += dec.decode(value, { stream: true })
      const parts = buf.split('\n\n')
      buf = parts.pop() ?? ''
      for (const block of parts) {
        const data = block.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim()).join('')
        if (!data) continue
        try {
          onEvent(JSON.parse(data) as SSEEvent)
        } catch {
          /* skip malformed frame */
        }
      }
    }
  },
}
