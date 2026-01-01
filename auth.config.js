export const authConfig = {
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        updateAge: 24 * 60 * 60, // 24 hours
    },
    pages: {
        signIn: '/login',
        error: '/login', // Error code passed in query string as ?error=
    },
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            // Initial sign in
            if (user) {
                token.id = user.id;
                token.email = user.email;
                token.name = user.name;
                token.role = user.role;
                token.status = user.status;
                token.image = user.image;
            }
            
            // Update session when profile is updated (via signIn with trigger: "update")
            if (trigger === "update" && session) {
                if (session.name) token.name = session.name;
                if (session.email) token.email = session.email;
                if (session.role) token.role = session.role;
                if (session.status) token.status = session.status;
                if (session.image !== undefined) token.image = session.image;
            }
            
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id;
                session.user.email = token.email;
                session.user.name = token.name;
                session.user.role = token.role;
                session.user.status = token.status;
                session.user.image = token.image;
            }
            return session;
        },
    },
    cookies: {
        sessionToken: {
            name: process.env.NODE_ENV === 'production' 
                ? `__Secure-next-auth.session-token`
                : `next-auth.session-token`,
            options: {
                httpOnly: true,
                sameSite: 'lax', // 'lax' for OAuth compatibility, 'strict' is more secure but breaks OAuth
                path: '/',
                secure: process.env.NODE_ENV === 'production',
                // maxAge is handled by session.maxAge
            },
        },
        callbackUrl: {
            name: process.env.NODE_ENV === 'production'
                ? `__Secure-next-auth.callback-url`
                : `next-auth.callback-url`,
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: process.env.NODE_ENV === 'production',
            },
        },
        csrfToken: {
            name: process.env.NODE_ENV === 'production'
                ? `__Host-next-auth.csrf-token`
                : `next-auth.csrf-token`,
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: process.env.NODE_ENV === 'production',
            },
        },
    },
    providers: [],
}