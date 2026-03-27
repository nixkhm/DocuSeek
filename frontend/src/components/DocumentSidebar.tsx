import { useState } from 'react'
import type { Document } from '../hooks/useDocuments'
import { FileUpload } from './FileUpload'
import { PdfViewerModal } from './PdfViewerModal'
import { ProcessingStatus } from './ProcessingStatus'

const MAX_DOCUMENTS = 5

interface DocumentSidebarProps {
  documents: Document[]
  selectedDocIds: string[]
  onUpload: (file: File) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onToggleSelect: (id: string) => void
  onSelectAll: () => void
  onDeselectAll: () => void
  onHowToUse: () => void
}

export function DocumentSidebar({
  documents,
  selectedDocIds,
  onUpload,
  onDelete,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  onHowToUse,
}: DocumentSidebarProps) {
  const [open, setOpen] = useState(true)
  const [pendingDelete, setPendingDelete] = useState<Document | null>(null)
  const [viewingDoc, setViewingDoc] = useState<Document | null>(null)

  const readyDocs = documents.filter((d) => d.status === 'ready')
  const allSelected =
    readyDocs.length > 0 && readyDocs.every((d) => selectedDocIds.includes(d.id))

  function confirmDelete() {
    if (!pendingDelete) return
    onDelete(pendingDelete.id)
    setPendingDelete(null)
  }

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed left-4 top-4 z-20 flex items-center justify-center rounded-md border border-ds-blue bg-ds-navy p-2 shadow-sm md:hidden"
        aria-label="Toggle sidebar"
      >
        <svg
          className="h-5 w-5 text-ds-pale"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* Overlay on mobile when open */}
      {open && (
        <div
          className="fixed inset-0 z-10 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* PDF viewer modal */}
      {viewingDoc && (
        <PdfViewerModal
          docId={viewingDoc.id}
          filename={viewingDoc.filename}
          onClose={() => setViewingDoc(null)}
        />
      )}

      {/* Delete confirmation modal */}
      {pendingDelete && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60">
          <div className="mx-4 w-full max-w-sm rounded-xl border border-ds-blue bg-ds-navy p-6 shadow-xl">
            <p className="text-sm font-semibold text-ds-pale">Delete document?</p>
            <p className="mt-2 text-sm text-ds-periwinkle">
              Are you sure you want to delete{' '}
              <span className="font-medium text-ds-pale">{pendingDelete.filename}</span>?
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setPendingDelete(null)}
                className="cursor-pointer rounded-lg border border-ds-blue px-4 py-2 text-sm text-ds-periwinkle hover:bg-ds-blue/30 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="cursor-pointer rounded-lg bg-red-500/80 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar panel */}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-10 flex w-72 flex-col border-r border-ds-blue bg-ds-navy transition-transform duration-200',
          open ? 'translate-x-0' : '-translate-x-full',
          'md:static md:translate-x-0',
        ].join(' ')}
      >
        {/* Header */}
        <div className="relative flex flex-col border-b border-ds-blue/50 px-4 py-3 gap-3">
          <img src="/logo.png" alt="DocuSeek" className="w-full object-contain p-10" />
          <button
            onClick={onHowToUse}
            className="cursor-pointer absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full border border-ds-blue/60 text-xs font-bold text-ds-periwinkle hover:bg-ds-blue/30 hover:text-ds-pale transition-colors"
            aria-label="How to use"
          >
            ?
          </button>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ds-pale">Documents</h2>
            <span className="text-xs text-ds-periwinkle">
              {documents.length}/{MAX_DOCUMENTS}
            </span>
          </div>
        </div>

        {/* Select all / deselect all */}
        {readyDocs.length > 0 && (
          <div className="flex items-center gap-2 border-b border-ds-blue/50 px-4 py-2">
            <button
              onClick={allSelected ? onDeselectAll : onSelectAll}
              className="text-xs text-ds-periwinkle hover:text-ds-pale hover:underline"
            >
              {allSelected ? 'Deselect all' : 'Select all'}
            </button>
            <span className="text-xs text-ds-periwinkle/60">
              ({selectedDocIds.length} selected)
            </span>
          </div>
        )}

        {/* Document list */}
        <ul className="flex-1 overflow-y-auto divide-y divide-ds-blue/40">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-start gap-3 px-4 py-3">
              <input
                type="checkbox"
                checked={selectedDocIds.includes(doc.id)}
                disabled={doc.status !== 'ready'}
                onChange={() => onToggleSelect(doc.id)}
                className="mt-0.5 h-4 w-4 cursor-pointer rounded border-ds-blue accent-ds-periwinkle disabled:cursor-not-allowed disabled:opacity-40"
              />
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-sm font-medium text-ds-pale"
                  title={doc.filename}
                >
                  {doc.filename}
                </p>
                <p className="mt-0.5 text-xs text-ds-periwinkle">{doc.page_count} pages</p>
                <div className="mt-1">
                  <ProcessingStatus status={doc.status} />
                </div>
              </div>
              <button
                onClick={() => setViewingDoc(doc)}
                disabled={doc.status !== 'ready'}
                className="cursor-pointer mt-0.5 shrink-0 text-ds-periwinkle/40 hover:text-ds-periwinkle transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                aria-label={`View ${doc.filename}`}
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                  <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd" />
                </svg>
              </button>
              <button
                onClick={() => setPendingDelete(doc)}
                className="cursor-pointer mt-0.5 shrink-0 text-ds-periwinkle/40 hover:text-red-400 transition-colors"
                aria-label={`Delete ${doc.filename}`}
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 3.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </li>
          ))}
        </ul>

        {/* Upload zone */}
        <div className="border-t border-ds-blue/50 p-4">
          <FileUpload
            onUpload={onUpload}
            documentCount={documents.length}
            maxDocuments={MAX_DOCUMENTS}
          />
        </div>

        {/* Footer */}
        <div className="border-t border-ds-blue/50 px-4 py-3 text-center space-y-0.5">
          <p className="text-xs text-ds-periwinkle/60">
            Designed & built by{' '}
            <a
              href="https://github.com/nixkhm"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-ds-periwinkle hover:text-ds-pale transition-colors underline underline-offset-2"
            >
              Nicholas Masters
              <svg className="h-3 w-3 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-4a.75.75 0 0 1 1.5 0v4A2.25 2.25 0 0 1 12.75 17h-8.5A2.25 2.25 0 0 1 2 14.75v-8.5A2.25 2.25 0 0 1 4.25 4h5a.75.75 0 0 1 0 1.5h-5Zm6.75-3a.75.75 0 0 1 .75-.75h3.75a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V3.81l-6.22 6.22a.75.75 0 0 1-1.06-1.06L14.19 2.75H11a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
              </svg>
            </a>
          </p>
          <p className="text-xs text-ds-periwinkle/40">
            © 2026 Nicholas Masters. All rights reserved.
          </p>
        </div>
      </aside>
    </>
  )
}
