// Upload limits and allowed types, shared by every upload control so they cannot
// drift apart. MAX_UPLOAD_BYTES must match MaxUploadBytes in
// internal/api/uploads.go — the server enforces the same number, and a mismatch
// is what previously let a file pass the browser check and then get bounced.

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024
export const MAX_UPLOAD_LABEL = '50 MB'

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const DOCUMENT_TYPES = [...IMAGE_TYPES, 'application/pdf']

export const IMAGE_TYPE_ERROR = 'Only JPEG, PNG, and WebP images are allowed.'
export const DOCUMENT_TYPE_ERROR = 'Only JPEG, PNG, WebP, and PDF files are allowed.'
