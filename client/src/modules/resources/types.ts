export interface ResourceListResponse {
  keys: string[]
}

export interface ResourcePreview {
  key: string
  bucket: string | null
  row_count: number
  returned_rows: number
  offset: number
  rows: Record<string, unknown>[]
}

export interface ImportResourcePayload {
  key: string
  format: string
  overwrite: boolean
  file: File
}

export interface ExportResourcePayload {
  format: string
}