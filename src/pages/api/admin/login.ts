import type { APIRoute } from 'astro';
import prisma from '@/lib/prisma';
import { verifyPassword, createSession, getSessionCookie } from '@/lib/auth';

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
            return new Response(JSON.stringify({ error: 'Email y contraseña requeridos' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Find user
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            return new Response(JSON.stringify({ error: 'Credenciales inválidas' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Check if locked
        const u = user as any;
        if (u.lockedUntil && u.lockedUntil > new Date()) {
            const minutesLeft = Math.ceil((u.lockedUntil.getTime() - Date.now()) / 60000);
            return new Response(JSON.stringify({
                error: `Cuenta bloqueada detectada. Intente de nuevo en ${minutesLeft} minutos.`
            }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Verify password
        const isValid = await verifyPassword(password, user.password);

        if (!isValid) {
            // Increment failed attempts
            const newAttempts = (user as any).failedLoginAttempts + 1;
            let lockedUntil = (user as any).lockedUntil;

            if (newAttempts >= 5) {
                lockedUntil = new Date(Date.now() + 30 * 60000); // 30 minutes lock
            }

            await prisma.user.update({
                where: { email },
                data: {
                    failedLoginAttempts: newAttempts,
                    lockedUntil: lockedUntil
                } as any
            });

            return new Response(JSON.stringify({ error: 'Credenciales inválidas' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Login successful - Reset failed attempts
        await prisma.user.update({
            where: { email },
            data: {
                failedLoginAttempts: 0,
                lockedUntil: null
            } as any
        });

        // Create session with dynamic role from DB
        const session = createSession(user.email, user.role);
        const cookieName = getSessionCookie();

        // Set HttpOnly cookie
        return new Response(JSON.stringify({
            success: true,
            user: { name: user.name, email: user.email, role: user.role }
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Set-Cookie': `${cookieName}=${session}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800`,
            },
        });
    } catch (error) {
        console.error('Error during login:', error);
        return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
