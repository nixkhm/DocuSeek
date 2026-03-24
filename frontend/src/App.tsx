import { useEffect, useState } from 'react'
import { ChatInterface } from './components/ChatInterface'
import { DocumentSidebar } from './components/DocumentSidebar'
import { IntroModal } from './components/IntroModal'
import { useDocuments } from './hooks/useDocuments'
import { useSession } from './hooks/useSession'
import { api } from './services/api'

const INTRO_KEY = 'docuseek_intro_seen'

function introSeenOnLoad(): boolean {
  return !localStorage.getItem(INTRO_KEY)
}

export default function App() {
  const sessionId = useSession()
  const {
    documents,
    selectedDocIds,
    uploadDocument,
    deleteDocument,
    toggleDocSelection,
    selectAll,
    deselectAll,
  } = useDocuments(sessionId)
  const [introOpen, setIntroOpen] = useState(introSeenOnLoad)
  const [llmProvider, setLlmProvider] = useState<string>('openai')
  const [llmModel, setLlmModel] = useState<string>('gpt-4o-mini')

  useEffect(() => {
    api.get<{ llm_provider: string; llm_model: string }>('/api/v1/config')
      .then(({ llm_provider, llm_model }) => {
        setLlmProvider(llm_provider)
        setLlmModel(llm_model)
      })
      .catch(() => {})
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-ds-bg">
      <IntroModal open={introOpen} onClose={() => setIntroOpen(false)} llmProvider={llmProvider} llmModel={llmModel} />

      <DocumentSidebar
        documents={documents}
        selectedDocIds={selectedDocIds}
        onUpload={uploadDocument}
        onDelete={deleteDocument}
        onToggleSelect={toggleDocSelection}
        onSelectAll={selectAll}
        onDeselectAll={deselectAll}
        onHowToUse={() => setIntroOpen(true)}
      />

      <main className="flex flex-1 flex-col overflow-hidden">
        <ChatInterface selectedDocIds={selectedDocIds} />
      </main>
    </div>
  )
}
