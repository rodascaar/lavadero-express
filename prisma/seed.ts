import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting idempotent seeding...');

    // 1. Core Settings (id: "main")
    const defaultSettings = {
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
        timezone: 'America/Asuncion'
    };

    await prisma.settings.upsert({
        where: { id: 'main' },
        update: {}, // Don't overwrite existing settings if they exist
        create: {
            id: 'main',
            ...defaultSettings
        },
    });
    console.log('✅ Settings ensured');

    // 2. Admin User (admin@autospa.com)
    const adminEmail = 'admin@autospa.com';
    const existingAdmin = await prisma.user.findUnique({
        where: { email: adminEmail }
    });

    if (!existingAdmin) {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await prisma.user.create({
            data: {
                email: adminEmail,
                password: hashedPassword,
                name: 'Administrador Senior',
                role: 'ADMIN',
            },
        });
        console.log('✅ Admin user created (admin@autospa.com)');
    } else {
        console.log('ℹ️ Admin user already exists');
    }

    // 3. Essential Services
    const initialServices = [
        { name: 'Lavado Express', price: 50000, duration: 20 },
        { name: 'Lavado Completo', price: 100000, duration: 45 },
        { name: 'Lavado Premium', price: 180000, duration: 90 }
    ];

    for (const service of initialServices) {
        const serviceId = service.name.toLowerCase().replace(/\s+/g, '-');
        await prisma.service.upsert({
            where: { id: serviceId },
            update: {}, // Don't modify existing services
            create: {
                id: serviceId,
                name: service.name,
                price: service.price,
                duration: service.duration,
                sortOrder: initialServices.indexOf(service) + 1,
                active: true
            }
        });
    }
    console.log('✅ Essential services ensured');

    console.log('🎉 Seeding completed successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
