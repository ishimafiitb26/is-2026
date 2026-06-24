import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Mengecek status dari Environment Variable
  const isMaintenance = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true';

  // Jika status maintenance aktif dan pengunjung BUKAN di halaman /maintenance
  if (isMaintenance && !request.nextUrl.pathname.startsWith('/maintenance')) {
    // Arahkan paksa ke halaman maintenance
    return NextResponse.redirect(new URL('/maintenance', request.url));
  }

  // Jika maintenance SUDAH SELESAI, tapi user iseng buka link /maintenance
  if (!isMaintenance && request.nextUrl.pathname.startsWith('/maintenance')) {
    // Arahkan kembali ke halaman utama
    return NextResponse.redirect(new URL('/', request.url));
  }
}

export const config = {
  // Mengecualikan file statis, gambar, dan favicon agar desain halaman maintenance tidak rusak
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};