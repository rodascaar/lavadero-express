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

        // Verify password
        const isValid = await verifyPassword(password, user.password);

        if (!isValid) {
            return new Response(JSON.stringify({ error: 'Credenciales inválidas' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Create session
        const session = createSession(user.email);
        const cookieName = getSessionCookie();

        return new Response(JSON.stringify({ success: true, user: { name: user.name, email: user.email } }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Set-Cookie': `${cookieName}=${session}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`,
            },
        });
    } catch (error) {
        console.error('Error during login:', error);
        return new Response(JSON.stringify({ error: 'Error al iniciar sesión' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
