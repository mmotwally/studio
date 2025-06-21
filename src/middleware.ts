import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt } from './lib/session';

export async function middleware(request: NextRequest) {
  // Get the pathname
  const path = request.nextUrl.pathname;

  // Public paths that don't require authentication
  const isPublicPath = path === '/login';

  // Check if the user is authenticated
  const sessionCookie = request.cookies.get('session')?.value;
  let isAuthenticated = false;

  if (sessionCookie) {
    try {
      const session = await decrypt(sessionCookie);
      // Check if session is valid and not expired
      if (session && session.user && new Date(session.expires) > new Date()) {
        isAuthenticated = true;
      } else if (session === null) {
        // Session is invalid, clear the cookie
        const response = NextResponse.next();
        response.cookies.set("session", "", { expires: new Date(0), path: '/' });
        return response;
      }
    } catch (error) {
      console.error('Session validation error:', error);
      // Clear invalid session cookie
      const response = NextResponse.next();
      response.cookies.set("session", "", { expires: new Date(0), path: '/' });
      return response;
    }
  }

  // Redirect logic
  if (isPublicPath && isAuthenticated) {
    // If user is on a public path but is authenticated, redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (!isPublicPath && !isAuthenticated) {
    // If user is on a protected path but is not authenticated, redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Continue with the request
  return NextResponse.next();
}

// Configure the middleware to run on specific paths
export const config = {
  // Match all paths except for static files, api routes, and _next
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:jpg|jpeg|gif|png|svg)$).*)'],
};