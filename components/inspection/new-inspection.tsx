'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Upload,
  Camera,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ArrowRight,
  ArrowLeft,
  Trash2,
  Link as LinkIcon,
  RefreshCw,
  X,
  Loader2,
  Download,
  Save,
  MapPin,
  Sparkles,
  Plus,
  Type,
  ShieldAlert,
  Check,
  Eye,
  Image as ImageIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CATEGORIES, STATES, DECLARATION_TEMPLATE } from '@/lib/data'
import { cn } from '@/lib/utils'
import { generateInspectionPDF } from '@/lib/pdf-report'
import { LabelInspector } from '@/components/inspection/label-inspector'
import { PdfViewerModal } from '@/components/inspection/pdf-modal'
import { saveInspectionDraft, loadInspectionDraft, clearInspectionDraft } from '@/lib/inspection-draft'
import type { AnalysisResult, AnalysisField, Inspection } from '@/lib/types'

type Step = 'capture' | 'scanning' | 'result'

interface TickerItem {
  text: string
  done: boolean
}

const INDIAN_STATE_COORDS: { state: string; latMin: number; latMax: number; lngMin: number; lngMax: number }[] = [
  { state: 'Rajasthan', latMin: 23.0, latMax: 30.2, lngMin: 69.5, lngMax: 78.3 },
  { state: 'Maharashtra', latMin: 15.5, latMax: 22.1, lngMin: 72.6, lngMax: 80.9 },
  { state: 'Delhi', latMin: 28.3, latMax: 28.9, lngMin: 76.8, lngMax: 77.4 },
  { state: 'Karnataka', latMin: 11.5, latMax: 18.5, lngMin: 74.2, lngMax: 78.6 },
  { state: 'Tamil Nadu', latMin: 8.1, latMax: 13.5, lngMin: 76.2, lngMax: 80.3 },
  { state: 'Telangana', latMin: 15.8, latMax: 19.9, lngMin: 77.2, lngMax: 81.3 },
  { state: 'Gujarat', latMin: 20.1, latMax: 24.7, lngMin: 68.1, lngMax: 74.5 },
  { state: 'West Bengal', latMin: 21.5, latMax: 27.2, lngMin: 85.8, lngMax: 89.9 },
  { state: 'Uttar Pradesh', latMin: 23.8, latMax: 30.4, lngMin: 77.1, lngMax: 84.6 },
  { state: 'Kerala', latMin: 8.3, latMax: 12.8, lngMin: 74.8, lngMax: 77.4 },
  { state: 'Haryana', latMin: 27.6, latMax: 30.9, lngMin: 74.5, lngMax: 77.6 },
  { state: 'Punjab', latMin: 29.5, latMax: 32.5, lngMin: 73.8, lngMax: 76.9 },
  { state: 'Madhya Pradesh', latMin: 21.1, latMax: 26.9, lngMin: 74.0, lngMax: 82.8 },
]

function detectStateFromGPS(lat: number, lng: number): string | null {
  for (const s of INDIAN_STATE_COORDS) {
    if (lat >= s.latMin && lat <= s.latMax && lng >= s.lngMin && lng <= s.lngMax) {
      return s.state
    }
  }
  return null
}

async function compressImageFile(file: File): Promise<{ dataUrl: string; file: File }> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const rawDataUrl = e.target?.result as string
      if (!rawDataUrl) return resolve({ dataUrl: '', file })
      const img = new window.Image()
      img.onload = () => {
        const MAX_DIM = 1280
        let { width, height } = img
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width)
            width = MAX_DIM
          } else {
            width = Math.round((width * MAX_DIM) / height)
            height = MAX_DIM
          }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.84)
          canvas.toBlob(
            (blob) => {
              const compressedFile = blob
                ? new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), { type: 'image/jpeg' })
                : file
              resolve({ dataUrl, file: compressedFile })
            },
            'image/jpeg',
            0.84,
          )
          return
        }
        resolve({ dataUrl: rawDataUrl, file })
      }
      img.onerror = () => resolve({ dataUrl: rawDataUrl, file })
      img.src = rawDataUrl
    }
    reader.onerror = () => resolve({ dataUrl: '', file })
    reader.readAsDataURL(file)
  })
}

export function NewInspection() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const extraFileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [step, setStep] = useState<Step>('capture')
  const [image, setImage] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [extraImages, setExtraImages] = useState<string[]>([])
  const [fileName, setFileName] = useState<string>('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [batchNumber, setBatchNumber] = useState('')
  const [state, setState] = useState(STATES[0])
  const [notes, setNotes] = useState('')
  const [productLink, setProductLink] = useState('')

  const [tickerItems, setTickerItems] = useState<TickerItem[]>([])
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [isScraping, setIsScraping] = useState(false)
  const [scrapeError, setScrapeError] = useState<string | null>(null)
  const [savedInspection, setSavedInspection] = useState<Inspection | null>(null)
  const [isSaved, setIsSaved] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [isViewingPdf, setIsViewingPdf] = useState(false)
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false)
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null)
  const [isDraftRestored, setIsDraftRestored] = useState(false)

  // Restore draft progress on page reload/refresh
  useEffect(() => {
    let active = true
    loadInspectionDraft().then((draft) => {
      if (!active || !draft) {
        setIsDraftRestored(true)
        return
      }

      if (draft.step === 'result' && draft.result) {
        setResult(draft.result)
        setStep('result')
      } else if (draft.step === 'capture') {
        setStep('capture')
      } else if (draft.step === 'scanning') {
        setStep('capture')
      }

      if (draft.image) setImage(draft.image)
      if (draft.extraImages && draft.extraImages.length > 0) setExtraImages(draft.extraImages)
      if (draft.category) setCategory(draft.category)
      if (draft.batchNumber) setBatchNumber(draft.batchNumber)
      if (draft.state) setState(draft.state)
      if (draft.notes) setNotes(draft.notes)
      if (draft.productLink) setProductLink(draft.productLink)
      if (draft.savedInspection) setSavedInspection(draft.savedInspection)
      if (draft.isSaved) setIsSaved(draft.isSaved)

      setIsDraftRestored(true)
    })
    return () => {
      active = false
    }
  }, [])

  // Auto-persist draft progress across state changes
  useEffect(() => {
    if (!isDraftRestored) return

    const timer = setTimeout(() => {
      if (!image && !result && !batchNumber && !notes && !productLink && step === 'capture') {
        return
      }

      saveInspectionDraft({
        step,
        image,
        extraImages,
        category,
        batchNumber,
        state,
        notes,
        productLink,
        result,
        savedInspection,
        isSaved,
      })
    }, 250)

    return () => clearTimeout(timer)
  }, [
    isDraftRestored,
    step,
    image,
    extraImages,
    category,
    batchNumber,
    state,
    notes,
    productLink,
    result,
    savedInspection,
    isSaved,
  ])

  const [stateOptions, setStateOptions] = useState<string[]>(STATES)
  const [geoCoords, setGeoCoords] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null)
  const [isLocating, setIsLocating] = useState(false)
  const [locationBadge, setLocationBadge] = useState<string | null>(null)
  const [activePreviewIndex, setActivePreviewIndex] = useState<number>(0)

  const handleAutoDetectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationBadge('Geolocation not supported on browser')
      return
    }
    setIsLocating(true)
    setLocationBadge('Acquiring GPS fix...')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        const acc = Math.round(pos.coords.accuracy)
        setGeoCoords({ lat, lng, accuracy: acc })

        // Try reverse geocoding API for exact State name
        let detectedState: string | null = null
        let detectedCity: string | null = null

        try {
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
          )
          if (res.ok) {
            const data = await res.json()
            detectedState = data.principalSubdivision || data.localityInfo?.administrative?.[1]?.name || null
            detectedCity = data.city || data.locality || ''
          }
        } catch {
          // Ignore network errors, fall back to coordinate mapping
        }

        if (!detectedState) {
          detectedState = detectStateFromGPS(lat, lng)
        }

        if (detectedState) {
          // Normalize state name to match dropdown options or add it dynamically
          const matched = stateOptions.find(
            (s) => s.toLowerCase() === detectedState!.toLowerCase() || detectedState!.toLowerCase().includes(s.toLowerCase())
          ) || detectedState

          if (!stateOptions.includes(matched)) {
            setStateOptions((prev) => [matched, ...prev])
          }

          setState(matched)
          const cityStr = detectedCity ? `${detectedCity}, ` : ''
          setLocationBadge(`GPS Fix: ${cityStr}${matched} (${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E)`)
        } else {
          setLocationBadge(`GPS Fix: ${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E (±${acc}m)`)
        }
        setIsLocating(false)
      },
      (err) => {
        console.warn('GPS error:', err)
        setLocationBadge('Using manual location selection')
        setIsLocating(false)
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }, [stateOptions])

  // Auto-detect GPS location on load
  useEffect(() => {
    handleAutoDetectLocation()
  }, [handleAutoDetectLocation])

  const handleIncomingFile = async (file: File, nameFallback?: string) => {
    setFileName(file.name || nameFallback || 'Product Label.jpg')
    const { dataUrl, file: compressed } = await compressImageFile(file)
    if (dataUrl) {
      if (!image) {
        setImage(dataUrl)
        setImageFile(compressed)
      } else {
        setExtraImages((prev) => [...prev, dataUrl])
      }
    }
  }

  // Clipboard Paste Support
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (step !== 'capture') return

      const items = e.clipboardData?.items
      if (!items) return

      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile()
          if (file) {
            handleIncomingFile(file, 'Pasted Image.jpg')
            break
          }
        }
      }
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [step])

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
  }, [])

  // Derive product name from file name
  const displayProductName = result?.productName
    ? result.productName
    : fileName
    ? fileName
        .replace(/\.[^/.]+$/, '')
        .replace(/[-_]/g, ' ')
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    : 'Product Label'

  // Step indicator state
  const currentStepNum = step === 'capture' ? 1 : step === 'scanning' ? 2 : 3

  const triggerUpload = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleIncomingFile(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleIncomingFile(file)
    }
  }

  // ---- Camera Capture ----
  const openCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      })
      streamRef.current = mediaStream
      setIsCameraOpen(true)

      // Wait for the video element to be mounted
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
          videoRef.current.play()
        }
      })
    } catch (err) {
      console.error('Camera access error:', err)
      setError('Camera access denied. Please allow camera permissions or upload an image instead.')
    }
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0)
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' })
        handleIncomingFile(file, 'Camera Capture.jpg')
        closeCamera()
      },
      'image/jpeg',
      0.92
    )
  }

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setIsCameraOpen(false)
  }

  // ---- URL Scraping ----
  const handleScrapeUrl = async () => {
    if (!productLink || isScraping) return

    setIsScraping(true)
    setScrapeError(null)

    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: productLink }),
      })

      const data = await res.json()

      if (!res.ok) {
        setScrapeError(data.error || 'Failed to fetch product page')
        setIsScraping(false)
        return
      }

      // If images were extracted and no local image uploaded, set all gallery images
      const allImgs: string[] = Array.isArray(data.images) && data.images.length > 0
        ? data.images
        : (data.image ? [data.image] : [])

      if (allImgs.length > 0 && !image) {
        setImage(allImgs[0])
        if (allImgs.length > 1) {
          setExtraImages(allImgs.slice(1))
        }
      }

      if (data.title) {
        setFileName(data.title)
      }

      // Run analysis with scraped text and ALL extracted packaging images
      runUrlAnalysis(data.text, data.title, allImgs)
    } catch (err) {
      setScrapeError(`Network error: ${(err as Error).message}`)
      setIsScraping(false)
    }
  }

  // ---- Robust SSE Stream Processor ----
  const readSseResponse = async (
    reader: ReadableStreamDefaultReader<Uint8Array>,
    onComplete: (res: AnalysisResult) => Promise<void> | void,
    onFail: (err: string) => void
  ) => {
    const decoder = new TextDecoder()
    let buffer = ''

    const handleEventBlock = async (block: string) => {
      let eventType = 'message'
      let eventData = ''
      for (const rawLine of block.split('\n')) {
        const line = rawLine.trim()
        if (line.startsWith('event:')) {
          eventType = line.slice(6).trim()
        } else if (line.startsWith('data:')) {
          eventData = line.slice(5).trim()
        }
      }

      if (eventData) {
        try {
          const parsed = JSON.parse(eventData)
          if (eventType === 'progress') {
            setTickerItems((prev) => {
              const updated = prev.map((t) => ({ ...t, done: true }))
              return [...updated, { text: parsed.message || 'Analyzing…', done: false }]
            })
          } else if (eventType === 'result') {
            setTickerItems((prev) => prev.map((t) => ({ ...t, done: true })))
            setResult(parsed as AnalysisResult)
            if (parsed.images && Array.isArray(parsed.images) && parsed.images.length > 0) {
              setImage(parsed.images[0])
              if (parsed.images.length > 1) {
                setExtraImages(parsed.images.slice(1))
              }
            }
            await onComplete(parsed as AnalysisResult)
          } else if (eventType === 'error') {
            onFail(parsed.error || 'Analysis failed')
          }
        } catch (err) {
          console.error('SSE JSON parse error:', err, eventData)
        }
      }
    }

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      let boundary: number
      while ((boundary = buffer.indexOf('\n\n')) !== -1) {
        const block = buffer.slice(0, boundary)
        buffer = buffer.slice(boundary + 2)
        if (block.trim()) {
          await handleEventBlock(block)
        }
      }
    }

    if (buffer.trim()) {
      await handleEventBlock(buffer)
    }
  }

  // ---- Analysis (Image Flow) ----
  const runAnalysis = useCallback(async () => {
    if (!imageFile && !image) return

    setStep('scanning')
    setError(null)
    setResult(null)
    setTickerItems([])

    const formData = new FormData()

    if (imageFile) {
      formData.append('image', imageFile)
    } else if (image) {
      const res = await fetch(image)
      const blob = await res.blob()
      formData.append('image', blob, 'label.jpg')
    }

    const allImages = [image, ...extraImages].filter(Boolean) as string[]
    if (allImages.length > 0) {
      formData.append('images', JSON.stringify(allImages))
    }

    formData.append('category', category)
    formData.append('batchNumber', batchNumber)
    formData.append('state', state)
    formData.append('notes', notes)
    formData.append('sourceType', 'image')

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const err = await response.json()
        setError(err.error || 'Analysis failed')
        setStep('capture')
        return
      }

      const reader = response.body?.getReader()
      if (!reader) {
        setError('Failed to read response stream')
        setStep('capture')
        return
      }

      await readSseResponse(
        reader,
        async () => {
          await new Promise((r) => setTimeout(r, 600))
          setStep('result')
        },
        (err) => {
          setError(err)
          setStep('capture')
        }
      )
    } catch (err) {
      setError(`Network error: ${(err as Error).message}`)
      setStep('capture')
    }
  }, [imageFile, image, extraImages, category, batchNumber, state, notes])

  // ---- Analysis (URL Flow) ----
  const runUrlAnalysis = async (listingText: string, title: string, productImages?: string[] | null) => {
    setStep('scanning')
    setError(null)
    setResult(null)
    setTickerItems([])
    setIsScraping(false)
    setFileName(title || 'E-commerce Listing')

    const allImagesToSend = (productImages && productImages.length > 0)
      ? productImages
      : (image ? [image, ...extraImages] : [])

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceType: 'url',
          listingText,
          images: allImagesToSend,
          productImageUrl: allImagesToSend[0] || null,
          category,
          batchNumber,
          state,
          notes,
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        setError(err.error || 'Analysis failed')
        setStep('capture')
        return
      }

      const reader = response.body?.getReader()
      if (!reader) {
        setError('Failed to read response stream')
        setStep('capture')
        return
      }

      await readSseResponse(
        reader,
        async () => {
          await new Promise((r) => setTimeout(r, 600))
          setStep('result')
        },
        (err) => {
          setError(err)
          setStep('capture')
        }
      )
    } catch (err) {
      setError(`Network error: ${(err as Error).message}`)
      setStep('capture')
    }
  }

  const reset = () => {
    clearInspectionDraft()
    setImage(null)
    setImageFile(null)
    setFileName('')
    setExtraImages([])
    setBatchNumber('')
    setNotes('')
    setProductLink('')
    setTickerItems([])
    setResult(null)
    setError(null)
    setActiveKey(null)
    setScrapeError(null)
    setSavedInspection(null)
    setIsSaved(false)
    setStep('capture')
  }

  // Computed result values
  const violations = result?.fields.filter((f) => f.status !== 'compliant') ?? []
  const scoreColor =
    (result?.score ?? 0) >= 85 ? 'text-success' : (result?.score ?? 0) >= 60 ? 'text-warning' : 'text-danger'
  const strokeColor =
    (result?.score ?? 0) >= 85 ? 'stroke-success' : (result?.score ?? 0) >= 60 ? 'stroke-warning' : 'stroke-danger'
  const statusText = result?.status === 'compliant' ? 'COMPLIANT' : 'NON-COMPLIANT'
  const statusColor = result?.status === 'compliant' ? 'text-success' : 'text-danger'

  const fieldInputCls =
    'h-10 w-full rounded-md border border-muted-foreground/30 bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all'

  return (
    <div className="w-full max-w-full overflow-x-hidden min-h-full bg-[#FAFAF9] -m-3.5 sm:-m-5 lg:-m-8 p-3.5 sm:p-5 lg:p-8">
      <div className="max-w-5xl mx-auto w-full min-w-0">
        {/* CSS-Based Animations Container */}
        <style>{`
          @keyframes radarSweep {
            0% { top: 0%; }
            50% { top: 100%; }
            100% { top: 0%; }
          }
          .animate-scan-line {
            position: absolute;
            left: 0;
            right: 0;
            height: 2px;
            background-color: oklch(0.795 0.184 71.15);
            box-shadow: 0 0 16px 4px oklch(0.795 0.184 71.15);
            animation: radarSweep 3s infinite ease-in-out;
          }
          @keyframes pulseAmber {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.3); opacity: 0.6; }
          }
          .pulse-amber {
            animation: pulseAmber 1s infinite ease-in-out;
          }
        `}</style>

        {/* Hidden canvas for camera capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Error banner */}
        {error && step === 'capture' && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 animate-[fadeIn_0.3s_ease-out_forwards]">
            <AlertCircle className="size-5 text-danger shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-danger">Analysis Failed</p>
              <p className="text-sm text-muted-foreground mt-0.5">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          </div>
        )}

        {/* Step progress bar */}
        <div className="relative mb-10 max-w-md mx-auto select-none">
          <div className="absolute left-8 right-8 top-[10px] flex items-center justify-between z-0 pointer-events-none">
            <div
              className={cn(
                'h-[1px] flex-1 transition-colors duration-300',
                currentStepNum > 1 ? 'bg-success' : 'bg-border'
              )}
            />
            <div
              className={cn(
                'h-[1px] flex-1 transition-colors duration-300',
                currentStepNum > 2 ? 'bg-success' : 'bg-border'
              )}
            />
          </div>

          <div className="relative z-10 flex items-center justify-between">
            {[
              { num: 1, label: 'Capture' },
              { num: 2, label: 'Analysis' },
              { num: 3, label: 'Report' },
            ].map((s) => {
              const active = s.num === currentStepNum
              const completed = s.num < currentStepNum
              return (
                <div key={s.num} className="flex flex-col items-center gap-1.5 w-20">
                  <span
                    className={cn(
                      'flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-all duration-300 z-10',
                      active ? 'bg-primary text-white shadow-sm' : '',
                      completed ? 'bg-success text-white' : '',
                      !active && !completed ? 'border border-muted-foreground/40 bg-background text-muted-foreground' : ''
                    )}
                  >
                    {completed ? <CheckCircle2 className="size-3 text-white" strokeWidth={3} /> : s.num}
                  </span>
                  <span
                    className={cn(
                      'text-xs font-medium transition-colors duration-300 text-center whitespace-nowrap',
                      active ? 'text-foreground font-semibold' : 'text-muted-foreground'
                    )}
                  >
                    {s.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* STATE 1 — Upload / Capture */}
        {step === 'capture' && (
          <div className="flex flex-col gap-6 animate-[fadeIn_0.3s_ease-out_forwards]">
            {/* Hidden File Inputs */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            <input
              type="file"
              ref={extraFileInputRef}
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (file) {
                  const { dataUrl } = await compressImageFile(file)
                  if (dataUrl) {
                    setExtraImages((prev) => [...prev, dataUrl])
                  }
                }
              }}
              accept="image/*"
              className="hidden"
            />

            {/* Camera Modal */}
            {isCameraOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 animate-[fadeIn_0.2s_ease-out]">
                <div className="relative w-full max-w-2xl mx-4">
                  <div className="relative rounded-lg overflow-hidden bg-black">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full max-h-[70vh] object-contain"
                    />
                    <div className="absolute bottom-0 inset-x-0 flex items-center justify-center gap-4 p-6 bg-gradient-to-t from-black/80 to-transparent">
                      <button
                        onClick={closeCamera}
                        className="flex size-12 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors backdrop-blur-sm"
                      >
                        <X className="size-5" />
                      </button>
                      <button
                        onClick={capturePhoto}
                        className="flex size-16 items-center justify-center rounded-full bg-white hover:bg-white/90 transition-colors shadow-lg"
                      >
                        <div className="size-12 rounded-full border-4 border-gray-800" />
                      </button>
                      <div className="size-12" /> {/* spacer for centering */}
                    </div>
                  </div>
                  <p className="text-center text-white/70 text-sm mt-3">Position the product label within the frame</p>
                </div>
              </div>
            )}

            {/* Two-Column Side-by-Side Layout */}
            <div className="grid gap-6 lg:grid-cols-2 items-stretch min-h-[420px]">
              {/* Left Column: Upload Zone, Camera Button, OR divider, & Product URL Field */}
              <div className="flex flex-col justify-between gap-3">
                {/* Upload Zone */}
                <div
                  onClick={triggerUpload}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={cn(
                    'group/dropbox relative flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-4 md:p-6 text-center transition-all duration-200 cursor-pointer min-h-[180px] md:min-h-[340px] select-none bg-[#FAF8F5]',
                    image
                      ? 'border-border bg-white'
                      : dragActive
                      ? 'border-primary bg-primary/[0.04]'
                      : 'border-muted-foreground/30 hover:border-primary'
                  )}
                  title="Click or drag to upload an image. You can also paste directly using Ctrl+V / Cmd+V."
                >
                  {image ? (
                    <div className="flex flex-col gap-3 w-full">
                      <div className="relative w-full h-[180px] md:h-[260px] flex items-center justify-center overflow-hidden rounded-md bg-muted/20">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={extraImages.length > 0 && activePreviewIndex > 0 ? extraImages[activePreviewIndex - 1] : image}
                          alt="Uploaded label preview"
                          className="max-h-[160px] md:max-h-[240px] w-auto object-contain rounded-md animate-[fadeIn_0.3s_ease-out]"
                        />
                        
                        {/* Red Delete Button in top-right corner */}
                        <div className="absolute top-2 right-2 z-10">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (activePreviewIndex > 0) {
                                setExtraImages(extraImages.filter((_, i) => i !== activePreviewIndex - 1))
                                setActivePreviewIndex(0)
                              } else {
                                if (extraImages.length > 0) {
                                  setImage(extraImages[0])
                                  setExtraImages(extraImages.slice(1))
                                } else {
                                  setImage(null)
                                  setImageFile(null)
                                  setFileName('')
                                }
                                setActivePreviewIndex(0)
                              }
                            }}
                            className="flex size-7 items-center justify-center rounded-full bg-red-600 hover:bg-red-700 text-white shadow-md transition-all cursor-pointer"
                            title="Delete photo"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Multi-Image Thumbnail Strip */}
                      <div className="flex items-center gap-2.5 overflow-x-auto pb-1 pt-1 select-none" onClick={(e) => e.stopPropagation()}>
                        {[image, ...extraImages].map((imgSrc, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setActivePreviewIndex(idx)}
                            className={cn(
                              'relative size-14 shrink-0 rounded-lg border-2 overflow-hidden transition-all bg-white cursor-pointer p-0.5',
                              activePreviewIndex === idx
                                ? 'border-primary shadow-xs'
                                : 'border-border opacity-60 hover:opacity-100'
                            )}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={imgSrc} alt={`Label photo ${idx + 1}`} className="size-full object-contain rounded-md" />
                          </button>
                        ))}

                        <button
                          type="button"
                          onClick={() => extraFileInputRef.current?.click()}
                          className="flex size-14 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border/80 bg-background hover:border-primary hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all cursor-pointer"
                          title="Add packaging photo"
                        >
                          <Plus className="size-4" />
                          <span className="text-[10px] font-medium leading-none">Add</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload className="size-8 md:size-12 text-muted-foreground/60 transition-colors group-hover/dropbox:text-primary" strokeWidth={1.5} />
                      <div className="max-w-[280px]">
                        <p className="text-sm md:text-base font-medium text-foreground transition-colors group-hover/dropbox:text-primary">
                          Drop product label images here
                        </p>
                        <p className="mt-0.5 md:mt-1 text-[11px] md:text-xs text-muted-foreground">PNG, JPG, HEIC up to 20MB</p>
                        <p className="mt-0.5 md:mt-1 text-[10px] md:text-[11px] text-muted-foreground/70">Or paste directly (Cmd+V / Ctrl+V)</p>
                      </div>
                    </>
                  )}
                </div>

                {/* Single Minimal Camera Option */}
                <button
                  type="button"
                  onClick={openCamera}
                  className="flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-border bg-background text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  <Camera className="size-3.5 text-muted-foreground" /> Take Photo Using Camera
                </button>

                {/* Subtle "OR" Divider */}
                <div className="relative flex items-center justify-center my-0.5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border/70" />
                  </div>
                  <span className="relative bg-[#FAFAF9] px-2 text-[10px] font-semibold tracking-wider text-muted-foreground/70 uppercase">
                    OR
                  </span>
                </div>

                {/* Product URL Input Field with inline Scan button */}
                <label className="text-sm block">
                  <span className="mb-1 block text-[13px] font-medium text-foreground">
                    Product URL (Amazon / amzn.in / Flipkart)
                  </span>
                  <div className="relative flex items-center">
                    <LinkIcon className="absolute left-3 size-3.5 text-muted-foreground" />
                    <input
                      value={productLink}
                      onChange={(e) => {
                        setProductLink(e.target.value)
                        setScrapeError(null)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleScrapeUrl()
                        }
                      }}
                      placeholder="e.g. https://amzn.in/d/... or amazon.in/dp/..."
                      className="h-10 w-full rounded-md border border-muted-foreground/30 bg-background pl-9 pr-16 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    />
                    <button
                      type="button"
                      onClick={handleScrapeUrl}
                      disabled={!productLink || isScraping}
                      className={cn(
                        'absolute right-1 px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer flex items-center gap-1',
                        productLink && !isScraping
                          ? 'bg-primary text-white hover:bg-primary/90'
                          : 'bg-primary/40 text-white cursor-not-allowed'
                      )}
                    >
                      {isScraping ? (
                        <>
                          <Loader2 className="size-3 animate-spin" /> Scanning
                        </>
                      ) : (
                        'Scan'
                      )}
                    </button>
                  </div>
                  {scrapeError && (
                    <p className="mt-1.5 text-xs text-danger">{scrapeError}</p>
                  )}
                </label>
              </div>

              {/* Right Column: Form Fields & Run Analysis Button */}
              <div className="flex flex-col justify-between rounded-lg border border-border bg-white p-6 shadow-sm">
                <div className="space-y-4">
                  <label className="text-sm block">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[13px] font-medium text-foreground">Product Category</span>
                      <span className="text-[11px] text-muted-foreground font-normal">
                        (Auto-detected by AI)
                      </span>
                    </div>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className={fieldInputCls}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm block">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[13px] font-medium text-foreground">Batch / Lot Number</span>
                      <span className="text-[11px] text-muted-foreground">(Optional — AI extracts from OCR)</span>
                    </div>
                    <input
                      value={batchNumber}
                      onChange={(e) => setBatchNumber(e.target.value)}
                      placeholder="e.g. AC-SR-1183 (or leave blank for AI extraction)"
                      className={fieldInputCls}
                    />
                  </label>

                  <label className="text-sm block">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[13px] font-medium text-foreground">Inspection State / Region</span>
                      <button
                        type="button"
                        onClick={handleAutoDetectLocation}
                        disabled={isLocating}
                        className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1 cursor-pointer"
                      >
                        <MapPin className={cn('size-3.5', isLocating && 'animate-spin')} />
                        {isLocating ? 'Locating...' : 'Auto-Detect GPS'}
                      </button>
                    </div>
                    <select
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className={fieldInputCls}
                    >
                      {stateOptions.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                    {locationBadge && (
                      <p className="mt-1 text-[11px] text-emerald-700 font-medium flex items-center gap-1 animate-[fadeIn_0.2s_ease-out]">
                        <MapPin className="size-3 text-emerald-600 shrink-0" /> {locationBadge}
                      </p>
                    )}
                  </label>

                  <label className="text-sm block">
                    <span className="mb-1 block text-[13px] font-medium text-foreground">
                      Additional Notes{' '}
                      <span className="text-muted-foreground font-normal text-xs">(Optional)</span>
                    </span>
                    <input
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. purchased from Big Bazaar, Andheri"
                      className={fieldInputCls}
                    />
                  </label>
                </div>

                {/* Full-width Solid Run Analysis Button */}
                <div className="pt-6 mt-6 border-t border-border">
                  <button
                    onClick={() => {
                      if (image) {
                        runAnalysis()
                      } else if (productLink) {
                        handleScrapeUrl()
                      }
                    }}
                    disabled={(!image && !productLink) || isScraping}
                    className={cn(
                      'h-12 w-full rounded-md font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer',
                      (image || productLink) && !isScraping
                        ? 'bg-primary text-white hover:bg-primary/95 opacity-100 shadow-sm'
                        : 'bg-primary text-white opacity-40 cursor-not-allowed'
                    )}
                  >
                    {isScraping ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> Fetching & Analyzing Listing…
                      </>
                    ) : (
                      <>
                        Run Analysis <ArrowRight className="size-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STATE 2 — Analysis in Progress */}
        {step === 'scanning' && (
          <div className="grid gap-8 lg:grid-cols-5 items-start animate-[fadeIn_0.3s_ease-out_forwards]">
            {/* Left Column - Uploaded Image or URL info with Multi-Photo Gallery */}
            <div className="lg:col-span-3 space-y-3">
              <div className="relative border border-border rounded-lg overflow-hidden bg-white flex items-center justify-center p-0 shadow-sm min-h-[380px]">
                {image ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image}
                      alt="Product label preview"
                      className="w-full max-h-[430px] object-contain rounded animate-[fadeIn_0.4s_ease-out]"
                    />
                    {[image, ...extraImages].filter(Boolean).length > 1 && (
                      <div className="absolute top-3 left-3 bg-neutral-900/85 text-white text-xs font-medium px-3 py-1.5 rounded-full backdrop-blur-xs flex items-center gap-2 shadow-md">
                        <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
                        Scanning all {[image, ...extraImages].filter(Boolean).length} packaging photos
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-3 text-center p-8">
                    <LinkIcon className="size-12 text-muted-foreground/50" strokeWidth={1.5} />
                    <p className="text-sm font-medium text-foreground">{fileName || 'Analyzing product listing...'}</p>
                    <p className="text-xs text-muted-foreground max-w-xs">{productLink}</p>
                  </div>
                )}
              </div>

              {/* Multi-Photo Thumbnails */}
              {[image, ...extraImages].filter((x): x is string => Boolean(x)).length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {[image, ...extraImages].filter((x): x is string => Boolean(x)).map((imgSrc, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        const all = [image, ...extraImages].filter((x): x is string => Boolean(x))
                        const chosen = all[idx]
                        const remaining = all.filter((_, i) => i !== idx)
                        setImage(chosen)
                        setExtraImages(remaining)
                      }}
                      className={cn(
                        'relative size-14 shrink-0 rounded-md overflow-hidden border-2 transition-all cursor-pointer',
                        idx === 0 ? 'border-primary ring-2 ring-primary/20 shadow-xs' : 'border-border/60 opacity-60 hover:opacity-100'
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imgSrc} alt={`Packaging angle ${idx + 1}`} className="size-full object-cover" />
                      <div className="absolute bottom-0 inset-x-0 bg-neutral-900/80 text-[9px] text-white text-center py-0.5 font-mono">
                        #{idx + 1}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column - Status ticker */}
            <div className="lg:col-span-2 flex flex-col">
              <p className="text-base font-semibold text-foreground">Analysing {image ? 'label' : 'listing'}...</p>

              <ul className="space-y-3 mt-3">
                {tickerItems.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2.5 text-sm animate-[fadeIn_0.3s_ease-out_forwards]">
                    {item.done ? (
                      <CheckCircle2 className="size-4 text-success shrink-0 font-bold" strokeWidth={2.5} />
                    ) : (
                      <span className="flex size-4 items-center justify-center shrink-0">
                        <span className="size-2 rounded-full bg-primary pulse-amber" />
                      </span>
                    )}
                    <span
                      className={cn(
                        'transition-colors duration-200',
                        item.done ? 'text-muted-foreground' : 'text-foreground font-semibold animate-pulse'
                      )}
                    >
                      {item.text}
                    </span>
                  </li>
                ))}

                {tickerItems.length === 0 && (
                  <li className="flex items-center gap-2.5 text-sm">
                    <span className="flex size-4 items-center justify-center shrink-0">
                      <span className="size-2 rounded-full bg-primary pulse-amber" />
                    </span>
<span className="text-foreground font-semibold animate-pulse">Initializing analysis...</span>
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}

        {/* STATE 3 — Compliance Results */}
        {step === 'result' && result && (
          <div className="flex flex-col gap-6 w-full min-w-0">
            {/* Top Section: Product Identity Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-5 sm:pb-6 gap-4 animate-[fadeIn_0.3s_ease-out_forwards] w-full min-w-0">
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-[20px] font-bold text-foreground break-words">{displayProductName}</h1>
                <p className="text-xs sm:text-[13px] text-muted-foreground mt-0.5 break-words">
                  Manufacturer: {result.manufacturer} · Batch: {batchNumber || '—'} · Region: {state}
                  {result.sourceType === 'url' && ' · Source: E-commerce listing'}
                </p>
              </div>
              
              <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0 min-w-0">
                <div className="text-left sm:text-right min-w-0">
                  <span className={cn('text-xs sm:text-sm font-semibold tracking-wider', statusColor)}>
                    {statusText}
                  </span>
                  <p className="text-xs sm:text-[13px] text-muted-foreground mt-0.5">
                    {violations.length === 0 ? 'All declarations compliant' : `${violations.length} violation${violations.length > 1 ? 's' : ''} detected`}
                  </p>
                </div>

                {/* Score Ring */}
                <div className="relative size-[64px] sm:size-[76px] flex items-center justify-center shrink-0">
                  <svg className="size-full -rotate-90" viewBox="0 0 76 76">
                    <circle
                      cx="38"
                      cy="38"
                      r="33"
                      className="stroke-muted/30"
                      strokeWidth="4.5"
                      fill="transparent"
                    />
                    <circle
                      cx="38"
                      cy="38"
                      r="33"
                      className={cn(strokeColor, 'transition-all duration-1000 ease-out')}
                      strokeWidth="4.5"
                      strokeDasharray="207.3"
                      strokeDashoffset={207.3 - (207.3 * result.score) / 100}
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center px-1">
                    <span className={cn('text-xl sm:text-[28px] font-bold tracking-tight leading-none text-center', scoreColor)}>
                      {result.score}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Readability & Quality Assessment Banner */}
            {result.readability && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-lg border border-border bg-white p-3 sm:px-4 sm:py-3 shadow-xs w-full min-w-0 animate-[fadeIn_0.3s_ease-out_forwards]">
                <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
                  <span
                    className={cn(
                      'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold mt-0.5 sm:mt-0',
                      result.readability.status === 'pass'
                        ? 'bg-emerald-100 text-emerald-800'
                        : result.readability.status === 'warning'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    )}
                  >
                    {result.readability.status === 'pass' ? <Check className="size-3.5" /> : '!'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <p className="text-xs font-semibold text-foreground">
                        Packaging Readability & Print Quality:{' '}
                        <span className="uppercase">{result.readability.status}</span>
                      </p>
                      {result.readability.contrastAdequate ? (
                        <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 shrink-0">
                          Adequate Contrast
                        </span>
                      ) : (
                        <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium text-rose-700 shrink-0">
                          Low Contrast Warning
                        </span>
                      )}
                      {result.readability.glareOrBlurDetected && (
                        <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 shrink-0">
                          Glare / Blur Detected
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 break-words">{result.readability.notes}</p>
                  </div>
                </div>
                <div className="text-[10px] sm:text-[11px] font-mono text-muted-foreground shrink-0 self-end sm:self-center">
                  LMPC Rule 9 / Rule 14 Verification
                </div>
              </div>
            )}

            {/* Two Columns */}
            <div className="grid gap-6 lg:gap-8 lg:grid-cols-10 items-start w-full min-w-0 animate-[fadeIn_0.4s_ease-out_forwards]">
              {/* Left Column - Label Inspector with Bounding Boxes */}
              <div className="lg:col-span-5 space-y-4 w-full min-w-0">
                {image ? (
                  <LabelInspector
                    image={image}
                    fields={result.fields}
                    activeKey={activeKey}
                    onHover={setActiveKey}
                  />
                ) : (
                  <div className="relative border border-border rounded-lg overflow-hidden bg-white flex flex-col items-center gap-3 text-center py-12 p-4 shadow-sm w-full min-w-0">
                    <LinkIcon className="size-10 text-muted-foreground/50" strokeWidth={1.5} />
                    <p className="text-sm font-medium text-foreground">E-commerce Listing Analysis</p>
                    <p className="text-xs text-muted-foreground max-w-xs break-all">{productLink}</p>
                  </div>
                )}

                {/* Multi-Photo Gallery Selector (Step 3) */}
                {(() => {
                  const allPhotos = (result.images && result.images.length > 0)
                    ? result.images
                    : [image, ...extraImages].filter((x): x is string => Boolean(x))
                  if (allPhotos.length <= 1) return null

                  return (
                    <div className="space-y-2 rounded-xl border border-border bg-white p-3 shadow-xs w-full min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-foreground flex items-center gap-1.5 truncate">
                          <ImageIcon className="size-3.5 text-primary shrink-0" />
                          <span className="truncate">Packaging Photos ({allPhotos.length})</span>
                        </span>
                        <span className="text-[10px] sm:text-[11px] text-muted-foreground font-medium shrink-0">Click to switch</span>
                      </div>
                      <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 w-full">
                        {allPhotos.map((imgSrc, idx) => {
                          const isCurrent = (image === imgSrc) || (!image && idx === 0)
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setImage(imgSrc)
                                setExtraImages(allPhotos.filter((x) => x !== imgSrc))
                              }}
                              className={cn(
                                'relative size-16 shrink-0 rounded-lg overflow-hidden border-2 transition-all cursor-pointer group',
                                isCurrent
                                  ? 'border-primary ring-2 ring-primary/20 shadow-sm'
                                  : 'border-border/60 opacity-60 hover:opacity-100 hover:border-border'
                              )}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={imgSrc} alt={`Packaging photo ${idx + 1}`} className="size-full object-cover" />
                              <span className={cn(
                                'absolute bottom-0 inset-x-0 text-[9px] text-center py-0.5 font-semibold transition-colors',
                                isCurrent ? 'bg-primary text-white' : 'bg-black/60 text-white'
                              )}>
                                #{idx + 1}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}

                {/* Action Buttons */}
                <div className="flex flex-col gap-2.5 w-full min-w-0">
                  {(() => {
                    const getInspectionPayload = (): Inspection | null => {
                      if (!result) return null
                      const allImages = image ? [image, ...extraImages] : []
                      return savedInspection ? {
                        ...savedInspection,
                        images: allImages.length > 0 ? allImages : [savedInspection.image],
                        timestamp: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('en-IN') + ' IST',
                        inspectorEmployeeId: 'INS-2026-8942',
                      } : {
                        id: 'INSP-' + Math.floor(100000 + Math.random() * 900000),
                        productName: result.productName,
                        manufacturer: result.manufacturer,
                        category: result.category,
                        score: result.score,
                        status: result.status,
                        date: new Date().toISOString().slice(0, 10),
                        state,
                        batchNumber,
                        inspectorId: '',
                        inspectorName: 'Legal Metrology Inspector',
                        inspectorEmployeeId: 'INS-2026-8942',
                        image: image ?? '/placeholder.svg',
                        images: allImages,
                        sourceType: result.sourceType,
                        productLink: productLink || null,
                        notes,
                        timestamp: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('en-IN') + ' IST',
                        readability: result.readability,
                        fields: result.fields.map((f, idx) => ({
                          ...f,
                          box: (f.box && f.box.w > 0) ? f.box : (DECLARATION_TEMPLATE[idx]?.box ?? { x: 0, y: 0, w: 0, h: 0 }),
                        })),
                      }
                    }

                    return (
                      <div className="flex flex-col gap-2 w-full min-w-0">
                        {/* Primary Row: View Report & Download PDF */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full min-w-0">
                          {/* View Report in Popup Modal */}
                          <button
                            type="button"
                            onClick={async () => {
                              const inspection = getInspectionPayload()
                              if (!inspection) return
                              setIsViewingPdf(true)
                              setIsPdfModalOpen(true)
                              try {
                                const blobUrl = await generateInspectionPDF(inspection, 'view')
                                setPdfPreviewUrl(blobUrl)
                              } catch (err) {
                                console.error(err)
                                alert('Could not generate PDF preview.')
                              } finally {
                                setIsViewingPdf(false)
                              }
                            }}
                            disabled={isViewingPdf || isGeneratingPdf}
                            className="h-10 px-3 rounded-lg bg-sky-50 hover:bg-sky-100/90 text-sky-700 border border-sky-200/90 font-semibold text-xs sm:text-sm transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 w-full min-w-0"
                          >
                            {isViewingPdf ? (
                              <><Loader2 className="size-4 shrink-0 animate-spin" /> <span className="truncate">Preparing…</span></>
                            ) : (
                              <><Eye className="size-4 shrink-0" /> <span className="truncate">View Report</span></>
                            )}
                          </button>

                          {/* Download PDF Button */}
                          <button
                            type="button"
                            onClick={async () => {
                              const inspection = getInspectionPayload()
                              if (!inspection) return
                              setIsGeneratingPdf(true)
                              try {
                                await generateInspectionPDF(inspection, 'download')
                              } finally {
                                setIsGeneratingPdf(false)
                              }
                            }}
                            disabled={isGeneratingPdf || isViewingPdf}
                            className="h-10 px-3 rounded-lg bg-primary text-white hover:bg-primary/95 font-semibold text-xs sm:text-sm transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 w-full min-w-0"
                          >
                            {isGeneratingPdf ? (
                              <><Loader2 className="size-4 shrink-0 animate-spin" /> <span className="truncate">Generating…</span></>
                            ) : (
                              <><Download className="size-4 shrink-0" /> <span className="truncate">Download PDF Report</span></>
                            )}
                          </button>
                        </div>

                        {/* Secondary Row: Save & Scan Another */}
                        <div className="grid grid-cols-2 gap-2 w-full min-w-0">
                          {/* Save Report Button */}
                          <button
                            type="button"
                            onClick={async () => {
                              if (!result) return
                              setIsSaving(true)
                              try {
                                const allImages = [image, ...extraImages].filter(Boolean) as string[]
                                const finalImages = allImages.length > 0 ? allImages : (result.images || [])
                                const res = await fetch('/api/inspections', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    productName: result.productName,
                                    manufacturer: result.manufacturer,
                                    category: result.category,
                                    score: result.score,
                                    status: result.status,
                                    sourceType: result.sourceType,
                                    fields: result.fields.map((f, idx) => ({
                                      ...f,
                                      box: (f.box && f.box.w > 0) ? f.box : (DECLARATION_TEMPLATE[idx]?.box ?? { x: 0, y: 0, w: 0, h: 0 }),
                                    })),
                                    batchNumber,
                                    state,
                                    notes,
                                    image: finalImages[0] || image || null,
                                    images: finalImages,
                                    productLink: productLink || null,
                                  }),
                                })

                                const data = (await res.json()) as { ok: boolean; inspection?: Inspection; error?: string }
                                if (!res.ok || !data.ok || !data.inspection) {
                                  alert(data.error ?? 'Could not save the inspection.')
                                  return
                                }
                                setSavedInspection(data.inspection)
                                setIsSaved(true)
                              } catch (err) {
                                alert(`Could not save the inspection: ${(err as Error).message}`)
                              } finally {
                                setIsSaving(false)
                              }
                            }}
                            disabled={isSaved || isSaving}
                            className={cn(
                              'h-9 px-2 sm:px-4 rounded-lg font-medium text-xs sm:text-sm border transition-all flex items-center justify-center gap-1.5 cursor-pointer w-full min-w-0',
                              isSaved
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                : 'border-border bg-background hover:bg-muted text-foreground'
                            )}
                          >
                            {isSaved ? (
                              <><CheckCircle2 className="size-4 text-emerald-600 shrink-0" /> <span className="truncate">Saved</span></>
                            ) : isSaving ? (
                              <><Save className="size-4 shrink-0" /> <span className="truncate">Saving…</span></>
                            ) : (
                              <><Save className="size-4 shrink-0" /> <span className="truncate">Save</span></>
                            )}
                          </button>

                          {/* Secondary Action: Scan Another */}
                          <button
                            type="button"
                            onClick={reset}
                            className="h-9 px-2 sm:px-4 rounded-lg border border-border/80 bg-muted/20 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 cursor-pointer w-full min-w-0"
                          >
                            <RefreshCw className="size-3.5 shrink-0" /> <span className="truncate">Scan Another</span>
                          </button>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>

              {/* Right Column - scrollable fields list */}
              <div className="lg:col-span-5 flex flex-col w-full min-w-0">
                <div className="max-h-[520px] overflow-y-auto pr-1 w-full min-w-0">
                  <ul className="divide-y divide-border border-b border-border w-full min-w-0 space-y-1">
                    {result.fields.map((f: AnalysisField) => {
                      const active = activeKey === f.key
                      const isFailing = f.status !== 'compliant'

                      return (
                        <li
                          key={f.key}
                          onMouseEnter={() => setActiveKey(f.key)}
                          onMouseLeave={() => setActiveKey(null)}
                          className={cn(
                            'p-3 rounded-lg transition-colors flex gap-2.5 sm:gap-3 w-full min-w-0',
                            isFailing
                              ? 'bg-amber-500/[0.05] border border-amber-500/25'
                              : active
                              ? 'bg-muted/50 border border-border/60'
                              : 'border border-transparent'
                          )}
                        >
                          {/* Status Icon */}
                          <div className="shrink-0 mt-0.5">
                            {f.status === 'compliant' ? (
                              <CheckCircle2 className="size-4 text-success" strokeWidth={1.5} />
                            ) : f.status === 'violation' ? (
                              <AlertCircle className="size-4 text-warning" strokeWidth={1.5} />
                            ) : (
                              <XCircle className="size-4 text-danger" strokeWidth={1.5} />
                            )}
                          </div>

                          {/* Content */}
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                              <p className="text-sm font-semibold text-foreground break-words">{f.label}</p>
                              <span className="font-mono text-[10px] sm:text-[11px] bg-muted px-1.5 py-0.5 rounded text-foreground shrink-0">
                                {f.rule}
                              </span>
                              {isFailing && f.severity && (
                                <span
                                  className={cn(
                                    'text-[10px] font-bold tracking-wider uppercase shrink-0',
                                    f.severity === 'critical' ? 'text-danger' : f.severity === 'major' ? 'text-warning-foreground' : 'text-muted-foreground'
                                  )}
                                >
                                  {f.severity}
                                </span>
                              )}
                              {f.misleadingFlags?.isMisleading && (
                                <span className="inline-flex items-center gap-1 rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-900 shrink-0">
                                  <ShieldAlert className="size-3" /> Misleading
                                </span>
                              )}
                              {f.fontSizeCompliance && (
                                <span
                                  className={cn(
                                    'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium shrink-0',
                                    f.fontSizeCompliance.status === 'compliant'
                                      ? 'bg-slate-100 text-slate-700'
                                      : 'bg-amber-100 text-amber-900 font-semibold'
                                  )}
                                  title={f.fontSizeCompliance.assessment}
                                >
                                  <Type className="size-3" />
                                  {f.fontSizeCompliance.status === 'compliant' ? 'Font OK' : 'Font Warning'}
                                  {f.fontSizeCompliance.isBold && ' · Bold'}
                                </span>
                              )}
                            </div>

                            <p className="text-xs italic text-slate-500 mt-0.5 break-words">
                              {f.extracted ? `"${f.extracted}"` : 'Not detected on label'}
                            </p>

                            {f.fontSizeCompliance?.assessment && f.fontSizeCompliance.status !== 'compliant' && (
                              <p className="text-xs text-amber-900 mt-1 font-medium bg-amber-50 rounded p-1.5 border border-amber-200/60 break-words">
                                📏 Font Rule: {f.fontSizeCompliance.assessment}
                              </p>
                            )}

                            {f.misleadingFlags?.isMisleading && f.misleadingFlags.reason && (
                              <p className="text-xs text-purple-950 mt-1 font-medium bg-purple-50 rounded p-1.5 border border-purple-200 break-words">
                                ⚠️ Misleading: {f.misleadingFlags.reason}
                              </p>
                            )}

                            {f.explanation && (
                              <p className="text-xs font-normal text-slate-600 mt-1 leading-relaxed break-words">
                                {f.explanation}
                              </p>
                            )}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>

                {/* Retry section */}
                <div className="border-t border-border pt-4 mt-4 w-full">
                  <button
                    onClick={() => {
                      setResult(null)
                      setSavedInspection(null)
                      setIsSaved(false)
                      if (image) {
                        runAnalysis()
                      } else if (productLink) {
                        handleScrapeUrl()
                      }
                    }}
                    className="w-full flex items-center justify-center gap-1.5 border border-border hover:bg-muted/30 py-2.5 sm:py-3 rounded-md text-sm font-medium transition-colors cursor-pointer"
                  >
                    <RefreshCw className="size-3.5" /> Re-analyze
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* In-Browser PDF Viewer Popup Component */}
      <PdfViewerModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        pdfUrl={pdfPreviewUrl}
        productName={result?.productName}
        onDownload={async () => {
          if (!result) return
          const allImages = image ? [image, ...extraImages] : []
          const inspection: Inspection = savedInspection ? {
            ...savedInspection,
            images: allImages.length > 0 ? allImages : [savedInspection.image],
            timestamp: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('en-IN') + ' IST',
            inspectorEmployeeId: 'INS-2026-8942',
          } : {
            id: 'INSP-' + Math.floor(100000 + Math.random() * 900000),
            productName: result.productName,
            manufacturer: result.manufacturer,
            category: result.category,
            score: result.score,
            status: result.status,
            date: new Date().toISOString().slice(0, 10),
            state,
            batchNumber,
            inspectorId: '',
            inspectorName: 'Legal Metrology Inspector',
            inspectorEmployeeId: 'INS-2026-8942',
            image: image ?? '/placeholder.svg',
            images: allImages,
            sourceType: result.sourceType,
            productLink: productLink || null,
            notes,
            timestamp: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('en-IN') + ' IST',
            readability: result.readability,
            fields: result.fields.map((f, idx) => ({
              ...f,
              box: (f.box && f.box.w > 0) ? f.box : (DECLARATION_TEMPLATE[idx]?.box ?? { x: 0, y: 0, w: 0, h: 0 }),
            })),
          }
          await generateInspectionPDF(inspection, 'download')
        }}
      />
    </div>
  )
}

export function BackLink() {
  const router = useRouter()
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-4" /> Back
    </button>
  )
}
