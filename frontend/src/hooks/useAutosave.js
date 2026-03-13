import { useEffect, useRef, useState, useCallback } from 'react'

const AUTOSAVE_DELAY = 2000

/**
 * Autosave hook for form pages.
 * - New mode: persists form to localStorage so drafts survive navigation/refresh.
 * - Edit mode: debounced server save after changes stop.
 *
 * @param {string} draftKey - localStorage key for new-item drafts (e.g. 'tooldb-draft-tool')
 * @param {object} form - current form state
 * @param {object} options
 * @param {boolean} options.isEdit - whether we're in edit mode
 * @param {boolean} options.ready - true once the form is fully loaded (prevents saving stale/empty state)
 * @param {function} options.onServerSave - async fn to call for edit-mode autosave, should return { error }
 * @returns {{ autoSaveStatus: string|null, clearDraft: function, loadDraft: function }}
 */
export default function useAutosave(draftKey, form, { isEdit, ready, onServerSave }) {
  const [autoSaveStatus, setAutoSaveStatus] = useState(null)
  const timerRef = useRef(null)
  const initialLoadRef = useRef(true)

  // Save draft to localStorage (new mode only)
  useEffect(() => {
    if (isEdit || !ready) return
    // Skip the first render (initial empty form or restored draft)
    if (initialLoadRef.current) {
      initialLoadRef.current = false
      return
    }
    try {
      localStorage.setItem(draftKey, JSON.stringify(form))
    } catch {}
  }, [form, isEdit, ready, draftKey])

  // Debounced server autosave (edit mode only)
  useEffect(() => {
    if (!isEdit || !ready || !onServerSave) return
    // Skip the first render after load
    if (initialLoadRef.current) {
      initialLoadRef.current = false
      return
    }

    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(async () => {
      setAutoSaveStatus('saving')
      const result = await onServerSave()
      if (result?.error) {
        setAutoSaveStatus('error')
      } else {
        setAutoSaveStatus('saved')
        setTimeout(() => setAutoSaveStatus(null), 2000)
      }
    }, AUTOSAVE_DELAY)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [form, isEdit, ready, onServerSave])

  // Reset initialLoadRef when mode changes (new -> edit after first save)
  useEffect(() => {
    initialLoadRef.current = true
  }, [isEdit])

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(draftKey)
    } catch {}
  }, [draftKey])

  const loadDraft = useCallback(() => {
    try {
      const saved = localStorage.getItem(draftKey)
      if (saved) return JSON.parse(saved)
    } catch {}
    return null
  }, [draftKey])

  return { autoSaveStatus, clearDraft, loadDraft }
}
