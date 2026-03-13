const BASE = ''  // same origin, Go serves both

function getHeaders() {
  const headers = { 'Content-Type': 'application/json' }
  const token = localStorage.getItem('tooldb-token')
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

export async function api(path, options = {}) {
  const res = await fetch(`${BASE}/api${path}`, {
    headers: getHeaders(),
    ...options,
  })
  if (res.status === 401) {
    localStorage.removeItem('tooldb-token')
    window.location.href = '/auth'
    return
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  if (res.status === 204) return null
  return res.json()
}

export const get = (path) => api(path)
export const post = (path, body) => api(path, { method: 'POST', body: JSON.stringify(body) })
export const put = (path, body) => api(path, { method: 'PUT', body: JSON.stringify(body) })
export const del = (path) => api(path, { method: 'DELETE' })

export async function upload(path, file) {
  const headers = {}
  const token = localStorage.getItem('tooldb-token')
  if (token) headers['Authorization'] = `Bearer ${token}`

  const form = new FormData()
  form.append('file', file)

  const res = await fetch(`/api${path}`, { method: 'POST', headers, body: form })
  if (!res.ok) throw new Error('Upload failed')
  return res.json()
}
