import { useEffect, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { api } from '../services/api'

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface PdfViewerModalProps {
  docId: string
  filename: string
  onClose: () => void
}

export function PdfViewerModal({ docId, filename, onClose }: PdfViewerModalProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [numPages, setNumPages] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const blobUrlRef = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api.fetchPdfBlob(docId).then((url) => {
      if (cancelled) {
        URL.revokeObjectURL(url)
        return
      }
      blobUrlRef.current = url
      setBlobUrl(url)
      setLoading(false)
    }).catch(() => {
      if (!cancelled) {
        setError('Failed to load PDF.')
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    }
  }, [docId])

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={handleBackdropClick}
    >
      <div className="flex h-[90vh] w-full max-w-3xl flex-col rounded-xl border border-ds-blue bg-ds-navy shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ds-blue/50 px-5 py-3">
          <p className="truncate text-sm font-medium text-ds-pale" title={filename}>
            {filename}
          </p>
          <button
            onClick={onClose}
            className="ml-4 shrink-0 text-ds-periwinkle/60 hover:text-ds-pale transition-colors"
            aria-label="Close"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        {/* PDF area */}
        <div className="flex-1 overflow-auto flex items-start justify-center bg-ds-bg/60 p-4">
          {loading && (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-ds-periwinkle animate-pulse">Loading PDF…</p>
            </div>
          )}
          {error && (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
          {blobUrl && (
            <Document
              file={blobUrl}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              loading={null}
            >
              <Page
                pageNumber={currentPage}
                width={680}
                renderTextLayer
                renderAnnotationLayer
              />
            </Document>
          )}
        </div>

        {/* Page navigation */}
        {numPages > 0 && (
          <div className="flex items-center justify-center gap-4 border-t border-ds-blue/50 px-5 py-3">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="cursor-pointer flex items-center justify-center rounded-md border border-ds-blue p-1.5 text-ds-periwinkle hover:bg-ds-blue/30 hover:text-ds-pale transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
              </svg>
            </button>

            <span className="text-sm text-ds-periwinkle">
              Page <span className="font-medium text-ds-pale">{currentPage}</span> of{' '}
              <span className="font-medium text-ds-pale">{numPages}</span>
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
              disabled={currentPage >= numPages}
              className="cursor-pointer flex items-center justify-center rounded-md border border-ds-blue p-1.5 text-ds-periwinkle hover:bg-ds-blue/30 hover:text-ds-pale transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
