import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get('better-auth.session_token')
  const isDashboard = request.nextUrl.pathname.startsWith('/dashboard')

  // Solo protege el dashboard. La presencia de la cookie NO garantiza sesión
  // válida — si expiró, el cliente redirige a /login. Sin la regla inversa
  // (isAuthPage && cookie → /dashboard) no hay loop de redirecciones.
  if (isDashboard && !sessionToken) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
}
