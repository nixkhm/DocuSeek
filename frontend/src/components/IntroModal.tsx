const INTRO_KEY = 'docuseek_intro_seen'

const STEPS = [
  {
    number: '01',
    title: 'No account required',
    body: 'DocuSeek creates an anonymous session for you automatically. No sign-in, registration, or personal data stored.',
  },
  {
    number: '02',
    title: 'Upload & process your documents',
    body: 'Drop/Select a PDF file (max 20 MB, 50 pages, up to 5 per session). Once the status shows Ready, it\'s available to query.',
  },
  {
    number: '03',
    title: 'Select documents to query',
    body: 'Select the box next to one or more documents in the sidebar. Only selected documents are referenced in the chat.',
  },
  {
    number: '04',
    title: 'Ask questions in the chat',
    body: 'Enter any question and answers are streamed back with citations showing the exact document, page number, and a relevance score for each source.',
  },
]

interface IntroModalProps {
  open: boolean
  onClose: () => void
  llmProvider?: string
  llmModel?: string
}

function formatLlmLabel(provider: string, model: string): string {
  if (provider === 'anthropic') return `Anthropic ${model}`
  return `OpenAI (${model})`
}

export function IntroModal({ open, onClose, llmProvider = 'openai', llmModel = 'gpt-4o-mini' }: IntroModalProps) {
  function dismiss() {
    localStorage.setItem(INTRO_KEY, '1')
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={dismiss}>
      <div className="w-full max-w-lg rounded-2xl border border-ds-blue bg-ds-navy shadow-2xl flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-ds-blue/50">
          <img src="/logo.png" alt="DocuSeek" className="h-50 object-contain mx-auto mb-4" />
          <p className="text-ds-periwinkle text-sm leading-relaxed text-center">
            A <span className="text-ds-pale font-medium">RAG</span> (Retrieval-Augmented Generation) powered document review tool. Upload your PDFs, ask questions, and get cited answers.
          </p>
        </div>

        {/* Steps */}
        <div className="overflow-y-auto px-6 py-4 space-y-4 flex-1">
          {STEPS.map((step) => (
            <div key={step.number} className="flex gap-4">
              <span className="shrink-0 mt-0.5 text-xs font-bold text-ds-blue">
                {step.number}
              </span>
              <div>
                <p className="text-sm font-semibold text-ds-pale">{step.title}</p>
                <p className="mt-0.5 text-xs text-ds-periwinkle leading-relaxed">
                  {step.body}
                </p>
              </div>
            </div>
          ))}

          {/* Model info */}
          <div className="rounded-lg border border-ds-blue/50 bg-ds-bg/60 px-4 py-3 mt-2">
            <p className="text-xs font-semibold text-ds-periwinkle uppercase tracking-wide mb-1">
              Powered by
            </p>
            <ul className="text-xs text-ds-periwinkle/80 space-y-0.5">
              <li>
                <span className="text-ds-pale font-medium">LLM — </span>
                {formatLlmLabel(llmProvider, llmModel)}
              </li>
              <li>
                <span className="text-ds-pale font-medium">Embeddings — </span>
                OpenAI text-embedding-3-small
              </li>
              <li>
                <span className="text-ds-pale font-medium">Vector search — </span>
                PostgreSQL pgvector with cosine similarity
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-ds-blue/50">
          <button
            onClick={dismiss}
            className="cursor-pointer w-full rounded-xl bg-ds-blue py-2.5 text-sm font-semibold text-ds-pale hover:bg-ds-periwinkle hover:text-ds-navy transition-colors"
          >
            Get started
          </button>
        </div>

      </div>
    </div>
  )
}
