import { GraphSpec } from '@/modules/editor/types'

export interface Workspace {
  id: string
  name: string
  owner_id: string
  spec: GraphSpec | null
  created_at: string
  updated_at: string
}

export interface WorkspaceLastRun {
  id: string
  kind: string
  status: string
  created_at: string
}

export interface WorkspaceListItem extends Workspace {
  dataset_count: number
  last_run: WorkspaceLastRun | null
}

export interface CreateWorkspacePayload {
  name: string
}

export interface UpdateWorkspacePayload {
  name?: string
  spec?: GraphSpec
}