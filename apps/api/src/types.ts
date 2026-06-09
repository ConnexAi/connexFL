import type { auth } from './lib/auth'

type SessionResponse = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>

export type AppVariables = {
  session: SessionResponse
  user: SessionResponse['user']
}
