import { useRef, useState } from 'react'

const MAX_FILE_SIZE_MB = 20
const ACCEPTED_TYPE = 'application/pdf'

interface FileUploadProps {
  onUpload: (file: File) => Promise<void>
  documentCount: number
  maxDocuments: number
}

export function FileUpload({ onUpload, documentCount, maxDocuments }: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const atLimit = documentCount >= maxDocuments

  function validate(file: File): string | null {
    if (file.type !== ACCEPTED_TYPE) return 'Only PDF files are accepted.'
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024)
      return `File exceeds the ${MAX_FILE_SIZE_MB}MB size limit.`
    return null
  }

  async function handleFile(file: File) {
    const validationError = validate(file)
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    setUploading(true)
    try {
      await onUpload(file)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragging(true)
  }

  function onDragLeave() {
    setDragging(false)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    // Reset input so the same file can be re-uploaded after deletion
    e.target.value = ''
  }

  if (atLimit) {
    return (
      <div className="rounded-lg border border-dashed border-ds-blue bg-ds-bg/50 p-4 text-center text-sm text-ds-periwinkle">
        Maximum documents reached — delete to upload more.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={[
          'cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors',
          dragging
            ? 'border-ds-periwinkle bg-ds-blue/30'
            : 'border-ds-blue bg-ds-bg/50 hover:border-ds-periwinkle hover:bg-ds-blue/20',
          uploading ? 'pointer-events-none opacity-60' : '',
        ].join(' ')}
      >
        <p className="text-sm font-medium text-ds-pale">
          {uploading ? 'Uploading…' : 'Drop a PDF here or click to upload'}
        </p>
        <p className="mt-1 text-xs text-ds-periwinkle">
          PDF only · max {MAX_FILE_SIZE_MB}MB
        </p>
      </div>

      {/* Progress bar — shown while uploading */}
      {uploading && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-ds-blue">
          <div className="h-full animate-pulse rounded-full bg-ds-periwinkle" />
        </div>
      )}

      {/* Inline validation / upload error */}
      {error && <p className="text-xs text-red-400">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={onInputChange}
      />
    </div>
  )
}
