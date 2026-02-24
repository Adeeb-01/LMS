import { auth } from "@/auth-edge";
import { NextResponse } from "next/server";
import { PUBLIC_ROUTES, LOGIN, ROOT } from "@/lib/routes";
import { ROLES } from "@/lib/permissions";
import { getRedirectUrlByRole } from "@/lib/auth-redirect";
import { addSecurityHeaders } from "@/lib/security-headers";

/**
 * Role-based route protection (OWASP: enforce at edge).
 * Path prefix -> array of allowed roles. Empty array = no role restriction (any authenticated user).
 * Unlisted protected paths are denied for unauthenticated users by the generic auth check below.
 */
const ROLE_PROTECTED_ROUTES = [
    { prefix: '/admin', allowedRoles: [ROLES.ADMIN] },
    { prefix: '/dashboard', allowedRoles: [ROLES.INSTRUCTOR, ROLES.ADMIN] },
];

function isPublicRoute(pathname) {
    return pathname === ROOT || PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

function getRoleRestriction(pathname) {
    return ROLE_PROTECTED_ROUTES.find(({ prefix }) => pathname.startsWith(prefix));
}

export default auth((req) => {
    const { nextUrl } = req;
    const pathname = nextUrl.pathname;

    const isAuthenticated = !!req.auth;
    const user = req.auth?.user;
    const userRole = user?.role;
    const userStatus = user?.status;

    // ----- 1. Logged-in users: redirect away from login/register -----
    if (pathname === LOGIN && isAuthenticated && userRole) {
        return addSecurityHeaders(NextResponse.redirect(new URL(getRedirectUrlByRole(userRole), nextUrl)), req);
    }
    if ((pathname.startsWith('/register/student') || pathname.startsWith('/register/instructor')) && isAuthenticated && userRole) {
        return addSecurityHeaders(NextResponse.redirect(new URL(getRedirectUrlByRole(userRole), nextUrl)), req);
    }

    // ----- 2. Authenticated but inactive/suspended: force re-auth -----
    if (isAuthenticated && userStatus && userStatus !== 'active') {
        const loginUrl = new URL(LOGIN, nextUrl);
        loginUrl.searchParams.set('error', 'account_inactive');
        return addSecurityHeaders(NextResponse.redirect(loginUrl), req);
    }

    // ----- 3. Require auth for any non-public route -----
    if (!isAuthenticated && !isPublicRoute(pathname)) {
        const loginUrl = new URL(LOGIN, nextUrl);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return addSecurityHeaders(NextResponse.redirect(loginUrl), req);
    }

    // ----- 4. RBAC: strict role check at edge (before page/components run) -----
    const roleRestriction = getRoleRestriction(pathname);
    if (roleRestriction) {
        const { allowedRoles } = roleRestriction;
        if (!isAuthenticated) {
            const loginUrl = new URL(LOGIN, nextUrl);
            loginUrl.searchParams.set('callbackUrl', pathname);
            return addSecurityHeaders(NextResponse.redirect(loginUrl), req);
        }
        if (userStatus && userStatus !== 'active') {
            const loginUrl = new URL(LOGIN, nextUrl);
            loginUrl.searchParams.set('error', 'account_inactive');
            return addSecurityHeaders(NextResponse.redirect(loginUrl), req);
        }
        const hasRole = allowedRoles.includes(userRole);
        if (!hasRole) {
            return addSecurityHeaders(NextResponse.redirect(new URL(ROOT, nextUrl)), req);
        }
    }

    // ----- 5. Apply OWASP security headers to all matching responses -----
    return addSecurityHeaders(NextResponse.next(), req);
});

export const config = {
    matcher: [
        "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
        "/",
    ],
};
