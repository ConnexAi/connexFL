import { betterAuth } from 'better-auth'
import { Pool } from 'pg'

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:8000',
  database: {
    db: new Pool({
      connectionString: process.env.DATABASE_URL,
    }),
    type: 'pg',
  },
  user: {
    modelName: 'ba_user',
  },
  session: {
    modelName: 'ba_session',
  },
  account: {
    modelName: 'ba_account',
  },
  verification: {
    modelName: 'ba_verification',
  },
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    },
  },
  trustedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  ],
})

export type Auth = typeof auth
