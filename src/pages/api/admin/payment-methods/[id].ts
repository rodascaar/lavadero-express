import type { APIRoute } from 'astro';
import prisma from '@/lib/prisma';

export const PUT: APIRoute = async ({ params, request }) => {
    try {
        const { id } = params;
        const { name, active } = await request.json();

        const method = await (prisma as any).paymentMethod.update({
            where: { id },
            data: { name, active }
        });

        return new Response(JSON.stringify(method), { status: 200 });
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Error updating payment method' }), { status: 500 });
    }
};

export const DELETE: APIRoute = async ({ params }) => {
    try {
        const { id } = params;
        await (prisma as any).paymentMethod.delete({
            where: { id }
        });
        return new Response(null, { status: 204 });
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Error deleting payment method' }), { status: 500 });
    }
};
