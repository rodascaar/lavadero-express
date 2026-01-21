import type { APIRoute } from 'astro';
import prisma from '@/lib/prisma';

export const GET: APIRoute = async ({ url }) => {
    try {
        const dateStr = url.searchParams.get('date');

        if (!dateStr) {
            return new Response(JSON.stringify({ error: 'Fecha requerida' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Get settings for max slots per time
        const settings = await prisma.settings.findUnique({
            where: { id: 'main' },
        });
        const maxSlots = settings?.maxSlotsPerTime || 1;

        const date = new Date(dateStr);
        const nextDay = new Date(dateStr);
        nextDay.setDate(nextDay.getDate() + 1);

        // Get all bookings for the specified date that are not cancelled
        const bookings = await prisma.booking.findMany({
            where: {
                date: {
                    gte: date,
                    lt: nextDay,
                },
                status: {
                    not: 'CANCELLED',
                },
            },
            select: {
                time: true,
            },
        });

        // Count bookings per time slot
        const slotCounts: Record<string, number> = {};
        bookings.forEach((b) => {
            slotCounts[b.time] = (slotCounts[b.time] || 0) + 1;
        });

        // Find slots that are full (reached maxSlots)
        const unavailableSlots = Object.entries(slotCounts)
            .filter(([_, count]) => count >= maxSlots)
            .map(([time]) => time);

        return new Response(JSON.stringify({
            unavailableSlots,
            maxSlotsPerTime: maxSlots,
            slotCounts
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Error fetching availability:', error);
        return new Response(JSON.stringify({ error: 'Error al obtener disponibilidad' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
