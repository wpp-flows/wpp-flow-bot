import 'dotenv/config';
import { auth } from '../src/infrastructure/auth/better-auth';
import { prisma } from '../src/infrastructure/database/client';

const DEMO = {
    user: {
        name: 'Marina Bellini',
        email: 'demo@bellini.com',
        password: 'mesademo2026',
    },
    organization: {
        name: 'Trattoria Bellini',
        slug: 'trattoria-bellini',
    },
    bot: {
        name: 'Bellini Main',
        evolutionInstanceName: 'demo-bellini-main',
        phoneNumber: '+15551234567',
    },
};

async function ensureUser(): Promise<string> {
    const existing = await prisma.user.findUnique({
        where: { email: DEMO.user.email },
    });
    if (existing) return existing.id;

    const result = await auth.api.signUpEmail({
        body: {
            name: DEMO.user.name,
            email: DEMO.user.email,
            password: DEMO.user.password,
        },
    });
    return result.user.id;
}

async function ensureOrganization(ownerId: string) {
    const existing = await prisma.organization.findUnique({ where: { ownerId } });
    if (existing) return existing;
    return prisma.organization.create({
        data: { ...DEMO.organization, ownerId },
    });
}

async function seedMenu(organizationId: string) {
    const existing = await prisma.menuCategory.count({ where: { organizationId } });
    if (existing > 0) {
        console.log('  · menu already seeded — skipping');
        return;
    }

    const pizzas = await prisma.menuCategory.create({
        data: { organizationId, name: 'Pizzas', description: 'Wood-fired classics', position: 0 },
    });
    const pastas = await prisma.menuCategory.create({
        data: { organizationId, name: 'Pastas', description: 'Hand-rolled fresh daily', position: 1 },
    });
    const drinks = await prisma.menuCategory.create({
        data: { organizationId, name: 'Drinks', description: 'Wines, sodas, water', position: 2 },
    });

    await prisma.menuItem.createMany({
        data: [
            {
                organizationId,
                categoryId: pizzas.id,
                name: 'Margherita',
                description: 'Tomato, fior di latte, basil',
                price: '14.50',
                available: true,
                position: 0,
            },
            {
                organizationId,
                categoryId: pizzas.id,
                name: 'Diavola',
                description: 'Tomato, mozzarella, spicy salami',
                price: '17.00',
                available: true,
                position: 1,
            },
            {
                organizationId,
                categoryId: pizzas.id,
                name: 'Quattro Formaggi',
                description: 'Mozzarella, gorgonzola, parmesan, taleggio',
                price: '18.50',
                available: true,
                position: 2,
            },
            {
                organizationId,
                categoryId: pastas.id,
                name: 'Carbonara',
                description: 'Guanciale, pecorino, egg yolk, black pepper',
                price: '16.00',
                available: true,
                position: 0,
            },
            {
                organizationId,
                categoryId: pastas.id,
                name: 'Cacio e Pepe',
                description: 'Tonnarelli, pecorino romano, black pepper',
                price: '15.00',
                available: true,
                position: 1,
            },
            {
                organizationId,
                categoryId: drinks.id,
                name: 'Chianti (glass)',
                description: 'Tuscan red, fruity and balanced',
                price: '8.00',
                available: true,
                position: 0,
            },
            {
                organizationId,
                categoryId: drinks.id,
                name: 'San Pellegrino 500ml',
                description: 'Sparkling mineral water',
                price: '4.00',
                available: true,
                position: 1,
            },
        ],
    });

    console.log(`  · 3 categories + 7 items`);
}

async function seedFlow(organizationId: string) {
    const existing = await prisma.flow.findFirst({ where: { organizationId } });
    if (existing) {
        console.log('  · flow already seeded — skipping');
        return existing;
    }

    const flow = await prisma.flow.create({
        data: {
            organizationId,
            name: 'Order intake',
            version: 1,
            isActive: true,
            steps: {
                create: [
                    {
                        type: 'MESSAGE',
                        order: 0,
                        content:
                            'Ciao! 👋 Welcome to *Trattoria Bellini*. I\'m the order assistant. Ready to start?',
                    },
                    {
                        type: 'MENU',
                        order: 1,
                        content: 'What would you like to browse first?',
                        metadata: {
                            options: [
                                { id: 'opt_1', label: 'Pizzas', value: 'pizzas' },
                                { id: 'opt_2', label: 'Pastas', value: 'pastas' },
                                { id: 'opt_3', label: 'Drinks', value: 'drinks' },
                            ],
                        },
                    },
                    {
                        type: 'MESSAGE',
                        order: 2,
                        content: 'Great pick! Reply with the item name and quantity (e.g. "2 Margherita").',
                    },
                    {
                        type: 'CONFIRMATION',
                        order: 3,
                        content: 'Here\'s your order summary. Should I send it to the kitchen?',
                    },
                    {
                        type: 'PAYMENT',
                        order: 4,
                        content: 'Last step — pick how you\'d like to pay.',
                        metadata: { paymentLink: 'https://pay.example.com/checkout/demo' },
                    },
                    {
                        type: 'MESSAGE',
                        order: 5,
                        content: 'Grazie! 🍝 Your order is confirmed. We\'ll text you when it\'s ready.',
                    },
                ],
            },
        },
        include: { steps: true },
    });

    console.log(`  · flow "${flow.name}" v${flow.version} (active) with ${flow.steps.length} steps`);
    return flow;
}

async function seedBot(organizationId: string, flowId: string) {
    const existing = await prisma.bot.findUnique({
        where: { evolutionInstanceName: DEMO.bot.evolutionInstanceName },
    });
    if (existing) {
        console.log('  · bot already seeded — skipping');
        return existing;
    }

    const bot = await prisma.bot.create({
        data: {
            organizationId,
            name: DEMO.bot.name,
            evolutionInstanceName: DEMO.bot.evolutionInstanceName,
            phoneNumber: DEMO.bot.phoneNumber,
            status: 'OFFLINE',
            flowId,
        },
    });
    console.log(`  · bot "${bot.name}" (status=OFFLINE, no Evolution instance)`);
    return bot;
}

async function seedConversations(organizationId: string, botId: string) {
    const existing = await prisma.conversation.count({ where: { organizationId } });
    if (existing > 0) {
        console.log('  · conversations already seeded — skipping');
        return;
    }

    const contacts = [
        { name: 'Lucia Rinaldi', phone: '5511999990001' },
        { name: 'Thomas Becker', phone: '5511999990002' },
        { name: 'Kenji Watanabe', phone: '5511999990003' },
    ];

    for (const c of contacts) {
        const conv = await prisma.conversation.create({
            data: {
                organizationId,
                botId,
                remoteJid: `${c.phone}@s.whatsapp.net`,
                contactName: c.name,
                contactPhone: c.phone,
                status: 'OPEN',
                botActive: true,
                lastMessagePreview: 'Hi there!',
            },
        });

        await prisma.message.createMany({
            data: [
                {
                    conversationId: conv.id,
                    author: 'USER',
                    content: 'Hi there!',
                    status: 'DELIVERED',
                },
                {
                    conversationId: conv.id,
                    author: 'BOT',
                    content: 'Ciao! 👋 Welcome to Trattoria Bellini.',
                    status: 'READ',
                },
            ],
        });
    }
    console.log(`  · ${contacts.length} conversations with sample messages`);
}

async function main() {
    console.log('🌱 Seeding…');

    console.log('• user');
    const userId = await ensureUser();
    console.log(`  · ${DEMO.user.email}`);

    console.log('• organization');
    const org = await ensureOrganization(userId);
    console.log(`  · ${org.name} (${org.slug})`);

    console.log('• menu');
    await seedMenu(org.id);

    console.log('• flow');
    const flow = await seedFlow(org.id);

    console.log('• bot');
    const bot = await seedBot(org.id, flow.id);

    console.log('• conversations');
    await seedConversations(org.id, bot.id);

    console.log('\n✅ Done. Login with:');
    console.log(`   email:    ${DEMO.user.email}`);
    console.log(`   password: ${DEMO.user.password}`);
}

main()
    .catch((err) => {
        console.error('❌ Seed failed:', err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
