export const DocumentStatus = {
  UPLOADING: 'uploading',
  EXTRACTING: 'extracting',
  CHUNKING: 'chunking',
  EMBEDDING: 'embedding',
  READY: 'ready',
  ERROR: 'error',
} as const

export type DocumentStatus = (typeof DocumentStatus)[keyof typeof DocumentStatus]
