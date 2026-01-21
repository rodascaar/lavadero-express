import type { APIRoute } from 'astro';
import prisma from '../../lib/prisma';

export const GET: APIRoute = async () => {
    try {
        const services = await prisma.service.findMany({
            orderBy: { sortOrder: 'asc' },
        });

        return new Response(JSON.stringify(services), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Error fetching services:', error);
        return new Response(JSON.stringify({ error: 'Error al obtener servicios' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const { name, description, price, duration, active = true } = body;

        if (!name || !price || !duration) {
            return new Response(JSON.stringify({ error: 'Nombre, precio y duración requeridos' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Get max sort order
        const maxSort = await prisma.service.aggregate({
            _max: { sortOrder: true },
        });

        const service = await prisma.service.create({
            data: {
                name,
                description,
                price,
                duration,
                active,
                sortOrder: (maxSort._max.sortOrder || 0) + 1,
            },
        });

        return new Response(JSON.stringify(service), {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Error creating service:', error);
        return new Response(JSON.stringify({ error: 'Error al crear servicio' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

export const PATCH: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const { id, ...updateData } = body;

        if (!id) {
            return new Response(JSON.stringify({ error: 'ID requerido' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const service = await prisma.service.update({
            where: { id },
            data: updateData,
        });

        return new Response(JSON.stringify(service), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Error updating service:', error);
        return new Response(JSON.stringify({ error: 'Error al actualizar servicio' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

export const DELETE: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const { id } = body;

        if (!id) {
            return new Response(JSON.stringify({ error: 'ID requerido' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        await prisma.service.delete({
            where: { id },
        });

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Error deleting service:', error);
        return new Response(JSON.stringify({ error: 'Error al eliminar servicio' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
