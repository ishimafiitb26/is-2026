import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Mengecek status dari Environment Variable
  const isMaintenance = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true';
  
  // Deteksi apakah sedang di environment local (npm run dev)
  const isDevelopment = process.env.NODE_ENV === 'development';

  // JIKA SEDANG MAINTENANCE & BUKAN DI LOCALHOST & BUKAN DI HALAMAN /maintenance
  if (isMaintenance && !isDevelopment && !request.nextUrl.pathname.startsWith('/maintenance')) {
    return NextResponse.redirect(new URL('/maintenance', request.url));
  }

  // Jika maintenance SUDAH SELESAI, tapi user iseng buka link /maintenance
  if (!isMaintenance && !isDevelopment && request.nextUrl.pathname.startsWith('/maintenance')) {
    return NextResponse.redirect(new URL('/', request.url));
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};