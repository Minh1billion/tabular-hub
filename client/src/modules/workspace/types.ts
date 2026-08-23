import { GraphSpec } from '@/modules/editor/types'

export interface Workspace {
  id: string
  name: string
  owner_id: string
  spec: GraphSpec | null
  created_at: string
}

export interface CreateWorkspacePayload {
  name: string
}

export interface UpdateWorkspacePayload {
  name?: string
  spec?: GraphSpec
}