import type { APIRoute } from 'astro';
import prisma from '@/lib/prisma';

export const GET: APIRoute = async () => {
    try {
        let settings = await prisma.settings.findUnique({
            where: { id: 'main' },
        });

        // Create default settings if not exists
        if (!settings) {
            settings = await prisma.settings.create({
                data: { id: 'main' },
            });
        }

        return new Response(JSON.stringify(settings), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Error fetching settings:', error);
        return new Response(JSON.stringify({ error: 'Error al obtener configuración' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

export const PUT: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const {
            businessName,
            whatsappNumber,
            openTime,
            closeTime,
            slotDuration,
            maxSlotsPerTime,
            workingDays,
            address,
            welcomeMessage,
            currency,
            heroImageUrl,
            bookingBufferMinutes,
            timezone,
        } = body;

        const settings = await prisma.settings.upsert({
            where: { id: 'main' },
            update: {
                businessName,
                whatsappNumber,
                openTime,
                closeTime,
                slotDuration,
                maxSlotsPerTime,
                workingDays,
                address,
                welcomeMessage,
                currency,
                heroImageUrl,
                bookingBufferMinutes: parseInt(bookingBufferMinutes),
                timezone,
            } as any,
            create: {
                id: 'main',
                businessName,
                whatsappNumber,
                openTime,
                closeTime,
                slotDuration,
                maxSlotsPerTime,
                workingDays,
                address,
                welcomeMessage,
                currency,
                heroImageUrl,
                bookingBufferMinutes: parseInt(bookingBufferMinutes),
                timezone,
            } as any,
        });

        return new Response(JSON.stringify(settings), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Error updating settings:', error);
        return new Response(JSON.stringify({ error: 'Error al actualizar configuración' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
