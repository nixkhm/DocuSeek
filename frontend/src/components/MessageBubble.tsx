import ReactMarkdown from 'react-markdown'

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface MessageBubbleProps {
  message: Message
  isStreaming?: boolean
}

export function MessageBubble({ message, isStreaming = false }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div className={['flex', isUser ? 'justify-end' : 'justify-start'].join(' ')}>
      <div
        className={[
          'max-w-[80%] rounded-2xl px-4 py-3 text-sm',
          isUser
            ? 'rounded-br-sm bg-ds-blue text-ds-pale'
            : 'rounded-bl-sm bg-ds-bg text-ds-pale',
        ].join(' ')}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-sm max-w-none text-ds-pale prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-headings:text-ds-pale prose-strong:text-ds-pale prose-a:text-ds-periwinkle prose-code:rounded prose-code:bg-ds-navy prose-code:px-1 prose-code:text-ds-periwinkle prose-pre:bg-ds-navy">
            <ReactMarkdown>{message.content}</ReactMarkdown>
            {isStreaming && (
              <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-ds-periwinkle" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
