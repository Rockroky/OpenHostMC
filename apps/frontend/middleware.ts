import { NextResponse, type NextRequest } from 'next/server';

function isTokenValid(token?: string): boolean {
  if (!token) return false;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const parsed = JSON.parse(jsonPayload);
    if (!parsed.exp) return true;
    return parsed.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname, search } = request.nextUrl;
  const searchParams = request.nextUrl.searchParams;

  const hasValidToken = isTokenValid(token);

  // Rotte pubbliche accessibili senza autenticazione
  const publicPaths = [
    '/login',
    '/register',
    '/share',
    '/api',
    '/favicon.ico',
    '/robots.txt',
    '/sitemap.xml',
    '/site.webmanifest',
    '/icon.png',
    '/apple-touch-icon.png',
    '/og-image.png',
    '/logo.png',
  ];

  const isPublicPath = publicPaths.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  );

  // Se l'utente visita login o register
  if (pathname === '/login' || pathname === '/register') {
    const isLogout = searchParams.get('logout') === 'true';
    const isExpired = searchParams.get('expired') === 'true';
    const isSwitch = searchParams.get('switch') === 'true';

    // Se l'utente ha esplicitamente richiesto logout o cambio account, pulisci cookie e consenti login
    if (isLogout || isExpired || isSwitch) {
      const response = NextResponse.next();
      if (token) {
        response.cookies.delete('token');
      }
      return response;
    }

    // Se ha un token scaduto, elimina il cookie e consenti l'accesso alla pagina di login
    if (token && !hasValidToken) {
      const response = NextResponse.next();
      response.cookies.delete('token');
      return response;
    }

    // Se ha già un token valido e non ha parametri speciali, reindirizza alla dashboard
    if (hasValidToken) {
      const redirectUrl = searchParams.get('redirect');
      const targetUrl = redirectUrl && redirectUrl.startsWith('/') ? redirectUrl : '/dashboard';
      return NextResponse.redirect(new URL(targetUrl, request.url));
    }

    return NextResponse.next();
  }

  // Se l'utente non ha un token valido e prova ad accedere a una rotta protetta
  if (!hasValidToken && !isPublicPath && pathname !== '/') {
    const loginUrl = new URL('/login', request.url);
    const destination = pathname + (search || '');
    loginUrl.searchParams.set('redirect', destination);
    if (token && !hasValidToken) {
      loginUrl.searchParams.set('expired', 'true');
    }
    const response = NextResponse.redirect(loginUrl);
    if (token && !hasValidToken) {
      response.cookies.delete('token');
    }
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
