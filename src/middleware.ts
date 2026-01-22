import { defineMiddleware } from "astro:middleware";
import { verifySession, getSessionCookie, isAdmin } from "./lib/auth";

export const onRequest = defineMiddleware((context, next) => {
    const { pathname } = context.url;
    const method = context.request.method;

    // Protect /admin routes and /api/admin routes
    const isAdminPath = pathname.startsWith("/admin");
    const isApiAdminPath = pathname.startsWith("/api/admin");

    if ((isAdminPath || isApiAdminPath) &&
        !pathname.includes("/login") &&
        !pathname.includes("/logout")) {

        const cookie = context.cookies.get(getSessionCookie());
        const session = cookie ? verifySession(cookie.value) : null;

        // console.log(`[Middleware] Path: ${pathname}, Session:`, session);

        if (!session) {
            if (isApiAdminPath) {
                return new Response(JSON.stringify({ error: "No autorizado" }), {
                    status: 401,
                    headers: { "Content-Type": "application/json" }
                });
            }
            return context.redirect("/admin/login");
        }

        // Make session available to pages and APIs
        context.locals.user = session;

        // RBAC: BLOQUEOS ESPECÍFICOS

        // 1. Settings, Users, Services are ADMIN only
        const adminOnlyPaths = ["/admin/settings", "/admin/users", "/admin/services", "/api/admin/users", "/api/admin/settings", "/api/admin/services"];
        const needsAdminRole = adminOnlyPaths.some(path => pathname.startsWith(path));

        if (needsAdminRole && !isAdmin(session)) {
            if (isApiAdminPath) {
                return new Response(JSON.stringify({ error: "Permisos insuficientes" }), {
                    status: 403,
                    headers: { "Content-Type": "application/json" }
                });
            }
            return context.redirect("/admin");
        }

        // 2. DELETE on bookings is ADMIN only
        // Checking for both /admin/bookings (pages) and /api/admin/bookings (if it exists) or /api/bookings
        const isBookingPath = pathname.includes("/bookings");
        if (isBookingPath && method === "DELETE" && !isAdmin(session)) {
            return new Response(JSON.stringify({ error: "Solo administradores pueden eliminar reservas" }), {
                status: 403,
                headers: { "Content-Type": "application/json" }
            });
        }
    }

    return next();
});
