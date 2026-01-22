import type { APIRoute } from 'astro';
import prisma from '@/lib/prisma';
import { generateReferenceCode } from '@/lib/whatsapp';

export const GET: APIRoute = async ({ url }) => {
    try {
        const status = url.searchParams.get('status');
        const date = url.searchParams.get('date');
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const offset = parseInt(url.searchParams.get('offset') || '0');

        const where: any = {};

        if (status) {
            where.status = status;
        }

        if (date) {
            const startDate = new Date(date);
            const endDate = new Date(date);
            endDate.setDate(endDate.getDate() + 1);
            where.date = {
                gte: startDate,
                lt: endDate,
            };
        }

        const [bookings, total] = await Promise.all([
            prisma.booking.findMany({
                where,
                include: {
                    customer: true,
                    vehicle: true,
                    service: true,
                },
                orderBy: [{ date: 'desc' }, { time: 'asc' }],
                take: limit,
                skip: offset,
            }),
            prisma.booking.count({ where }),
        ]);

        return new Response(JSON.stringify({ bookings, total }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Error fetching bookings:', error);
        return new Response(JSON.stringify({ error: 'Error al obtener reservas' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const { date, time, serviceId, paymentMethod, customer, notes } = body;

        // Validate required fields
        if (!date || !time || !serviceId || !paymentMethod || !customer) {
            return new Response(JSON.stringify({ error: 'Faltan campos requeridos' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const result = await prisma.$transaction(async (tx) => {
            // Get settings for max slots
            const settings = await tx.settings.findUnique({
                where: { id: 'main' },
            });
            const maxSlots = settings?.maxSlotsPerTime || 1;

            // Check if slot is still available
            const bookingDate = new Date(date);
            const nextDay = new Date(date);
            nextDay.setDate(nextDay.getDate() + 1);

            const existingBookings = await tx.booking.count({
                where: {
                    date: {
                        gte: bookingDate,
                        lt: nextDay,
                    },
                    time,
                    status: {
                        not: 'CANCELLED',
                    },
                },
            });

            if (existingBookings >= maxSlots) {
                throw new Error('SLOT_FULL');
            }

            // Get service to calculate price
            const service = await tx.service.findUnique({
                where: { id: serviceId },
            });

            if (!service) {
                throw new Error('SERVICE_NOT_FOUND');
            }

            // Find or create customer by PHONE
            let existingCustomer = await tx.customer.findUnique({
                where: { phone: customer.phone },
            });

            if (!existingCustomer) {
                existingCustomer = await tx.customer.create({
                    data: {
                        name: customer.name,
                        phone: customer.phone,
                    },
                });
            } else {
                // Update customer info
                existingCustomer = await tx.customer.update({
                    where: { phone: customer.phone },
                    data: {
                        name: customer.name,
                    },
                });
            }

            // Find or create VEHICLE by PLATE
            let vehicle = await tx.vehicle.findUnique({
                where: { plate: customer.plate },
            });

            if (!vehicle) {
                vehicle = await tx.vehicle.create({
                    data: {
                        plate: customer.plate,
                        model: customer.model,
                        customerId: existingCustomer.id,
                    },
                });
            } else {
                // Update vehicle info and ensure correct owner
                vehicle = await tx.vehicle.update({
                    where: { plate: customer.plate },
                    data: {
                        model: customer.model,
                        customerId: existingCustomer.id,
                    },
                });
            }

            // Generate reference code
            const referenceCode = body.referenceCode || generateReferenceCode();

            // Create booking
            return await tx.booking.create({
                data: {
                    referenceCode,
                    date: new Date(date),
                    time,
                    status: 'PENDING',
                    paymentMethod,
                    notes,
                    totalPrice: service.price,
                    customerId: existingCustomer.id,
                    vehicleId: vehicle.id,
                    serviceId: service.id,
                },
                include: {
                    customer: true,
                    vehicle: true,
                    service: true,
                },
            });
        });

        return new Response(JSON.stringify(result), {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error: any) {
        console.error('Error creating booking:', error);

        if (error.message === 'SLOT_FULL') {
            return new Response(JSON.stringify({ error: 'Este horario ya no está disponible' }), {
                status: 409,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        if (error.message === 'SERVICE_NOT_FOUND') {
            return new Response(JSON.stringify({ error: 'Servicio no encontrado' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify({ error: 'Error al crear reserva' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
