'use client'

import { useState, useEffect, useRef } from 'react'
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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CATEGORIES, STATES } from '@/lib/data'
import { cn } from '@/lib/utils'

type Step = 'capture' | 'scanning' | 'result'

const TICKER_ITEMS = [
  'Extracting text from label',
  'Identifying declaration fields',
  'Checking Rule 6 compliance',
  'Calculating compliance score',
]

const MOCK_FIELDS = [
  {
    key: 'manufacturer',
    label: 'Name & Address of Manufacturer',
    rule: 'Rule 6(1)(a)',
    status: 'compliant' as const,
    extracted: 'Aurelia Cosmetics Pvt. Ltd., MIDC Mumbai 400093',
    explanation: null,
    x: 20,
    y: 18,
  },
  {
    key: 'commodity',
    label: 'Common / Generic Name of Commodity',
    rule: 'Rule 6(1)(b)',
    status: 'compliant' as const,
    extracted: 'Face Serum',
    explanation: null,
    x: 25,
    y: 31,
  },
  {
    key: 'quantity',
    label: 'Net Quantity',
    rule: 'Rule 6(1)(c)',
    status: 'compliant' as const,
    extracted: '30 ml',
    explanation: null,
    x: 18,
    y: 43,
  },
  {
    key: 'mrp',
    label: 'Retail Sale Price (MRP)',
    rule: 'Rule 6(1)(e)',
    status: 'violation' as const,
    severity: 'major' as const,
    extracted: 'MRP Rs. 899',
    explanation: 'The MRP is printed without the mandatory qualifier "inclusive of all taxes". Rule 6(1)(e) requires price declarations to specify "inclusive of all taxes" so consumers are not charged extra.',
    x: 30,
    y: 55,
  },
  {
    key: 'consumerCare',
    label: 'Consumer Care Details',
    rule: 'Rule 6(1)(f)',
    status: 'missing' as const,
    severity: 'critical' as const,
    extracted: null,
    explanation: 'No consumer care details (contact number, email, or physical address) were detected on the label. Under Rule 6(1)(f), this is a critical omission for consumer grievance redressal.',
    x: 40,
    y: 67,
  },
  {
    key: 'origin',
    label: 'Country of Origin',
    rule: 'Rule 6(1)(g)',
    status: 'compliant' as const,
    extracted: 'India',
    explanation: null,
    x: 22,
    y: 79,
  },
]

export function NewInspection() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [step, setStep] = useState<Step>('capture')
  const [image, setImage] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string>('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [batchNumber, setBatchNumber] = useState('')
  const [state, setState] = useState(STATES[0])
  const [notes, setNotes] = useState('')
  const [productLink, setProductLink] = useState('')

  const [scanStep, setScanStep] = useState(0)
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)

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
            setFileName(file.name || 'Pasted Image')
            const reader = new FileReader()
            reader.onload = () => {
              setImage(reader.result as string)
            }
            reader.readAsDataURL(file)
            break
          }
        }
      }
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [step])

  // Derive product name from file name
  const cleanProductName = fileName
    ? fileName
        .replace(/\.[^/.]+$/, '')
        .replace(/[-_]/g, ' ')
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    : 'GlowDew Hydrating Face Serum'

  // Step indicator state
  const currentStepNum = step === 'capture' ? 1 : step === 'scanning' ? 2 : 3

  // Handle scanning simulation ticker
  useEffect(() => {
    if (step !== 'scanning') return
    setScanStep(0)
    
    const interval = setInterval(() => {
      setScanStep((prev) => {
        if (prev >= 5) {
          clearInterval(interval)
          setStep('result')
          return prev
        }
        return prev + 1
      })
    }, 800)

    return () => clearInterval(interval)
  }, [step])

  const triggerUpload = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFileName(file.name)
      const reader = new FileReader()
      reader.onload = () => {
        setImage(reader.result as string)
      }
      reader.readAsDataURL(file)
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
      setFileName(file.name)
      const reader = new FileReader()
      reader.onload = () => {
        setImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const runAnalysis = () => {
    if (!image) return
    setStep('scanning')
  }

  const handleMockCameraCapture = () => {
    setFileName('Camera Capture.png')
    setImage('/product-label-serum.png')
  }

  const reset = () => {
    setImage(null)
    setFileName('')
    setBatchNumber('')
    setNotes('')
    setProductLink('')
    setScanStep(0)
    setActiveKey(null)
    setStep('capture')
  }

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

        {/* Step progress bar (3 discrete 20px steps with solid green lines between completed steps, gray for active/upcoming) */}
        <div className="relative mb-10 max-w-md mx-auto select-none">
          {/* Connecting lines container */}
          <div className="absolute left-8 right-8 top-[10px] flex items-center justify-between z-0 pointer-events-none">
            {/* Line 1: Step 1 -> Step 2 */}
            <div
              className={cn(
                'h-[1px] flex-1 transition-colors duration-300',
                currentStepNum > 1 ? 'bg-success' : 'bg-border'
              )}
            />
            {/* Line 2: Step 2 -> Step 3 */}
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
                  {/* 20px Circle */}
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

                  {/* Step Label below circle */}
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
                    'group/dropbox relative flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-6 text-center transition-all duration-200 cursor-pointer min-h-[340px] select-none bg-[#FAF8F5]',
                    image
                      ? 'border-border bg-white'
                      : dragActive
                      ? 'border-primary bg-primary/[0.04]'
                      : 'border-muted-foreground/30 hover:border-primary'
                  )}
                  title="Click or drag to upload an image. You can also paste directly using Ctrl+V / Cmd+V."
                >
                  {image ? (
                    <div className="relative w-full h-[300px] flex items-center justify-center overflow-hidden rounded-md bg-muted/20">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image} alt="Uploaded label preview" className="max-h-[280px] w-auto object-contain rounded-md animate-[fadeIn_0.3s_ease-out]" />
                      
                      <div className="absolute top-2 right-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setImage(null)
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
                      <Upload className="size-12 text-muted-foreground/60 transition-colors group-hover/dropbox:text-primary" strokeWidth={1.5} />
                      <div className="max-w-[280px]">
                        <p className="text-base font-medium text-foreground transition-colors group-hover/dropbox:text-primary">
                          Drop your product label here
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">PNG, JPG, HEIC up to 20MB</p>
                        <p className="mt-1 text-[11px] text-muted-foreground/70">Or paste directly (Cmd+V / Ctrl+V)</p>
                      </div>
                    </>
                  )}
                </div>

                {/* Compact Secondary Camera Button */}
                <button
                  type="button"
                  onClick={handleMockCameraCapture}
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
                      onChange={(e) => setProductLink(e.target.value)}
                      placeholder="https://amazon.in/dp/..."
                      className="h-10 w-full rounded-md border border-muted-foreground/30 bg-background pl-9 pr-16 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (productLink) {
                          setFileName('Amazon Scraped Label.png')
                          setImage('/product-label-serum.png')
                        }
                      }}
                      className="absolute right-1 px-3 py-1 bg-primary text-white text-xs font-medium rounded hover:bg-primary/90 transition-colors cursor-pointer"
                    >
                      Scan
                    </button>
                  </div>
                </label>
              </div>

              {/* Right Column: Form Fields & Solid Full-Width Run Analysis Button */}
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

                {/* Full-width Solid Amber-Orange "Run Analysis →" Button */}
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
            {/* Left Column (60% width) - Uploaded Image (1px light gray border, no inner padding) */}
            <div className="lg:col-span-3 border border-border rounded-lg overflow-hidden bg-white flex items-center justify-center p-0 shadow-sm min-h-[400px]">
              {image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image}
                  alt="Product label preview"
                  className="w-full max-h-[450px] object-contain rounded animate-[fadeIn_0.4s_ease-out]"
                />
              )}
            </div>

            {/* Right Column (40% width) - Status ticker directly below heading with 12px gap */}
            <div className="lg:col-span-2 flex flex-col">
              <p className="text-base font-semibold text-foreground">Analysing label...</p>

              {/* Status Ticker with 12px gap from heading */}
              <ul className="space-y-3 mt-3">
                {TICKER_ITEMS.map((item, idx) => {
                  const visible = scanStep >= idx + 1
                  const completed = scanStep > idx + 1
                  const active = scanStep === idx + 1

                  if (!visible) return null

                  return (
                    <li key={item} className="flex items-center gap-2.5 text-sm animate-[fadeIn_0.3s_ease-out_forwards]">
                      {completed ? (
                        <CheckCircle2 className="size-4 text-success shrink-0 font-bold" strokeWidth={2.5} />
                      ) : active ? (
                        <span className="flex size-4 items-center justify-center shrink-0">
                          <span className="size-2 rounded-full bg-primary pulse-amber" />
                        </span>
                      ) : (
                        <span className="size-4 shrink-0" />
                      )}
                      <span className={cn(
                        'transition-colors duration-200',
                        completed ? 'text-muted-foreground' : active ? 'text-foreground font-semibold animate-pulse' : 'text-muted-foreground/60'
                      )}>
                        {item}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        )}

        {/* STATE 3 — Compliance Results */}
        {step === 'result' && (
          <div className="flex flex-col gap-6">
            {/* Top Section: Product Identity Bar */}
            <div className="flex items-center justify-between border-b border-border pb-6 gap-4 animate-[fadeIn_0.3s_ease-out_forwards]">
              <div>
                <h1 className="text-[20px] font-bold text-foreground">{cleanProductName}</h1>
                <p className="text-[13px] text-muted-foreground mt-0.5">
                  Manufacturer: Aurelia Cosmetics Pvt. Ltd. · Batch: {batchNumber || 'AC-SR-1183'} · Region: {state}
                </p>
              </div>
              
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <span className="text-sm font-semibold tracking-wider text-danger">
                    NON-COMPLIANT
                  </span>
                  <p className="text-[13px] text-muted-foreground mt-0.5">2 violations detected</p>
                </div>

                {/* 70px Diameter SVG Circular Score Ring (44px Bold Number) */}
                <div className="relative size-[70px] flex items-center justify-center shrink-0">
                  <svg className="size-full -rotate-90">
                    <circle
                      cx="35"
                      cy="35"
                      r="30"
                      className="stroke-muted/30"
                      strokeWidth="4"
                      fill="transparent"
                    />
                    <circle
                      cx="35"
                      cy="35"
                      r="30"
                      className="stroke-danger transition-all duration-1000 ease-out"
                      strokeWidth="4"
                      strokeDasharray="188"
                      strokeDashoffset={188 - (188 * 66) / 100}
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[44px] font-bold text-danger leading-none">66</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Two Columns */}
            <div className="grid gap-8 lg:grid-cols-10 items-start animate-[fadeIn_0.4s_ease-out_forwards]">
              {/* Left Column (55% width) - Annotated Image */}
              <div className="lg:col-span-5 space-y-4">
                <div className="relative border border-border rounded-lg overflow-hidden bg-white flex items-center justify-center p-4 shadow-sm">
                  {image && (
                    <div className="relative max-h-[450px]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image}
                        alt="Scanned product label"
                        className="max-h-[450px] w-auto object-contain rounded"
                      />

                      {/* Interactive Annotation Markers */}
                      {MOCK_FIELDS.map((f, idx) => {
                        const active = activeKey === f.key
                        const ringColor =
                          f.status === 'compliant'
                            ? 'border-success bg-success/85 text-success-foreground'
                            : f.status === 'violation'
                            ? 'border-warning bg-warning/85 text-warning-foreground'
                            : 'border-danger bg-danger/85 text-danger-foreground'

                        return (
                          <button
                            key={f.key}
                            type="button"
                            onMouseEnter={() => setActiveKey(f.key)}
                            onMouseLeave={() => setActiveKey(null)}
                            className={cn(
                              'absolute flex size-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-[10px] font-bold shadow-md transition-all duration-150',
                              ringColor,
                              active ? 'scale-125 z-10 ring-2 ring-primary/40' : 'scale-100 z-0'
                            )}
                            style={{
                              left: `${f.x}%`,
                              top: `${f.y}%`,
                            }}
                            aria-label={`Marker ${idx + 1}`}
                          >
                            {idx + 1}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Action Buttons (48% width each with gap) */}
                <div className="flex justify-between items-center gap-3">
                  <Button variant="outline" onClick={reset} className="w-[48%] rounded-md">
                    Scan Another
                  </Button>
                  <Button
                    onClick={() => router.push('/inspections')}
                    className="w-[48%] bg-primary text-white hover:bg-primary/95 rounded-md"
                  >
                    Save Report
                  </Button>
                </div>
              </div>

              {/* Right Column (45% width) - scrollable list */}
              <div className="lg:col-span-5 flex flex-col">
                <div className="max-h-[450px] overflow-y-auto pr-1">
                  <ul className="divide-y divide-border border-b border-border">
                    {MOCK_FIELDS.map((f) => {
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
                          {/* 16px Status Icon */}
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
                                    f.severity === 'critical' ? 'text-danger' : 'text-warning-foreground'
                                  )}
                                >
                                  {f.severity}
                                </span>
                              )}
                            </div>

                            {/* Extracted value text: 12px italic light gray */}
                            <p className="text-xs italic text-slate-400 mt-0.5">
                              {f.extracted ? `“${f.extracted}”` : 'Not detected on label'}
                            </p>

                            {/* Violation explanation text: 12px regular medium gray */}
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

                {/* PDF Download Button with 16px margin above & thin divider */}
                <div className="border-t border-border pt-4 mt-4">
                  <button className="w-full bg-navy text-white hover:bg-navy/90 py-3 rounded-md text-sm font-semibold transition-colors shadow-sm">
                    Download PDF Report
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
