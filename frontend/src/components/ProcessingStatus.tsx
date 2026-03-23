import type { Document } from '../hooks/useDocuments'

type Status = Document['status']

const STAGES: { key: Status; label: string }[] = [
  { key: 'uploading', label: 'Uploading' },
  { key: 'extracting', label: 'Extracting' },
  { key: 'chunking', label: 'Chunking' },
  { key: 'embedding', label: 'Embedding' },
  { key: 'ready', label: 'Ready' },
]

function stageIndex(status: Status): number {
  if (status === 'error') return -1
  return STAGES.findIndex((s) => s.key === status)
}

interface ProcessingStatusProps {
  status: Status
}

export function ProcessingStatus({ status }: ProcessingStatusProps) {
  if (status === 'ready') {
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-green-600">
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

  if (status === 'error') {
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-red-600">
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
      {STAGES.filter((s) => s.key !== 'ready').map((stage, i) => {
        const done = i < current
        const active = i === current

        return (
          <div key={stage.key} className="flex items-center gap-1">
            <div
              className={[
                'h-1.5 w-1.5 rounded-full',
                done
                  ? 'bg-blue-500'
                  : active
                    ? 'animate-pulse bg-blue-400'
                    : 'bg-gray-300',
              ].join(' ')}
            />
            {i < STAGES.length - 2 && <div className="h-px w-2 bg-gray-200" />}
          </div>
        )
      })}
      <span className="ml-1 text-xs text-gray-500 capitalize">{status}…</span>
    </div>
  )
}
