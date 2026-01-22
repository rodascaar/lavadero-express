import { defineMiddleware } from "astro:middleware";
import { verifySession, getSessionCookie } from "./lib/auth";

export const onRequest = defineMiddleware((context, next) => {
    const { pathname } = context.url;

    // Protect /admin routes
    if (pathname.startsWith("/admin") &&
        !pathname.startsWith("/admin/login") &&
        !pathname.startsWith("/admin/logout")) {

        const cookie = context.cookies.get(getSessionCookie());
        const session = cookie ? verifySession(cookie.value) : null;

        if (!session) {
            return context.redirect("/admin/login");
        }

        // Make session available to pages
        context.locals.user = session;
    }

    return next();
});
