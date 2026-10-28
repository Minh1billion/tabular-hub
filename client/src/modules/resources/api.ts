import { apiClient } from '@/shared/lib/api-client'
import { Run } from '@/modules/runs/types'
import {
  ExportDownloadResponse,
  ExportResourcePayload,
  ImportResourcePayload,
  PresignUploadResponse,
  ResourceListResponse,
  ResourcePreview,
} from './types'

export function listResources(workspaceId: string) {
  return apiClient.get<ResourceListResponse>(`/workspaces/${workspaceId}/resources`)
}

export function previewResource(workspaceId: string, key: string, limit: number, offset: number) {
  return apiClient.get<ResourcePreview>(
    `/workspaces/${workspaceId}/resources/${encodeURIComponent(key)}?limit=${limit}&offset=${offset}`,
  )
}

export function deleteResource(workspaceId: string, key: string) {
  return apiClient.delete<void>(`/workspaces/${workspaceId}/resources/${encodeURIComponent(key)}`)
}

function putToStaging(
  uploadUrl: string,
  file: File,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Upload cancelled', 'AbortError'))
      return
    }

    const xhr = new XMLHttpRequest()
    xhr.open('PUT', uploadUrl)

    const handleAbort = () => {
      xhr.abort()
      reject(new DOMException('Upload cancelled', 'AbortError'))
    }
    signal?.addEventListener('abort', handleAbort, { once: true })

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    }
    xhr.onload = () => {
      signal?.removeEventListener('abort', handleAbort)
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
      } else {
        reject(new Error('Upload failed'))
      }
    }
    xhr.onerror = () => {
      signal?.removeEventListener('abort', handleAbort)
      reject(new Error('Network error'))
    }
    xhr.onabort = () => {
      signal?.removeEventListener('abort', handleAbort)
      reject(new DOMException('Upload cancelled', 'AbortError'))
    }
    xhr.send(file)
  })
}

export async function importResource(
  workspaceId: string,
  payload: ImportResourcePayload,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
) {
  const presign = await apiClient.post<PresignUploadResponse>(`/workspaces/${workspaceId}/resources/presign-upload`, {
    key: payload.key,
    filename: payload.file.name,
    format: payload.format,
    overwrite: payload.overwrite,
    idempotency_key: crypto.randomUUID(),
  })

  if (signal?.aborted) {
    throw new DOMException('Upload cancelled', 'AbortError')
  }

  await putToStaging(presign.upload_url, payload.file, onProgress, signal)

  if (signal?.aborted) {
    throw new DOMException('Upload cancelled', 'AbortError')
  }

  return apiClient.post<Run>(`/workspaces/${workspaceId}/resources/${presign.run_id}/confirm-upload`)
}

export function exportResource(workspaceId: string, key: string, payload: ExportResourcePayload) {
  return apiClient.post<Run>(`/workspaces/${workspaceId}/resources/${encodeURIComponent(key)}/export`, {
    format: payload.format,
    idempotency_key: crypto.randomUUID(),
  })
}

export function exportDownloadUrl(workspaceId: string, key: string, runId: string) {
  return apiClient
    .get<ExportDownloadResponse>(`/workspaces/${workspaceId}/resources/${encodeURIComponent(key)}/export/${runId}/download`)
    .then((response) => response.download_url)
}
