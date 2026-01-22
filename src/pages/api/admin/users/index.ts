import type { APIRoute } from 'astro';
import prisma from '@/lib/prisma';
import { hashPassword, isAdmin } from '@/lib/auth';

export const GET: APIRoute = async ({ locals }) => {
    try {
        // Double check permissions even if middleware handles it
        if (!isAdmin(locals.user)) {
            return new Response(JSON.stringify({ error: 'No tienes permisos de administrador' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                failedLoginAttempts: true,
                lockedUntil: true,
                createdAt: true,
            } as any,
            orderBy: { createdAt: 'desc' }
        });

        return new Response(JSON.stringify(users), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Error al obtener usuarios' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

export const POST: APIRoute = async ({ request, locals }) => {
    try {
        if (!isAdmin(locals.user)) {
            return new Response(JSON.stringify({ error: 'No autorizado' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const body = await request.json();
        const { action } = body;

        if (action === 'create') {
            const { name, email, password, role } = body;

            if (!name || !email || !password || !role) {
                return new Response(JSON.stringify({ error: 'Todos los campos son obligatorios' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            const existingUser = await prisma.user.findUnique({ where: { email } });
            if (existingUser) {
                return new Response(JSON.stringify({ error: 'El email ya está registrado' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            const hashedPassword = await hashPassword(password);
            const newUser = await prisma.user.create({
                data: {
                    name,
                    email,
                    password: hashedPassword,
                    role: role,
                }
            });

            return new Response(JSON.stringify({
                success: true,
                user: { id: newUser.id, email: newUser.email }
            }), {
                status: 201,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        if (action === 'unlock') {
            const { targetEmail, newPassword } = body;

            if (!targetEmail || !newPassword) {
                return new Response(JSON.stringify({ error: 'Email y nueva contraseña requeridos' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            const hashedPassword = await hashPassword(newPassword);
            await prisma.user.update({
                where: { email: targetEmail },
                data: {
                    failedLoginAttempts: 0,
                    lockedUntil: null,
                    password: hashedPassword
                } as any
            });

            return new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify({ error: 'Acción no válida' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Error in user management:', error);
        return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
