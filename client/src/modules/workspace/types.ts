import { GraphSpec } from '@/modules/editor/types'

export type WorkspaceRole = 'owner' | 'member'

export interface Workspace {
  id: string
  name: string
  owner_id: string
  role: WorkspaceRole
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

export interface WorkspaceOwner {
  id: string
  email: string
  display_name: string | null
}

export interface WorkspaceListItem extends Workspace {
  dataset_count: number
  last_run: WorkspaceLastRun | null
  owner: WorkspaceOwner | null
}

export interface CreateWorkspacePayload {
  name: string
}

export interface UpdateWorkspacePayload {
  name?: string
  spec?: GraphSpec
}

export interface WorkspaceMember {
  user_id: string
  email: string
  display_name: string | null
  avatar_url: string | null
  role: WorkspaceRole
  joined_at: string | null
}

export type InvitationStatus = 'pending' | 'expired' | 'accepted'

export interface WorkspaceInvitation {
  id: string
  email: string
  status: InvitationStatus
  expires_at: string
  created_at: string
}

export interface WorkspaceMembers {
  owner: WorkspaceMember
  members: WorkspaceMember[]
  invitations: WorkspaceInvitation[]
}

export interface InviteResult {
  member: WorkspaceMember | null
  invitation: WorkspaceInvitation | null
  email_sent: boolean
  invite_url: string
}
