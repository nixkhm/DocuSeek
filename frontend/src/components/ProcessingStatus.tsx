import { DocumentStatus } from '../types'
import type { Document } from '../hooks/useDocuments'

type Status = Document['status']

const STAGES: { key: Status; label: string }[] = [
  { key: DocumentStatus.UPLOADING, label: 'Uploading' },
  { key: DocumentStatus.EXTRACTING, label: 'Extracting' },
  { key: DocumentStatus.CHUNKING, label: 'Chunking' },
  { key: DocumentStatus.EMBEDDING, label: 'Embedding' },
  { key: DocumentStatus.READY, label: 'Ready' },
]

function stageIndex(status: Status): number {
  if (status === DocumentStatus.ERROR) return -1
  return STAGES.findIndex((s) => s.key === status)
}

interface ProcessingStatusProps {
  status: Status
}

export function ProcessingStatus({ status }: ProcessingStatusProps) {
  if (status === DocumentStatus.READY) {
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-green-400">
        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
            clipRule="evenodd"
          />
        </svg>
        Ready
      </span>
    )
  }

  if (status === DocumentStatus.ERROR) {
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-red-400">
        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
            clipRule="evenodd"
          />
        </svg>
        Error
      </span>
    )
  }

  const current = stageIndex(status)

  return (
    <div className="flex items-center gap-1">
      {STAGES.filter((s) => s.key !== DocumentStatus.READY).map((stage, i) => {
        const done = i < current
        const active = i === current

        return (
          <div key={stage.key} className="flex items-center gap-1">
            <div
              className={[
                'h-1.5 w-1.5 rounded-full',
                done
                  ? 'bg-ds-periwinkle'
                  : active
                    ? 'animate-pulse bg-ds-pale'
                    : 'bg-ds-blue',
              ].join(' ')}
            />
            {i < STAGES.length - 2 && <div className="h-px w-2 bg-ds-blue" />}
          </div>
        )
      })}
      <span className="ml-1 text-xs text-ds-periwinkle capitalize">{status}…</span>
    </div>
  )
}
