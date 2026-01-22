import type { APIRoute } from 'astro';
import prisma from '@/lib/prisma';

export const GET: APIRoute = async () => {
    try {
        let methods = await (prisma as any).paymentMethod.findMany({
            where: { active: true },
            orderBy: { createdAt: 'asc' }
        });

        // Seed defaults if empty
        if (methods.length === 0) {
            const defaults = [
                { name: 'Efectivo' },
                { name: 'Transferencia' },
                { name: 'QR' },
                { name: 'Link de Pago' }
            ];

            await (prisma as any).paymentMethod.createMany({
                data: defaults
            });

            methods = await (prisma as any).paymentMethod.findMany({
                where: { active: true },
                orderBy: { createdAt: 'asc' }
            });
        }

        return new Response(JSON.stringify(methods), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Error fetching payment methods' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};

export const POST: APIRoute = async ({ request }) => {
    try {
        const { name } = await request.json();
        const method = await (prisma as any).paymentMethod.create({
            data: { name }
        });
        return new Response(JSON.stringify(method), { status: 201 });
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Error creating payment method' }), { status: 500 });
    }
};
