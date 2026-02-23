import { NextResponse, NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Use cookie to check auth status as js-cookie isn't available in Edge Runtime
    const accessToken = request.cookies.get('access_token')?.value;
    const userProfile = request.cookies.get('user_profile')?.value;

    // Protect /crm routes
    if (pathname.startsWith('/crm')) {
        if (!accessToken) {
            const url = new URL('/signin', request.url);
            url.searchParams.set('callbackUrl', pathname);
            return NextResponse.redirect(url);
        }

        // Protect admin routes
        if (pathname.startsWith('/crm/admin')) {
            try {
                const user = JSON.parse(userProfile || '{}');
                const roleLevel = user.role_level || 0;
                const role = user.role || '';

                if (role !== 'administrator' && roleLevel < 3) {
                    return NextResponse.redirect(new URL('/crm/dashboard', request.url));
                }
            } catch {
                return NextResponse.redirect(new URL('/crm/dashboard', request.url));
            }
        }
    }

    // Redirect legacy /dashboard to /crm/dashboard
    if (pathname === '/dashboard') {
        return NextResponse.redirect(new URL('/crm/dashboard', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/crm/:path*', '/dashboard', '/signin'],
};
