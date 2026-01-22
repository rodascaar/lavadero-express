import type { APIRoute } from 'astro';
import prisma from '../../lib/prisma';

export const GET: APIRoute = async ({ url }) => {
    try {
        const onlyCompleted = url.searchParams.get('completed') === 'true';
        const search = url.searchParams.get('search') || '';

        const where: any = {};

        if (onlyCompleted) {
            // Only customers with at least one completed booking
            where.bookings = {
                some: {
                    status: 'COMPLETED',
                },
            };
        }

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                {
                    vehicles: {
                        some: {
                            plate: { contains: search, mode: 'insensitive' },
                        },
                    },
                },
                { phone: { contains: search, mode: 'insensitive' } },
            ];
        }

        const customers = await prisma.customer.findMany({
            where,
            include: {
                vehicles: true,
                bookings: {
                    include: {
                        service: true,
                    },
                    orderBy: { date: 'desc' },
                },
                _count: {
                    select: {
                        bookings: {
                            where: { status: 'COMPLETED' },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Calculate total spent for each customer
        const customersWithStats = customers.map((customer) => {
            const completedBookings = customer.bookings.filter((b) => b.status === 'COMPLETED');
            const totalSpent = completedBookings.reduce((sum, b) => sum + Number(b.totalPrice), 0);
            const lastVisit = completedBookings[0]?.date || null;

            return {
                ...customer,
                totalSpent,
                lastVisit,
                completedCount: completedBookings.length,
            };
        });

        return new Response(JSON.stringify(customersWithStats), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Error fetching customers:', error);
        return new Response(JSON.stringify({ error: 'Error al obtener clientes' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
