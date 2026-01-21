import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/auth';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Create default settings
    await prisma.settings.upsert({
        where: { id: 'main' },
        update: {},
        create: {
            id: 'main',
            businessName: 'AutoSpa Premium',
            whatsappNumber: '+595991234567',
            openTime: '08:00',
            closeTime: '18:00',
            slotDuration: 30,
            maxSlotsPerTime: 2,
            workingDays: '1,2,3,4,5,6',
            address: 'Av. Mariscal López 1234, Asunción',
            welcomeMessage: '¡Gracias por reservar con AutoSpa! Te esperamos.',
            currency: 'PYG',
        },
    });
    console.log('✅ Settings created');

    // Create admin user
    const hashedPassword = await hashPassword('admin123');
    await prisma.user.upsert({
        where: { email: 'admin@lavadero.com' },
        update: {},
        create: {
            email: 'admin@lavadero.com',
            password: hashedPassword,
            name: 'Administrador',
            role: 'ADMIN',
        },
    });
    console.log('✅ Admin user created');

    // Create services
    const services = [
        {
            name: 'Lavado Express',
            description: 'Lavado exterior rápido con secado a mano. Ideal para mantenimiento semanal.',
            price: 50000,
            duration: 20,
            sortOrder: 1,
        },
        {
            name: 'Lavado Completo',
            description: 'Lavado exterior e interior con aspirado, limpieza de tablero y cristales.',
            price: 100000,
            duration: 45,
            sortOrder: 2,
        },
        {
            name: 'Lavado Premium',
            description: 'Servicio completo con encerado, acondicionador de cuero y aromatizante premium.',
            price: 180000,
            duration: 90,
            sortOrder: 3,
        },
        {
            name: 'Limpieza de Tapizados',
            description: 'Limpieza profunda de asientos y alfombras con productos especializados.',
            price: 150000,
            duration: 120,
            sortOrder: 4,
        },
        {
            name: 'Detailing Completo',
            description: 'Restauración integral: pulido, descontaminación, protección cerámica y más.',
            price: 500000,
            duration: 240,
            sortOrder: 5,
        },
    ];

    for (const service of services) {
        await prisma.service.upsert({
            where: { id: service.name.toLowerCase().replace(/\s+/g, '-') },
            update: service,
            create: {
                id: service.name.toLowerCase().replace(/\s+/g, '-'),
                ...service,
            },
        });
    }
    console.log('✅ Services created');

    console.log('🎉 Seeding completed!');
}

main()
    .catch((e) => {
        console.error('❌ Error seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
