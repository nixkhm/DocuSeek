import { useState } from 'react'
import type { Document } from '../hooks/useDocuments'
import { FileUpload } from './FileUpload'
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
}

export function DocumentSidebar({
  documents,
  selectedDocIds,
  onUpload,
  onDelete,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
}: DocumentSidebarProps) {
  const [open, setOpen] = useState(true)

  const readyDocs = documents.filter((d) => d.status === 'ready')
  const allSelected =
    readyDocs.length > 0 && readyDocs.every((d) => selectedDocIds.includes(d.id))

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed left-4 top-4 z-20 flex items-center justify-center rounded-md border border-gray-200 bg-white p-2 shadow-sm md:hidden"
        aria-label="Toggle sidebar"
      >
        <svg
          className="h-5 w-5 text-gray-600"
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
          className="fixed inset-0 z-10 bg-black/20 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-10 flex w-72 flex-col border-r border-gray-200 bg-white transition-transform duration-200',
          open ? 'translate-x-0' : '-translate-x-full',
          'md:static md:translate-x-0',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-800">Documents</h2>
          <span className="text-xs text-gray-400">
            {documents.length}/{MAX_DOCUMENTS}
          </span>
        </div>

        {/* Select all / deselect all */}
        {readyDocs.length > 0 && (
          <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-2">
            <button
              onClick={allSelected ? onDeselectAll : onSelectAll}
              className="text-xs text-blue-600 hover:underline"
            >
              {allSelected ? 'Deselect all' : 'Select all'}
            </button>
            <span className="text-xs text-gray-400">
              ({selectedDocIds.length} selected)
            </span>
          </div>
        )}

        {/* Document list */}
        <ul className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-start gap-3 px-4 py-3">
              <input
                type="checkbox"
                checked={selectedDocIds.includes(doc.id)}
                disabled={doc.status !== 'ready'}
                onChange={() => onToggleSelect(doc.id)}
                className="mt-0.5 h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
              />
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-sm font-medium text-gray-800"
                  title={doc.filename}
                >
                  {doc.filename}
                </p>
                <p className="mt-0.5 text-xs text-gray-400">{doc.page_count} pages</p>
                <div className="mt-1">
                  <ProcessingStatus status={doc.status} />
                </div>
              </div>
              <button
                onClick={() => onDelete(doc.id)}
                className="mt-0.5 shrink-0 text-gray-300 hover:text-red-500"
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
        <div className="border-t border-gray-100 p-4">
          <FileUpload
            onUpload={onUpload}
            documentCount={documents.length}
            maxDocuments={MAX_DOCUMENTS}
          />
        </div>
      </aside>
    </>
  )
}
