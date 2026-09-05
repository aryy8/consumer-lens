'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, AlertTriangle, Download, Eye, Loader2, MapPin, Trash2, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Panel, PanelHeader } from '@/components/section'
import { ScoreBadge, StatusTag } from '@/components/status'
import { LabelInspector } from '@/components/inspection/label-inspector'
import { FieldList } from '@/components/inspection/field-list'
import { generateInspectionPDF } from '@/lib/pdf-report'
import { PdfViewerModal } from '@/components/inspection/pdf-modal'
import { cn } from '@/lib/utils'
import type { Inspection } from '@/lib/types'

export function InspectionDetail({ inspection }: { inspection: Inspection }) {
  const router = useRouter()
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false)
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null)
  const [isPreparingPdf, setIsPreparingPdf] = useState(false)

  const violations = inspection.fields.filter((f) => f.status !== 'compliant')

  async function handleDelete() {
    setIsDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch(`/api/inspections/${inspection.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setDeleteError(data.error ?? 'Failed to delete inspection.')
        setIsDeleting(false)
        return
      }
      router.push('/inspections')
      router.refresh()
    } catch {
      setDeleteError('Network error. Could not delete inspection.')
      setIsDeleting(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-[fadeIn_0.15s_ease-out]">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-[scaleIn_0.15s_ease-out]">
            <div className="flex items-start gap-3.5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger">
                <AlertTriangle className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold text-foreground">Delete inspection record?</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Are you sure you want to delete <span className="font-semibold text-foreground">{inspection.productName}</span> ({inspection.id})? This will permanently remove the record and any generated reports.
                </p>
              </div>
            </div>

            {deleteError && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-xs text-danger">
                <AlertCircle className="size-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setDeleteError(null)
                }}
                disabled={isDeleting}
                className="rounded-lg border border-border bg-background px-4 py-2 text-xs font-medium text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex items-center gap-1.5 rounded-lg bg-danger px-4 py-2 text-xs font-semibold text-white hover:bg-danger/90 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" /> Deleting…
                  </>
                ) : (
                  <>
                    <Trash2 className="size-3.5" /> Delete record
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="lg:col-span-2 space-y-4">
        <LabelInspector
          image={inspection.image}
          fields={inspection.fields}
          activeKey={activeKey}
          onHover={setActiveKey}
        />
        <Panel className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Compliance score</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-3xl font-semibold tabular-nums text-foreground">{inspection.score}</span>
                <ScoreBadge score={inspection.score} />
              </div>
            </div>
            <div className="text-right">
              <StatusTag status={inspection.status} />
              <p className="mt-1 text-xs text-muted-foreground">
                {violations.length === 0 ? 'All declarations present' : `${violations.length} issue${violations.length > 1 ? 's' : ''} detected`}
              </p>
            </div>
          </div>
          <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Batch / lot</dt>
              <dd className="font-medium tabular-nums text-foreground">{inspection.batchNumber}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="flex items-center gap-1.5 text-muted-foreground"><User className="size-3.5" /> Inspector</dt>
              <dd className="font-medium text-foreground">{inspection.inspectorName}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="flex items-center gap-1.5 text-muted-foreground"><MapPin className="size-3.5" /> State</dt>
              <dd className="font-medium text-foreground">{inspection.state}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Date</dt>
              <dd className="font-medium tabular-nums text-foreground">{inspection.date}</dd>
            </div>
            {inspection.readability && (
              <div className="flex items-center justify-between border-t border-border/60 pt-2">
                <dt className="text-muted-foreground text-xs">Readability</dt>
                <dd className="font-semibold text-xs capitalize text-foreground flex items-center gap-1.5">
                  <span className={cn('size-2 rounded-full', inspection.readability.status === 'pass' ? 'bg-emerald-500' : 'bg-amber-500')} />
                  {inspection.readability.status}
                </dd>
              </div>
            )}
          </dl>
          <div className="mt-4 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="gap-1.5 bg-sky-50 hover:bg-sky-100/90 text-sky-700 border-sky-200/90 cursor-pointer text-xs font-semibold shadow-xs"
                disabled={isPreparingPdf}
                onClick={async () => {
                  setIsPreparingPdf(true)
                  setIsPdfModalOpen(true)
                  try {
                    const blobUrl = await generateInspectionPDF(inspection, 'view')
                    setPdfPreviewUrl(blobUrl)
                  } catch (err) {
                    console.error(err)
                    alert('Could not generate PDF preview.')
                  } finally {
                    setIsPreparingPdf(false)
                  }
                }}
              >
                {isPreparingPdf ? (
                  <><Loader2 className="size-3.5 animate-spin" /> Preparing…</>
                ) : (
                  <><Eye className="size-3.5" /> View Report</>
                )}
              </Button>
              <Button
                variant="outline"
                className="gap-1.5 cursor-pointer text-xs"
                onClick={async () => {
                  await generateInspectionPDF(inspection, 'download')
                }}
              >
                <Download className="size-3.5" /> Download PDF
              </Button>
            </div>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-danger/30 bg-danger/5 text-xs font-medium text-danger hover:bg-danger/10 hover:border-danger/50 transition-colors cursor-pointer"
            >
              <Trash2 className="size-3.5" /> Delete Inspection
            </button>
          </div>
        </Panel>
      </div>

      <div className="lg:col-span-3">
        <Panel>
          <PanelHeader
            title="Declaration analysis"
            description="9 mandatory declarations under LMPC Rules, 2011 — hover a field to locate it on the label"
          />
          <FieldList fields={inspection.fields} activeKey={activeKey} onHover={setActiveKey} />
        </Panel>
      </div>

      {/* In-App PDF Viewer Popup Component */}
      <PdfViewerModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        pdfUrl={pdfPreviewUrl}
        productName={inspection.productName}
        onDownload={async () => {
          await generateInspectionPDF(inspection, 'download')
        }}
      />
    </div>
  )
}

