'use client'

import { useState, useEffect } from 'react'
import { X, Download, Printer, FileText, Loader2, Maximize2, Minimize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PdfViewerModalProps {
  isOpen: boolean
  onClose: () => void
  pdfUrl: string | null
  title?: string
  productName?: string
  onDownload?: () => void
}

export function PdfViewerModal({
  isOpen,
  onClose,
  pdfUrl,
  title = 'Inspection Memorandum & Statutory Compliance Dossier',
  productName,
  onDownload,
}: PdfViewerModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Handle ESC key press
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false)
        } else {
          onClose()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, isFullscreen, onClose])

  if (!isOpen) return null

  const handlePrint = () => {
    if (!pdfUrl) return
    const iframe = document.getElementById('pdf-report-frame') as HTMLIFrameElement | null
    if (iframe?.contentWindow) {
      try {
        iframe.contentWindow.focus()
        iframe.contentWindow.print()
      } catch {
        window.open(pdfUrl, '_blank')
      }
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdf-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-1 sm:p-3 backdrop-blur-md animate-[fadeIn_0.15s_ease-out]"
      onClick={onClose}
    >
      <div
        className={`relative flex flex-col bg-card shadow-2xl overflow-hidden transition-all duration-200 border border-border/80 ${
          isFullscreen ? 'w-screen h-screen rounded-none' : 'rounded-2xl'
        }`}
        style={{
          width: isFullscreen ? '100vw' : '97vw',
          maxWidth: isFullscreen ? '100vw' : '1550px',
          height: isFullscreen ? '100vh' : '96vh',
          maxHeight: isFullscreen ? '100vh' : '97vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/60 shrink-0 h-14 select-none">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="size-4.5" />
            </div>
            <div className="min-w-0">
              <h3 id="pdf-modal-title" className="text-sm font-semibold text-foreground truncate leading-tight">
                {title}
              </h3>
              {productName && (
                <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
                  Target Product: <span className="font-semibold text-foreground">{productName}</span>
                </p>
              )}
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            {onDownload && (
              <Button
                variant="outline"
                size="sm"
                onClick={onDownload}
                className="h-8 text-xs gap-1.5 cursor-pointer bg-background hover:bg-muted font-medium"
              >
                <Download className="size-3.5" />
                <span className="hidden sm:inline">Download PDF</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              disabled={!pdfUrl}
              className="h-8 text-xs gap-1.5 cursor-pointer bg-background hover:bg-muted font-medium hidden sm:flex"
            >
              <Printer className="size-3.5" />
              <span>Print</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="size-8 p-0 cursor-pointer bg-background hover:bg-muted hidden sm:flex items-center justify-center"
              title={isFullscreen ? 'Exit full screen' : 'Expand full screen'}
            >
              {isFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
            </Button>

            <button
              type="button"
              onClick={onClose}
              className="flex size-8 items-center justify-center rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer ml-1"
              aria-label="Close report preview"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Modal Body / Embedded PDF View - Fixed Height & Full Expansion */}
        <div
          className="relative w-full bg-neutral-900 overflow-hidden flex items-center justify-center"
          style={{
            flex: '1 1 0%',
            height: 'calc(100% - 56px)',
            minHeight: '400px',
          }}
        >
          {!pdfUrl ? (
            <div className="flex flex-col items-center justify-center gap-3 text-white/80 p-8 text-center">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Generating official inspection memorandum…</p>
              <p className="text-xs text-white/50">Rendering high-resolution vector stamps, QR codes, and statutory badges</p>
            </div>
          ) : (
            <iframe
              id="pdf-report-frame"
              src={pdfUrl}
              style={{
                width: '100%',
                height: '100%',
                minHeight: '100%',
                border: 'none',
              }}
              className="w-full h-full border-0 bg-neutral-900"
              title="Official Inspection Report Preview"
            />
          )}
        </div>
      </div>
    </div>
  )
}
