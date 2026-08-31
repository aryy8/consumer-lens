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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CATEGORIES, STATES, DECLARATION_TEMPLATE } from '@/lib/data'
import { cn } from '@/lib/utils'
import { generateInspectionPDF } from '@/lib/pdf-report'
import type { AnalysisResult, AnalysisField, Inspection } from '@/lib/types'

type Step = 'capture' | 'scanning' | 'result'

interface TickerItem {
  text: string
  done: boolean
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
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [step, setStep] = useState<Step>('capture')
  const [image, setImage] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
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

  const handleIncomingFile = async (file: File, nameFallback?: string) => {
    setFileName(file.name || nameFallback || 'Product Label.jpg')
    const { dataUrl, file: compressed } = await compressImageFile(file)
    if (dataUrl) {
      setImage(dataUrl)
      setImageFile(compressed)
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
    if (!productLink) return

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

      // Run analysis with scraped text
      runUrlAnalysis(data.text, data.title)
    } catch (err) {
      setScrapeError(`Network error: ${(err as Error).message}`)
      setIsScraping(false)
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
      // Convert base64 data URL to blob
      const res = await fetch(image)
      const blob = await res.blob()
      formData.append('image', blob, 'label.jpg')
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

      // Read SSE stream
      const reader = response.body?.getReader()
      if (!reader) {
        setError('Failed to read response stream')
        setStep('capture')
        return
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Parse SSE events from buffer
        const lines = buffer.split('\n')
        buffer = ''

        let eventType = ''
        let eventData = ''

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim()
          } else if (line.startsWith('data: ')) {
            eventData = line.slice(6).trim()
          } else if (line === '' && eventType && eventData) {
            // Process complete event
            try {
              const parsed = JSON.parse(eventData)

              if (eventType === 'progress') {
                setTickerItems((prev) => {
                  const updated = prev.map((t) => ({ ...t, done: true }))
                  return [...updated, { text: parsed.message, done: false }]
                })
              } else if (eventType === 'result') {
                // Mark last ticker item as done
                setTickerItems((prev) => prev.map((t) => ({ ...t, done: true })))
                setResult(parsed as AnalysisResult)
                // Short delay before showing result for animation
                await new Promise((r) => setTimeout(r, 600))
                setStep('result')
              } else if (eventType === 'error') {
                setError(parsed.error || 'Analysis failed')
                setStep('capture')
              }
            } catch {
              // Incomplete JSON, continue buffering
            }

            eventType = ''
            eventData = ''
          } else if (line !== '') {
            // Incomplete event, keep in buffer
            buffer += line + '\n'
          }
        }
      }
    } catch (err) {
      setError(`Network error: ${(err as Error).message}`)
      setStep('capture')
    }
  }, [imageFile, image, category, batchNumber, state, notes])

  // ---- Analysis (URL Flow) ----
  const runUrlAnalysis = async (listingText: string, title: string) => {
    setStep('scanning')
    setError(null)
    setResult(null)
    setTickerItems([])
    setIsScraping(false)
    setFileName(title || 'E-commerce Listing')

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceType: 'url',
          listingText,
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

      // Read SSE stream (same logic as image flow)
      const reader = response.body?.getReader()
      if (!reader) {
        setError('Failed to read response stream')
        setStep('capture')
        return
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\n')
        buffer = ''

        let eventType = ''
        let eventData = ''

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim()
          } else if (line.startsWith('data: ')) {
            eventData = line.slice(6).trim()
          } else if (line === '' && eventType && eventData) {
            try {
              const parsed = JSON.parse(eventData)

              if (eventType === 'progress') {
                setTickerItems((prev) => {
                  const updated = prev.map((t) => ({ ...t, done: true }))
                  return [...updated, { text: parsed.message, done: false }]
                })
              } else if (eventType === 'result') {
                setTickerItems((prev) => prev.map((t) => ({ ...t, done: true })))
                setResult(parsed as AnalysisResult)
                await new Promise((r) => setTimeout(r, 600))
                setStep('result')
              } else if (eventType === 'error') {
                setError(parsed.error || 'Analysis failed')
                setStep('capture')
              }
            } catch {
              // continue
            }

            eventType = ''
            eventData = ''
          } else if (line !== '') {
            buffer += line + '\n'
          }
        }
      }
    } catch (err) {
      setError(`Network error: ${(err as Error).message}`)
      setStep('capture')
    }
  }

  const reset = () => {
    setImage(null)
    setImageFile(null)
    setFileName('')
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
    <div className="-mx-5 -my-5 p-5 lg:-mx-8 lg:-my-8 lg:p-8 min-h-full bg-[#FAFAF9]">
      <div className="max-w-5xl mx-auto">
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
            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
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
                    <div className="relative w-full h-[180px] md:h-[300px] flex items-center justify-center overflow-hidden rounded-md bg-muted/20">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image} alt="Uploaded label preview" className="max-h-[160px] md:max-h-[280px] w-auto object-contain rounded-md animate-[fadeIn_0.3s_ease-out]" />
                      
                      <div className="absolute top-2 right-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setImage(null)
                            setImageFile(null)
                            setFileName('')
                          }}
                          className="bg-black/70 hover:bg-black/90 text-white text-xs px-2.5 py-1 rounded-md font-semibold transition-all shadow-sm cursor-pointer flex items-center gap-1"
                        >
                          <Trash2 className="size-3" /> Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload className="size-8 md:size-12 text-muted-foreground/60 transition-colors group-hover/dropbox:text-primary" strokeWidth={1.5} />
                      <div className="max-w-[280px]">
                        <p className="text-sm md:text-base font-medium text-foreground transition-colors group-hover/dropbox:text-primary">
                          Drop your product label here
                        </p>
                        <p className="mt-0.5 md:mt-1 text-[11px] md:text-xs text-muted-foreground">PNG, JPG, HEIC up to 20MB</p>
                        <p className="mt-0.5 md:mt-1 text-[10px] md:text-[11px] text-muted-foreground/70">Or paste directly (Cmd+V / Ctrl+V)</p>
                      </div>
                    </>
                  )}
                </div>

                {/* Camera Button */}
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
                  <span className="mb-1 block text-[13px] font-medium text-foreground">Product URL (Amazon / Flipkart)</span>
                  <div className="relative flex items-center">
                    <LinkIcon className="absolute left-3 size-3.5 text-muted-foreground" />
                    <input
                      value={productLink}
                      onChange={(e) => {
                        setProductLink(e.target.value)
                        setScrapeError(null)
                      }}
                      placeholder="https://amazon.in/dp/..."
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
                    <span className="mb-1 block text-[13px] font-medium text-foreground">Product Category</span>
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
                    <span className="mb-1 block text-[13px] font-medium text-foreground">Batch / Lot Number</span>
                    <input
                      value={batchNumber}
                      onChange={(e) => setBatchNumber(e.target.value)}
                      placeholder="e.g. AC-SR-1183"
                      className={fieldInputCls}
                    />
                  </label>

                  <label className="text-sm block">
                    <span className="mb-1 block text-[13px] font-medium text-foreground">Inspection State</span>
                    <select
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className={fieldInputCls}
                    >
                      {STATES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
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
                    onClick={runAnalysis}
                    disabled={!image}
                    className={cn(
                      'h-12 w-full rounded-md font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer',
                      image
                        ? 'bg-primary text-white hover:bg-primary/95 opacity-100 shadow-sm'
                        : 'bg-primary text-white opacity-40 cursor-not-allowed'
                    )}
                  >
                    Run Analysis <ArrowRight className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STATE 2 — Analysis in Progress */}
        {step === 'scanning' && (
          <div className="grid gap-8 lg:grid-cols-5 items-start animate-[fadeIn_0.3s_ease-out_forwards]">
            {/* Left Column - Uploaded Image or URL info */}
            <div className="lg:col-span-3 border border-border rounded-lg overflow-hidden bg-white flex items-center justify-center p-0 shadow-sm min-h-[400px]">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image}
                  alt="Product label preview"
                  className="w-full max-h-[450px] object-contain rounded animate-[fadeIn_0.4s_ease-out]"
                />
              ) : (
                <div className="flex flex-col items-center gap-3 text-center p-8">
                  <LinkIcon className="size-12 text-muted-foreground/50" strokeWidth={1.5} />
                  <p className="text-sm font-medium text-foreground">{fileName || 'Analyzing product listing...'}</p>
                  <p className="text-xs text-muted-foreground max-w-xs">{productLink}</p>
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
          <div className="flex flex-col gap-6">
            {/* Top Section: Product Identity Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-6 gap-4 animate-[fadeIn_0.3s_ease-out_forwards]">
              <div>
                <h1 className="text-[20px] font-bold text-foreground">{displayProductName}</h1>
                <p className="text-[13px] text-muted-foreground mt-0.5">
                  Manufacturer: {result.manufacturer} · Batch: {batchNumber || '—'} · Region: {state}
                  {result.sourceType === 'url' && ' · Source: E-commerce listing'}
                </p>
              </div>
              
              <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                <div className="text-left sm:text-right">
                  <span className={cn('text-sm font-semibold tracking-wider', statusColor)}>
                    {statusText}
                  </span>
                  <p className="text-[13px] text-muted-foreground mt-0.5">
                    {violations.length === 0 ? 'All declarations compliant' : `${violations.length} violation${violations.length > 1 ? 's' : ''} detected`}
                  </p>
                </div>

                {/* Score Ring */}
                <div className="relative size-[76px] flex items-center justify-center shrink-0">
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
                    <span className={cn('text-2xl sm:text-[28px] font-bold tracking-tight leading-none text-center', scoreColor)}>
                      {result.score}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Two Columns */}
            <div className="grid gap-8 lg:grid-cols-10 items-start animate-[fadeIn_0.4s_ease-out_forwards]">
              {/* Left Column - Image or URL summary */}
              <div className="lg:col-span-5 space-y-4">
                <div className="relative border border-border rounded-lg overflow-hidden bg-white flex items-center justify-center p-4 shadow-sm">
                  {image ? (
                    <div className="relative max-h-[450px]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image}
                        alt="Scanned product label"
                        className="max-h-[450px] w-auto object-contain rounded"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-center py-12">
                      <LinkIcon className="size-10 text-muted-foreground/50" strokeWidth={1.5} />
                      <p className="text-sm font-medium text-foreground">E-commerce Listing Analysis</p>
                      <p className="text-xs text-muted-foreground max-w-xs break-all">{productLink}</p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center gap-3">
                    <Button variant="outline" onClick={reset} className="w-[48%] rounded-md">
                      Scan Another
                    </Button>
                    <Button
                      onClick={async () => {
                        if (!result) return
                        setIsSaving(true)
                        try {
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
                              fields: result.fields,
                              batchNumber,
                              state,
                              notes,
                              image,
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
                        } catch {
                          alert('Could not save the inspection. Please try again.')
                        } finally {
                          setIsSaving(false)
                        }
                      }}
                      disabled={isSaved || isSaving}
                      className={cn(
                        'w-[48%] rounded-md transition-all',
                        isSaved
                          ? 'bg-success text-white hover:bg-success/90'
                          : 'bg-primary text-white hover:bg-primary/95'
                      )}
                    >
                      {isSaved ? (
                        <><CheckCircle2 className="size-4" /> Saved</>
                      ) : isSaving ? (
                        <><Save className="size-4" /> Saving…</>
                      ) : (
                        <><Save className="size-4" /> Save Report</>
                      )}
                    </Button>
                  </div>
                  <button
                    onClick={() => {
                      if (!result) return
                      // Use savedInspection if available, otherwise create a temporary one for PDF
                      const inspection: Inspection = savedInspection ?? {
                        id: 'DRAFT-' + Date.now(),
                        productName: result.productName,
                        manufacturer: result.manufacturer,
                        category: result.category,
                        score: result.score,
                        status: result.status,
                        date: new Date().toISOString().slice(0, 10),
                        state,
                        batchNumber,
                        inspectorId: '',
                        inspectorName: 'Inspector',
                        image: image ?? '/placeholder.svg',
                        sourceType: result.sourceType,
                        productLink: productLink || null,
                        notes,
                        fields: result.fields.map((f, idx) => ({
                          ...f,
                          box: DECLARATION_TEMPLATE[idx]?.box ?? { x: 0, y: 0, w: 0, h: 0 },
                        })),
                      }
                      generateInspectionPDF(inspection)
                    }}
                    className="w-full flex items-center justify-center gap-1.5 bg-navy text-white hover:bg-navy/90 py-3 rounded-md text-sm font-semibold transition-colors shadow-sm"
                  >
                    <Download className="size-4" /> Download PDF Report
                  </button>
                </div>
              </div>

              {/* Right Column - scrollable fields list */}
              <div className="lg:col-span-5 flex flex-col">
                <div className="max-h-[450px] overflow-y-auto pr-1">
                  <ul className="divide-y divide-border border-b border-border">
                    {result.fields.map((f: AnalysisField) => {
                      const active = activeKey === f.key
                      const isFailing = f.status !== 'compliant'

                      return (
                        <li
                          key={f.key}
                          onMouseEnter={() => setActiveKey(f.key)}
                          onMouseLeave={() => setActiveKey(null)}
                          className={cn(
                            'py-4 flex gap-3 transition-colors',
                            isFailing ? 'bg-danger/[0.04] px-4 -mx-4 rounded-md' : 'px-0',
                            active && !isFailing ? 'bg-muted/40 px-4 -mx-4 rounded-md' : ''
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
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-medium text-foreground">{f.label}</p>
                              <span className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded text-foreground">
                                {f.rule}
                              </span>
                              {isFailing && f.severity && (
                                <span
                                  className={cn(
                                    'text-[10px] font-bold tracking-wider uppercase',
                                    f.severity === 'critical' ? 'text-danger' : f.severity === 'major' ? 'text-warning-foreground' : 'text-muted-foreground'
                                  )}
                                >
                                  {f.severity}
                                </span>
                              )}
                            </div>

                            <p className="text-xs italic text-slate-400 mt-0.5">
                              {f.extracted ? `"${f.extracted}"` : 'Not detected on label'}
                            </p>

                            {f.explanation && (
                              <p className="text-xs font-normal text-slate-600 mt-1 leading-relaxed">
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
                <div className="border-t border-border pt-4 mt-4">
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
                    className="w-full flex items-center justify-center gap-1.5 border border-border hover:bg-muted/30 py-3 rounded-md text-sm font-medium transition-colors"
                  >
                    <RefreshCw className="size-3.5" /> Re-analyze
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
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
