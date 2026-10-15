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

export interface PresignUploadResponse {
  run_id: string
  upload_url: string
  staging_key: string
}

export interface ExportDownloadResponse {
  download_url: string
}