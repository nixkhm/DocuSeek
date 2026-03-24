import { useState } from 'react'
import type { Citation } from '../hooks/useSSE'

interface CitationCardProps {
  citation: Citation
  index: number
}

function scoreColor(score: number): string {
  if (score >= 0.7) return 'bg-green-900/50 text-green-400'
  if (score >= 0.4) return 'bg-yellow-900/50 text-yellow-400'
  return 'bg-ds-blue/50 text-ds-periwinkle'
}

export function CitationCard({ citation, index }: CitationCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-lg border border-ds-blue bg-ds-bg text-xs">
      {/* Header row — always visible */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-ds-blue/30 rounded-lg transition-colors"
      >
        <span className="shrink-0 font-medium text-ds-periwinkle">[{index + 1}]</span>
        <span className="min-w-0 flex-1 truncate font-medium text-ds-pale">
          {citation.document_name}
        </span>
        <span className="shrink-0 text-ds-periwinkle">p.{citation.page_number}</span>
        <span
          className={[
            'shrink-0 rounded-full px-1.5 py-0.5 font-medium',
            scoreColor(citation.relevance_score),
          ].join(' ')}
        >
          {(citation.relevance_score * 100).toFixed(0)}%
        </span>
        <svg
          className={[
            'h-3.5 w-3.5 shrink-0 text-ds-periwinkle transition-transform',
            expanded ? 'rotate-180' : '',
          ].join(' ')}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Expanded chunk text */}
      {expanded && (
        <div className="border-t border-ds-blue px-3 py-2">
          <p className="whitespace-pre-wrap text-ds-pale/80 leading-relaxed">
            {citation.chunk_text_snippet}
          </p>
        </div>
      )}
    </div>
  )
}
