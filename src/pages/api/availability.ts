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

        // Get settings
        const settings = await prisma.settings.findUnique({
            where: { id: 'main' },
        });
        const maxSlots = (settings as any)?.maxSlotsPerTime || 1;
        const bufferMinutes = (settings as any)?.bookingBufferMinutes || 10;
        const slotDuration = (settings as any)?.slotDuration || 30;
        const openTime = settings?.openTime || '08:00';
        const closeTime = settings?.closeTime || '18:00';

        const [startHour, startMinute] = openTime.split(':').map(Number);
        const [endHour, endMinute] = closeTime.split(':').map(Number);

        const date = new Date(dateStr + 'T00:00:00Z');
        const nextDay = new Date(dateStr + 'T00:00:00Z');
        nextDay.setUTCDate(nextDay.getUTCDate() + 1);

        // Get all bookings for the specified date
        const bookings = await prisma.booking.findMany({
            where: {
                date: { gte: date, lt: nextDay },
                status: { not: 'CANCELLED' },
            },
            select: { time: true },
        });

        // Count bookings per time slot
        const slotCounts: Record<string, number> = {};
        bookings.forEach((b) => {
            slotCounts[b.time] = (slotCounts[b.time] || 0) + 1;
        });

        // Generate theoretical slots using UTC to avoid local timezone shifts
        const slots = [];
        const currentSlotTime = new Date(dateStr + 'T00:00:00Z');
        currentSlotTime.setUTCHours(startHour, startMinute, 0, 0);

        const endSlotTime = new Date(dateStr + 'T00:00:00Z');
        endSlotTime.setUTCHours(endHour, endMinute, 0, 0);

        const timezone = (settings as any)?.timezone || 'America/Asuncion';
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });

        const parts = formatter.formatToParts(now);
        const getPart = (type: string) => parts.find(p => p.type === type)?.value;
        const bizYear = getPart('year');
        const bizMonth = getPart('month');
        const bizDay = getPart('day');
        const bizHour = Number(getPart('hour'));
        const bizMinute = Number(getPart('minute'));

        const bizTodayStr = `${bizYear}-${bizMonth}-${bizDay}`;
        const isToday = dateStr === bizTodayStr;
        const currentMinutes = bizHour * 60 + bizMinute;

        while (currentSlotTime < endSlotTime) {
            const timeStr = [
                String(currentSlotTime.getUTCHours()).padStart(2, '0'),
                String(currentSlotTime.getUTCMinutes()).padStart(2, '0')
            ].join(':');

            const [h, m] = timeStr.split(':').map(Number);
            const slotMinutes = h * 60 + m;
            const count = slotCounts[timeStr] || 0;

            let status = 'AVAILABLE';
            let reason = '';

            if (isToday) {
                if (slotMinutes < currentMinutes) {
                    status = 'PAST';
                    reason = 'FINALIZADO';
                } else if ((slotMinutes - currentMinutes) <= bufferMinutes) {
                    status = 'EXPIRED';
                    reason = 'CERRADO';
                }
            }

            if (status === 'AVAILABLE' && count >= maxSlots) {
                status = 'FULL';
                reason = 'COMPLETO';
            }

            slots.push({
                time: timeStr,
                status,
                reason,
                count,
                available: status === 'AVAILABLE'
            });

            currentSlotTime.setUTCMinutes(currentSlotTime.getUTCMinutes() + slotDuration);
        }

        return new Response(JSON.stringify({
            slots,
            maxSlotsPerTime: maxSlots,
            date: dateStr
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
