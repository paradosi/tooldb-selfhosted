import { useState, useEffect } from 'react'
import { Camera, Star, Trash2, Loader2, RotateCw } from 'lucide-react'
import { get, put, del, upload } from '../lib/api'

export default function PhotoUpload({ toolId }) {
  const [photos, setPhotos] = useState([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!toolId) return
    loadPhotos()
  }, [toolId])

  async function loadPhotos() {
    try {
      const data = await get('/tools/' + toolId + '/photos')
      if (data) setPhotos(data)
    } catch {}
  }

  const MAX_PHOTOS = 5
  const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

  const atLimit = photos.length >= MAX_PHOTOS

  async function handleFileSelect(e) {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    const remaining = MAX_PHOTOS - photos.length
    if (files.length > remaining) {
      setError(`You can only add ${remaining} more photo${remaining === 1 ? '' : 's'} (limit ${MAX_PHOTOS} per tool).`)
      e.target.value = ''
      return
    }

    setUploading(true)
    setError(null)

    try {
      for (const file of files) {
        if (!ALLOWED_TYPES.includes(file.type)) {
          throw new Error(`${file.name}: Only JPEG, PNG, and WebP files are allowed.`)
        }
        if (file.size > MAX_SIZE) {
          throw new Error(`${file.name}: File must be under 10 MB.`)
        }
        await upload('/tools/' + toolId + '/photos', file)
      }

      await loadPhotos()
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function setPrimary(photoId) {
    await put('/photos/' + photoId, { is_primary: true })
    await loadPhotos()
  }

  async function rotatePhoto(photoId, currentRotation) {
    const next = (currentRotation + 90) % 360
    await put('/photos/' + photoId, { rotation: next })
    await loadPhotos()
  }

  async function deletePhoto(photoId) {
    await del('/photos/' + photoId)
    await loadPhotos()
  }

  if (!toolId) return null

  return (
    <div className="bg-card border border-bd rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-fg-muted uppercase tracking-wider">Photos</h2>
        <span className="text-xs text-fg-faint">{photos.length}/{MAX_PHOTOS}</span>
      </div>

      {photos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group">
              <div className={`w-full aspect-square rounded-lg overflow-hidden ${
                photo.is_primary ? 'ring-2 ring-accent' : ''
              }`}>
                <img
                  src={photo.url}
                  alt="Tool photo"
                  className="w-full h-full object-cover"
                  style={photo.rotation ? { transform: `rotate(${photo.rotation}deg) scale(1.2)` } : undefined}
                />
              </div>
              <div className="absolute inset-0 bg-overlay rounded-lg flex items-center justify-center gap-2 sm:opacity-0 sm:group-hover:opacity-100 sm:transition-opacity">
                <button
                  type="button"
                  onClick={() => rotatePhoto(photo.id, photo.rotation || 0)}
                  title="Rotate"
                  className="p-1.5 bg-white/20 rounded-full text-white cursor-pointer"
                >
                  <RotateCw size={14} />
                </button>
                {!photo.is_primary && (
                  <button
                    type="button"
                    onClick={() => setPrimary(photo.id)}
                    title="Set as primary"
                    className="p-1.5 bg-accent rounded-full text-white cursor-pointer"
                  >
                    <Star size={14} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => deletePhoto(photo.id)}
                  title="Delete photo"
                  className="p-1.5 bg-warn rounded-full text-white cursor-pointer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              {photo.is_primary && (
                <div className="absolute top-1 left-1 bg-accent rounded-full p-0.5">
                  <Star size={10} className="text-white fill-white" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {atLimit ? (
        <p className="text-xs text-fg-faint text-center py-2">Maximum {MAX_PHOTOS} photos reached. Delete one to add more.</p>
      ) : (
        <label className="flex items-center justify-center gap-2 w-full py-3 border border-dashed border-bd-input hover:border-accent rounded-lg text-sm text-fg-muted hover:text-accent transition-colors cursor-pointer">
          {uploading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Camera size={18} />
              Add Photos
            </>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple

            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
          />
        </label>
      )}

      {error && (
        <p className="text-sm text-warn">{error}</p>
      )}
    </div>
  )
}
