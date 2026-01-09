import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { PUBLIC_ROUTES, LOGIN, ROOT} from "@/lib/routes";
import { ROLES } from "@/lib/permissions";
import { getRedirectUrlByRole } from "@/lib/auth-redirect";

export default auth((req) => {
    const { nextUrl } = req;
    
    const isAuthenticated = !!req.auth;
    const user = req.auth?.user;
    const userRole = user?.role;
    const userStatus = user?.status;

    const isPublicRoute = PUBLIC_ROUTES.some((route) => nextUrl.pathname.startsWith(route)) || nextUrl.pathname === ROOT;

    // Redirect logged-in users away from login page
    if (nextUrl.pathname === LOGIN && isAuthenticated && userRole) {
        const redirectUrl = getRedirectUrlByRole(userRole);
        return NextResponse.redirect(new URL(redirectUrl, nextUrl));
    }

    // Check if user is active (if authenticated)
    // Only check if status exists and is not 'active' (handle null/undefined as active for legacy users)
    if (isAuthenticated && userStatus && userStatus !== 'active') {
        // Inactive or suspended users should be logged out
        // Redirect to login with error message
        const loginUrl = new URL(LOGIN, nextUrl);
        loginUrl.searchParams.set('error', 'account_inactive');
        return NextResponse.redirect(loginUrl);
    }
    
    // Redirect logged-in users away from registration pages
    if ((nextUrl.pathname.startsWith('/register/student') || 
         nextUrl.pathname.startsWith('/register/instructor')) && 
        isAuthenticated && userRole) {
        const redirectUrl = getRedirectUrlByRole(userRole);
        return NextResponse.redirect(new URL(redirectUrl, nextUrl));
    }

    // Check authentication for protected routes
    if (!isAuthenticated && !isPublicRoute) {
        const loginUrl = new URL(LOGIN, nextUrl);
        // Preserve the original URL for redirect after login
        loginUrl.searchParams.set('callbackUrl', nextUrl.pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Protect admin routes - only active admins can access
    if (nextUrl.pathname.startsWith('/admin')) {
        if (!isAuthenticated) {
            const loginUrl = new URL(LOGIN, nextUrl);
            loginUrl.searchParams.set('callbackUrl', nextUrl.pathname);
            return NextResponse.redirect(loginUrl);
        }
        // Check status - only if status exists and is not 'active'
        if (userStatus && userStatus !== 'active') {
            const loginUrl = new URL(LOGIN, nextUrl);
            loginUrl.searchParams.set('error', 'account_inactive');
            return NextResponse.redirect(loginUrl);
        }
        if (userRole !== ROLES.ADMIN) {
            return NextResponse.redirect(new URL('/', nextUrl));
        }
    }

    // Protect dashboard routes - only active instructors/admins can access
    if (nextUrl.pathname.startsWith('/dashboard')) {
        if (!isAuthenticated) {
            const loginUrl = new URL(LOGIN, nextUrl);
            loginUrl.searchParams.set('callbackUrl', nextUrl.pathname);
            return NextResponse.redirect(loginUrl);
        }
        // Check status - only if status exists and is not 'active'
        if (userStatus && userStatus !== 'active') {
            const loginUrl = new URL(LOGIN, nextUrl);
            loginUrl.searchParams.set('error', 'account_inactive');
            return NextResponse.redirect(loginUrl);
        }
        if (userRole !== ROLES.INSTRUCTOR && userRole !== ROLES.ADMIN) {
            return NextResponse.redirect(new URL('/', nextUrl));
        }
    }

    return NextResponse.next();
});

export const config = {
    matcher: [
      // Exclude ALL /api routes, Next.js internal routes, and static files
      "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
      "/", // Include the root route
    ],
  };
