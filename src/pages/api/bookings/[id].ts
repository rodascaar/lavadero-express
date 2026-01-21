import type { APIRoute } from 'astro';
import prisma from '@/lib/prisma';

export const GET: APIRoute = async ({ params }) => {
    try {
        const { id } = params;

        const booking = await prisma.booking.findUnique({
            where: { id },
            include: {
                customer: true,
                service: true,
            },
        });

        if (!booking) {
            return new Response(JSON.stringify({ error: 'Reserva no encontrada' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify(booking), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Error fetching booking:', error);
        return new Response(JSON.stringify({ error: 'Error al obtener reserva' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

export const PATCH: APIRoute = async ({ params, request }) => {
    try {
        const { id } = params;
        const body = await request.json();
        const { status, notes } = body;

        const updateData: any = {};
        if (status) updateData.status = status;
        if (notes !== undefined) updateData.notes = notes;

        const booking = await prisma.booking.update({
            where: { id },
            data: updateData,
            include: {
                customer: true,
                service: true,
            },
        });

        return new Response(JSON.stringify(booking), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Error updating booking:', error);
        return new Response(JSON.stringify({ error: 'Error al actualizar reserva' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

export const DELETE: APIRoute = async ({ params }) => {
    try {
        const { id } = params;

        await prisma.booking.delete({
            where: { id },
        });

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Error deleting booking:', error);
        return new Response(JSON.stringify({ error: 'Error al eliminar reserva' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
