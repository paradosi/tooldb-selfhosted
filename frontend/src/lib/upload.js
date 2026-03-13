import { supabase } from './supabase'

const UPLOAD_URL = import.meta.env.VITE_UPLOAD_URL || 'https://upload.tooldb.io'

export async function uploadFile(file, userId, toolId, subfolder = 'photos') {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const formData = new FormData()
  formData.append('file', file)
  formData.append('user_id', userId)
  formData.append('tool_id', toolId)
  formData.append('subfolder', subfolder)

  const res = await fetch(UPLOAD_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${session.access_token}` },
    body: formData,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || 'Upload failed')
  }

  const { url } = await res.json()
  return url
}
