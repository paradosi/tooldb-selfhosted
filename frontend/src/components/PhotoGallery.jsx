import { useState } from 'react'
import { X } from 'lucide-react'

export default function PhotoGallery({ photos }) {
  const [lightboxPhoto, setLightboxPhoto] = useState(null)

  if (!photos || photos.length === 0) return null

  const sorted = [...photos].sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0))

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {sorted.map((photo) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setLightboxPhoto(photo)}
            className={`flex-shrink-0 rounded-lg overflow-hidden cursor-pointer ${
              photo.is_primary ? 'ring-2 ring-accent' : ''
            }`}
          >
            <img
              src={photo.url}
              alt="Tool photo"
              className="w-24 h-24 sm:w-32 sm:h-32 object-cover"
              style={photo.rotation ? { transform: `rotate(${photo.rotation}deg) scale(1.2)` } : undefined}
            />
          </button>
        ))}
      </div>

      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 bg-overlay flex items-center justify-center p-4"
          onClick={() => setLightboxPhoto(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxPhoto(null)}
            className="absolute top-4 right-4 text-white/70 hover:text-white cursor-pointer"
          >
            <X size={28} />
          </button>
          <img
            src={lightboxPhoto.url}
            alt="Full size"
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            style={lightboxPhoto.rotation ? { transform: `rotate(${lightboxPhoto.rotation}deg)` } : undefined}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}
