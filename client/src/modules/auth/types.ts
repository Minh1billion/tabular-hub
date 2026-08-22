export type OAuthProvider = 'google' | 'github'

export interface User {
  id: string
  email: string
  display_name: string | null
  avatar_url: string | null
}
