import { useEffect, useRef, useState } from 'react'
import { useSSE } from '../hooks/useSSE'
import type { Citation } from '../hooks/useSSE'
import { CitationCard } from './CitationCard'
import { MessageBubble } from './MessageBubble'
import type { Message } from './MessageBubble'

interface HistoryEntry {
  message: Message
  citations?: Citation[]
}

interface ChatInterfaceProps {
  selectedDocIds: string[]
}

export function ChatInterface({ selectedDocIds }: ChatInterfaceProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [input, setInput] = useState('')
  const { isStreaming, currentMessage, error, streamQuery } = useSSE()
  const scrollRef = useRef<HTMLDivElement>(null)

  /* Auto-scroll for incoming messages */
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [history, currentMessage])

  async function handleSend() {
    const query = input.trim()
    if (!query || isStreaming) return

    setInput('')
    setHistory((prev) => [...prev, { message: { role: 'user', content: query } }])

    const result = await streamQuery(query, selectedDocIds)
    if (result) {
      setHistory((prev) => [
        ...prev,
        {
          message: { role: 'assistant', content: result.message },
          citations: result.citations,
        },
      ])
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const noDocsSelected = selectedDocIds.length === 0

  return (
    <div className="flex h-full flex-col bg-ds-bg">
      {/* Message list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
        {history.length === 0 && !isStreaming ? (
          <div className="flex h-full items-center justify-center text-sm text-ds-periwinkle">
            Select documents from the sidebar and ask a question.
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-6">
            {history.map((entry, i) => (
              <div key={i} className="space-y-2">
                <MessageBubble message={entry.message} />
                {entry.citations && entry.citations.length > 0 && (
                  <div className="space-y-1 pl-1">
                    {entry.citations.map((c, ci) => (
                      <CitationCard key={ci} citation={c} index={ci} />
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* In-progress streaming message */}
            {isStreaming && (
              <div className="space-y-2">
                <MessageBubble
                  message={{ role: 'assistant', content: currentMessage }}
                  isStreaming
                />
              </div>
            )}

            {/* Stream error */}
            {error && !isStreaming && (
              <p className="text-center text-xs text-red-400">{error}</p>
            )}
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="border-t border-ds-blue bg-ds-periwinkle/50 px-4 py-3">
        {noDocsSelected && (
          <p className="mb-2 text-center text-xs text-ds-navy font-medium">
            Select at least one document to query.
          </p>
        )}
        <div className="mx-auto flex max-w-3xl gap-2">
          <textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming || noDocsSelected}
            placeholder={
              noDocsSelected ? 'Select a document first…' : 'Ask a question…'
            }
            className="flex-1 resize-none rounded-xl border border-ds-blue bg-ds-navy px-4 py-2.5 text-sm text-ds-pale outline-none focus:border-ds-navy focus:ring-1 focus:ring-ds-navy disabled:cursor-not-allowed disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={isStreaming || noDocsSelected || !input.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center self-end rounded-xl bg-ds-navy text-ds-pale hover:bg-ds-blue transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Send"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.505 5.28H12.5a.75.75 0 0 1 0 1.5H3.784l-1.505 5.28a.75.75 0 0 0 .826.95 28.897 28.897 0 0 0 15.83-8.12.75.75 0 0 0 0-1.049 28.897 28.897 0 0 0-15.83-8.12Z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
