import type { AnalysisResult, Inspection } from './types'

export interface InspectionDraft {
  step: 'capture' | 'scanning' | 'result'
  image: string | null
  extraImages: string[]
  category: string
  batchNumber: string
  state: string
  notes: string
  productLink: string
  result: AnalysisResult | null
  savedInspection: Inspection | null
  isSaved: boolean
  updatedAt: number
}

const DB_NAME = 'ConsumerLensDraftDB'
const DB_VERSION = 1
const STORE_NAME = 'inspection_drafts'
const DRAFT_KEY = 'active_draft'
const FALLBACK_KEY = 'cl_inspection_draft_fallback'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'))
      return
    }
    const req = window.indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/**
 * Persists the current inspection progress into IndexedDB (with fallback to sessionStorage).
 * Handles large base64 packaging images without quota limit failures.
 */
export async function saveInspectionDraft(draft: Partial<InspectionDraft>): Promise<void> {
  if (typeof window === 'undefined') return

  const payload: InspectionDraft = {
    step: draft.step ?? 'capture',
    image: draft.image ?? null,
    extraImages: draft.extraImages ?? [],
    category: draft.category ?? '',
    batchNumber: draft.batchNumber ?? '',
    state: draft.state ?? 'Rajasthan',
    notes: draft.notes ?? '',
    productLink: draft.productLink ?? '',
    result: draft.result ?? null,
    savedInspection: draft.savedInspection ?? null,
    isSaved: draft.isSaved ?? false,
    updatedAt: Date.now(),
  }

  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.put(payload, DRAFT_KEY)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  } catch {
    // Fallback to sessionStorage for environments where IndexedDB is disabled or restricted
    try {
      window.sessionStorage.setItem(FALLBACK_KEY, JSON.stringify(payload))
    } catch {
      // Ignore storage errors if quota exceeded in fallback
    }
  }
}

/**
 * Loads the saved inspection draft upon page mount/reload.
 */
export async function loadInspectionDraft(): Promise<InspectionDraft | null> {
  if (typeof window === 'undefined') return null

  try {
    const db = await openDB()
    const draft = await new Promise<InspectionDraft | null>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.get(DRAFT_KEY)
      req.onsuccess = () => resolve((req.result as InspectionDraft) || null)
      req.onerror = () => resolve(null)
    })

    if (draft) return draft
  } catch {
    // Attempt fallback from sessionStorage
  }

  try {
    const raw = window.sessionStorage.getItem(FALLBACK_KEY)
    if (raw) {
      return JSON.parse(raw) as InspectionDraft
    }
  } catch {
    // Ignore JSON errors
  }

  return null
}

/**
 * Clears the active inspection draft (called on "Scan Another Product" or when starting fresh).
 */
export async function clearInspectionDraft(): Promise<void> {
  if (typeof window === 'undefined') return

  try {
    const db = await openDB()
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.delete(DRAFT_KEY)
      req.onsuccess = () => resolve()
      req.onerror = () => resolve()
    })
  } catch {}

  try {
    window.sessionStorage.removeItem(FALLBACK_KEY)
  } catch {}
}
