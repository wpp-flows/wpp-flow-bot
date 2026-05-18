import 'dotenv/config';
import { auth } from '../src/infrastructure/auth/better-auth';
import { prisma } from '../src/infrastructure/database/client';
import type { OrderStatus, PaymentStatus } from '../src/generated/prisma/enums';

/**
 * PT-BR demo seed for a fictional pizzeria. Populates every section of the
 * platform with realistic data so the dashboard, orders, wallet, promotions
 * and menu pages all render against real records.
 *
 * Idempotent: each phase short-circuits if its anchor row already exists.
 *
 * Login depois do seed:
 *   email:    demo@famigliarossi.com.br
 *   password: pizzaria2026
 */

const DEMO = {
    user: {
        name: 'Marina Rossi',
        email: 'demo@famigliarossi.com.br',
        password: 'pizzaria2026',
    },
    organization: {
        name: 'Pizzaria Famiglia Rossi',
        slug: 'pizzaria-famiglia-rossi',
    },
    bot: {
        name: 'Atendimento Rossi',
        evolutionInstanceName: 'demo-rossi-main',
        phoneNumber: '+5511988887777',
    },
};

const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgo(n: number, hour = 12, minute = 0): Date {
    const d = new Date();
    d.setHours(hour, minute, 0, 0);
    return new Date(d.getTime() - n * DAY_MS);
}

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

async function ensureBot(organizationId: string) {
    const existing = await prisma.bot.findFirst({ where: { organizationId } });
    if (existing) return existing;
    return prisma.bot.create({
        data: {
            organizationId,
            name: DEMO.bot.name,
            evolutionInstanceName: DEMO.bot.evolutionInstanceName,
            phoneNumber: DEMO.bot.phoneNumber,
            status: 'ONLINE',
            lastConnectedAt: new Date(),
        },
    });
}

interface SeededMenu {
    categories: Record<'pizzas' | 'sobremesas' | 'bebidas', string>;
    items: Record<
        | 'mussarela'
        | 'calabresa'
        | 'portuguesa'
        | 'frangoCatupiry'
        | 'vegetariana'
        | 'brigadeirao'
        | 'tiramisu'
        | 'cocaLitro'
        | 'guaranaLitro'
        | 'sucoLaranja',
        string
    >;
}

async function seedMenu(organizationId: string): Promise<SeededMenu> {
    const existing = await prisma.menuCategory.findMany({
        where: { organizationId },
        include: { items: true },
    });
    if (existing.length > 0) {
        // Build lookup from existing rows so downstream seeders still find ids.
        const byName = new Map(existing.map((c) => [c.name, c]));
        const itemByName = new Map<string, string>();
        for (const cat of existing) {
            for (const it of cat.items) itemByName.set(it.name, it.id);
        }
        console.log('  · cardápio já existente — reaproveitando');
        return {
            categories: {
                pizzas: byName.get('Pizzas')!.id,
                sobremesas: byName.get('Sobremesas')!.id,
                bebidas: byName.get('Bebidas')!.id,
            },
            items: {
                mussarela: itemByName.get('Pizza Mussarela')!,
                calabresa: itemByName.get('Pizza Calabresa')!,
                portuguesa: itemByName.get('Pizza Portuguesa')!,
                frangoCatupiry: itemByName.get('Pizza Frango c/ Catupiry')!,
                vegetariana: itemByName.get('Pizza Vegetariana (Quinta)')!,
                brigadeirao: itemByName.get('Brigadeirão da Vovó')!,
                tiramisu: itemByName.get('Tiramisù da Casa (fim de semana)')!,
                cocaLitro: itemByName.get('Coca-Cola 2L')!,
                guaranaLitro: itemByName.get('Guaraná Antarctica 2L')!,
                sucoLaranja: itemByName.get('Suco de Laranja Natural 500ml')!,
            },
        };
    }

    const pizzas = await prisma.menuCategory.create({
        data: {
            organizationId,
            name: 'Pizzas',
            description: 'Massa artesanal, forneadas na hora',
            position: 0,
        },
    });
    const sobremesas = await prisma.menuCategory.create({
        data: {
            organizationId,
            name: 'Sobremesas',
            description: 'Para fechar com chave de ouro',
            position: 1,
        },
    });
    const bebidas = await prisma.menuCategory.create({
        data: {
            organizationId,
            name: 'Bebidas',
            description: 'Refrigerantes, sucos e água',
            position: 2,
        },
    });

    const created = await prisma.$transaction([
        prisma.menuItem.create({
            data: {
                organizationId,
                categoryId: pizzas.id,
                name: 'Pizza Mussarela',
                description: 'Molho da casa, mussarela e azeitonas',
                price: '49.90',
                position: 0,
            },
        }),
        prisma.menuItem.create({
            data: {
                organizationId,
                categoryId: pizzas.id,
                name: 'Pizza Calabresa',
                description: 'Calabresa fatiada, cebola e mussarela',
                price: '49.90',
                position: 1,
            },
        }),
        prisma.menuItem.create({
            data: {
                organizationId,
                categoryId: pizzas.id,
                name: 'Pizza Portuguesa',
                description: 'Presunto, ovo, cebola, ervilha e azeitona',
                price: '54.90',
                position: 2,
            },
        }),
        prisma.menuItem.create({
            data: {
                organizationId,
                categoryId: pizzas.id,
                name: 'Pizza Frango c/ Catupiry',
                description: 'Frango desfiado e catupiry cremoso',
                price: '54.90',
                position: 3,
            },
        }),
        prisma.menuItem.create({
            data: {
                organizationId,
                categoryId: pizzas.id,
                name: 'Pizza Vegetariana (Quinta)',
                description:
                    'Brócolis, palmito, milho, tomate cereja — disponível só nas quintas',
                price: '52.00',
                availableDaysOfWeek: [4], // só na quinta
                position: 4,
            },
        }),
        prisma.menuItem.create({
            data: {
                organizationId,
                categoryId: sobremesas.id,
                name: 'Brigadeirão da Vovó',
                description: 'Pedaço generoso, todo coberto de chocolate',
                price: '14.90',
                position: 0,
            },
        }),
        prisma.menuItem.create({
            data: {
                organizationId,
                categoryId: sobremesas.id,
                name: 'Tiramisù da Casa (fim de semana)',
                description:
                    'Disponível somente aos sábados e domingos. Receita da nonna.',
                price: '19.90',
                availableDaysOfWeek: [0, 6], // sábado e domingo
                position: 1,
            },
        }),
        prisma.menuItem.create({
            data: {
                organizationId,
                categoryId: bebidas.id,
                name: 'Coca-Cola 2L',
                description: 'Gelada, claro.',
                price: '14.00',
                position: 0,
            },
        }),
        prisma.menuItem.create({
            data: {
                organizationId,
                categoryId: bebidas.id,
                name: 'Guaraná Antarctica 2L',
                description: 'O nosso preferido.',
                price: '12.00',
                position: 1,
            },
        }),
        prisma.menuItem.create({
            data: {
                organizationId,
                categoryId: bebidas.id,
                name: 'Suco de Laranja Natural 500ml',
                description: 'Espremido na hora',
                price: '11.50',
                position: 2,
            },
        }),
    ]);

    console.log(`  · 3 categorias + ${created.length} itens (com disponibilidade por dia)`);
    return {
        categories: {
            pizzas: pizzas.id,
            sobremesas: sobremesas.id,
            bebidas: bebidas.id,
        },
        items: {
            mussarela: created[0]!.id,
            calabresa: created[1]!.id,
            portuguesa: created[2]!.id,
            frangoCatupiry: created[3]!.id,
            vegetariana: created[4]!.id,
            brigadeirao: created[5]!.id,
            tiramisu: created[6]!.id,
            cocaLitro: created[7]!.id,
            guaranaLitro: created[8]!.id,
            sucoLaranja: created[9]!.id,
        },
    };
}

async function seedFlow(organizationId: string, botId: string) {
    const existing = await prisma.flow.findFirst({ where: { organizationId } });
    if (existing) {
        console.log('  · fluxo já existente — reaproveitando');
        await prisma.bot.update({
            where: { id: botId },
            data: { flowId: existing.id },
        });
        return existing;
    }

    const flow = await prisma.flow.create({
        data: {
            organizationId,
            name: 'Atendimento e pedidos',
            version: 1,
            isActive: true,
            steps: {
                create: [
                    {
                        type: 'MESSAGE',
                        order: 0,
                        content:
                            'Olá, {{customer_name}}! 👋 Bem-vindo(a) à *Famiglia Rossi*. Sou o atendente virtual.',
                    },
                    {
                        type: 'MESSAGE',
                        order: 1,
                        content: 'Vou te mostrar o cardápio. Escolha uma categoria e depois um item.',
                    },
                    {
                        type: 'MENU',
                        order: 2,
                        content: 'Cardápio',
                    },
                    {
                        type: 'CONFIRMATION',
                        order: 3,
                        content:
                            'Tudo certo, {{customer_name}}? Seu pedido tem {{order_items}} totalizando {{order_total}}.',
                    },
                    {
                        type: 'INPUT',
                        order: 4,
                        content: 'Alguma observação no seu pedido? (Ex: sem cebola, ponto da massa, etc.)',
                        metadata: { fieldKey: 'observation' },
                    },
                    {
                        type: 'INPUT',
                        order: 5,
                        content: 'Para finalizar, qual o endereço de entrega?',
                        metadata: { fieldKey: 'address' },
                    },
                    {
                        type: 'PAYMENT',
                        order: 6,
                        content: 'Quase lá! Você pode pagar pelo link abaixo:',
                    },
                    {
                        type: 'MESSAGE',
                        order: 7,
                        content:
                            'Grazie mille! 🍕 Seu pedido foi confirmado. Avisaremos por aqui assim que sair pra entrega.',
                    },
                ],
            },
        },
        include: { steps: true },
    });

    await prisma.bot.update({
        where: { id: botId },
        data: { flowId: flow.id },
    });

    console.log(`  · fluxo "${flow.name}" v${flow.version} (ativo) com ${flow.steps.length} passos`);
    return flow;
}

async function seedPromotions(
    organizationId: string,
    menu: SeededMenu,
) {
    const existing = await prisma.promotion.count({ where: { organizationId } });
    if (existing > 0) {
        console.log('  · promoções já existentes — pulando');
        return;
    }

    await prisma.promotion.createMany({
        data: [
            {
                organizationId,
                kind: 'NTH_ORDER_DISCOUNT',
                name: 'Bônus do 5º pedido',
                isActive: true,
                nthOrder: 5,
                discountType: 'PERCENT',
                discountValue: '10',
                teaserOrderOffset: 2,
                teaserMessage:
                    'Este é o seu 3º pedido com a gente! 🎉 No 5º, você ganha 10% off automático.',
            },
            {
                organizationId,
                kind: 'DAILY_MESSAGE',
                name: 'Promoção de Terça',
                isActive: true,
                daysOfWeek: [2], // terça
                message:
                    '🍕 *Terça em dose dupla:* peça duas pizzas grandes e ganhe um refri 2L na faixa!',
            },
            {
                organizationId,
                kind: 'DAILY_MESSAGE',
                name: 'Item do dia: Calabresa',
                isActive: true,
                daysOfWeek: [], // todo dia
                message: 'Hoje a *Calabresa* tá com preço especial — aproveita! 🔥',
                featuredItemId: menu.items.calabresa,
                promotionalPrice: '39.90',
            },
        ],
    });

    console.log('  · 3 promoções (1 nth-order + 2 daily, sendo 1 com item destacado)');
}

interface SeededCustomer {
    id: string;
    name: string;
    phone: string;
    orderCount: number;
}

async function seedCustomers(organizationId: string): Promise<SeededCustomer[]> {
    const existing = await prisma.customer.findMany({ where: { organizationId } });
    if (existing.length > 0) {
        console.log('  · clientes já existentes — reaproveitando');
        return existing.map((c) => ({
            id: c.id,
            name: c.name,
            phone: c.phone,
            orderCount: c.orderCount,
        }));
    }

    const customers = await prisma.$transaction([
        prisma.customer.create({
            data: {
                organizationId,
                name: 'Ana Beatriz Santos',
                phone: '5511955554141',
                orderCount: 0, // será incrementado conforme criamos pedidos
            },
        }),
        prisma.customer.create({
            data: {
                organizationId,
                name: 'João Silva',
                phone: '5511955554242',
                orderCount: 0,
            },
        }),
        prisma.customer.create({
            data: {
                organizationId,
                name: 'Maria Costa',
                phone: '5511955554343',
                orderCount: 0,
            },
        }),
        prisma.customer.create({
            data: {
                organizationId,
                name: 'Pedro Almeida',
                phone: '5511955554444',
                orderCount: 0,
            },
        }),
        prisma.customer.create({
            data: {
                organizationId,
                name: 'Lucas Pereira',
                phone: '5511955554545',
                orderCount: 0,
            },
        }),
    ]);

    console.log(`  · ${customers.length} clientes`);
    return customers.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        orderCount: 0,
    }));
}

async function seedConversations(
    organizationId: string,
    botId: string,
    customers: SeededCustomer[],
) {
    const existing = await prisma.conversation.count({ where: { organizationId } });
    if (existing > 0) {
        console.log('  · conversas já existentes — pulando');
        return;
    }

    await prisma.$transaction(
        customers.map((customer, idx) =>
            prisma.conversation.create({
                data: {
                    organizationId,
                    botId,
                    customerId: customer.id,
                    remoteJid: `${customer.phone}@s.whatsapp.net`,
                    contactName: customer.name,
                    contactPhone: customer.phone,
                    // Mantemos algumas como OPEN para o KPI "conversas ativas" ter número.
                    status: idx < 3 ? 'OPEN' : 'CLOSED',
                    unreadCount: idx === 0 ? 2 : 0,
                    lastMessagePreview:
                        idx === 0
                            ? 'Boa noite, queria fazer um pedido…'
                            : 'Pedido entregue, obrigado!',
                    lastMessageAt: daysAgo(idx === 0 ? 0 : idx),
                    botActive: true,
                },
            }),
        ),
    );

    console.log(`  · ${customers.length} conversas (3 abertas, ${customers.length - 3} encerradas)`);
}

interface OrderTemplate {
    customerIndex: number;
    daysAgo: number;
    items: { itemId: string; name: string; price: string; qty: number }[];
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    observation?: string;
    address?: string;
    discount?: number;
    appliedPromotionIds?: string[];
}

async function seedOrders(
    organizationId: string,
    customers: SeededCustomer[],
    menu: SeededMenu,
) {
    const existing = await prisma.order.count({ where: { organizationId } });
    if (existing > 0) {
        console.log('  · pedidos já existentes — pulando');
        return [] as { id: string; total: string; daysAgo: number }[];
    }

    const conversations = await prisma.conversation.findMany({
        where: { organizationId },
        select: { id: true, customerId: true },
    });
    const convoByCustomer = new Map(
        conversations
            .filter((c): c is { id: string; customerId: string } => !!c.customerId)
            .map((c) => [c.customerId, c.id]),
    );

    const item = (key: keyof SeededMenu['items'], name: string, price: string, qty = 1) => ({
        itemId: menu.items[key],
        name,
        price,
        qty,
    });

    // Mix realista: hoje (0), ontem (1), 2..6 dias atrás (semana atual),
    // 7..13 dias atrás (semana anterior). Status variados para o donut.
    const templates: OrderTemplate[] = [
        // === HOJE ===
        {
            customerIndex: 0,
            daysAgo: 0,
            items: [
                item('calabresa', 'Pizza Calabresa', '49.90'),
                item('cocaLitro', 'Coca-Cola 2L', '14.00'),
            ],
            status: 'RECEIVED',
            paymentStatus: 'PAID',
            observation: 'Sem cebola, por favor.',
            address: 'Rua das Acácias, 240 — Vila Mariana',
        },
        {
            customerIndex: 1,
            daysAgo: 0,
            items: [
                item('portuguesa', 'Pizza Portuguesa', '54.90'),
                item('brigadeirao', 'Brigadeirão da Vovó', '14.90'),
            ],
            status: 'PREPARING',
            paymentStatus: 'PAID',
            address: 'Av. Paulista, 1500 — Bela Vista',
        },
        {
            customerIndex: 2,
            daysAgo: 0,
            items: [
                item('mussarela', 'Pizza Mussarela', '49.90', 2),
                item('guaranaLitro', 'Guaraná Antarctica 2L', '12.00'),
            ],
            status: 'OUT_FOR_DELIVERY',
            paymentStatus: 'PAID',
            address: 'Rua Augusta, 880 — Consolação',
        },
        // === ONTEM ===
        {
            customerIndex: 3,
            daysAgo: 1,
            items: [item('frangoCatupiry', 'Pizza Frango c/ Catupiry', '54.90')],
            status: 'DELIVERED',
            paymentStatus: 'PAID',
            address: 'Rua Heitor Penteado, 322',
        },
        {
            customerIndex: 0,
            daysAgo: 1,
            items: [
                item('calabresa', 'Pizza Calabresa', '49.90'),
                item('sucoLaranja', 'Suco de Laranja Natural 500ml', '11.50'),
            ],
            status: 'DELIVERED',
            paymentStatus: 'PAID',
        },
        {
            customerIndex: 4,
            daysAgo: 1,
            items: [item('portuguesa', 'Pizza Portuguesa', '54.90')],
            status: 'CANCELED',
            paymentStatus: 'FAILED',
            observation: 'Cliente desistiu antes do pagamento.',
        },
        // === 2 a 6 dias atrás ===
        {
            customerIndex: 0,
            daysAgo: 2,
            items: [
                item('mussarela', 'Pizza Mussarela', '49.90'),
                item('mussarela', 'Pizza Mussarela', '49.90'),
            ],
            status: 'DELIVERED',
            paymentStatus: 'PAID',
        },
        {
            customerIndex: 1,
            daysAgo: 3,
            items: [
                item('calabresa', 'Pizza Calabresa', '49.90'),
                item('cocaLitro', 'Coca-Cola 2L', '14.00'),
            ],
            status: 'DELIVERED',
            paymentStatus: 'PAID',
        },
        {
            customerIndex: 2,
            daysAgo: 3,
            items: [item('frangoCatupiry', 'Pizza Frango c/ Catupiry', '54.90')],
            status: 'DELIVERED',
            paymentStatus: 'PAID',
        },
        {
            customerIndex: 0,
            daysAgo: 4,
            items: [
                item('calabresa', 'Pizza Calabresa', '49.90'),
                item('brigadeirao', 'Brigadeirão da Vovó', '14.90'),
            ],
            status: 'DELIVERED',
            paymentStatus: 'PAID',
        },
        {
            customerIndex: 2,
            daysAgo: 5,
            items: [item('portuguesa', 'Pizza Portuguesa', '54.90')],
            status: 'DELIVERED',
            paymentStatus: 'PAID',
        },
        {
            customerIndex: 3,
            daysAgo: 6,
            items: [
                item('mussarela', 'Pizza Mussarela', '49.90'),
                item('cocaLitro', 'Coca-Cola 2L', '14.00'),
            ],
            status: 'DELIVERED',
            paymentStatus: 'PAID',
        },
        // === Semana anterior (7..13 dias) ===
        {
            customerIndex: 0,
            daysAgo: 8,
            items: [item('calabresa', 'Pizza Calabresa', '49.90')],
            status: 'DELIVERED',
            paymentStatus: 'PAID',
        },
        {
            customerIndex: 1,
            daysAgo: 9,
            items: [
                item('portuguesa', 'Pizza Portuguesa', '54.90'),
                item('guaranaLitro', 'Guaraná Antarctica 2L', '12.00'),
            ],
            status: 'DELIVERED',
            paymentStatus: 'PAID',
        },
        {
            customerIndex: 2,
            daysAgo: 10,
            items: [item('frangoCatupiry', 'Pizza Frango c/ Catupiry', '54.90')],
            status: 'DELIVERED',
            paymentStatus: 'PAID',
        },
        {
            customerIndex: 0,
            daysAgo: 12,
            items: [item('mussarela', 'Pizza Mussarela', '49.90')],
            status: 'DELIVERED',
            paymentStatus: 'PAID',
        },
        {
            customerIndex: 3,
            daysAgo: 13,
            items: [
                item('calabresa', 'Pizza Calabresa', '49.90'),
                item('cocaLitro', 'Coca-Cola 2L', '14.00'),
            ],
            status: 'DELIVERED',
            paymentStatus: 'PAID',
        },
    ];

    const created: { id: string; total: string; daysAgo: number }[] = [];
    let sequence = 0;
    for (const tpl of templates) {
        const customer = customers[tpl.customerIndex]!;
        const subtotal = tpl.items.reduce(
            (sum, it) => sum + Number.parseFloat(it.price) * it.qty,
            0,
        );
        const discount = tpl.discount ?? 0;
        const total = subtotal - discount;
        sequence += 1;
        const createdAt = daysAgo(tpl.daysAgo, 19, 30);
        const order = await prisma.order.create({
            data: {
                organizationId,
                customerId: customer.id,
                conversationId: convoByCustomer.get(customer.id) ?? null,
                sequence,
                items: tpl.items,
                subtotal: subtotal.toFixed(2),
                discount: discount > 0 ? discount.toFixed(2) : null,
                total: total.toFixed(2),
                status: tpl.status,
                observation: tpl.observation ?? null,
                address: tpl.address ?? null,
                paymentStatus: tpl.paymentStatus,
                paymentProvider: tpl.paymentStatus === 'PAID' ? 'MERCADO_PAGO' : null,
                receiptUrl:
                    tpl.paymentStatus === 'PAID'
                        ? `https://www.mercadopago.com.br/payments/demo-${sequence}`
                        : null,
                appliedPromotionIds:
                    tpl.appliedPromotionIds && tpl.appliedPromotionIds.length > 0
                        ? (tpl.appliedPromotionIds as unknown as object)
                        : undefined,
                createdAt,
                updatedAt: createdAt,
            },
        });
        created.push({ id: order.id, total: total.toFixed(2), daysAgo: tpl.daysAgo });
    }

    // Atualiza orderCount de cada cliente para refletir o total semeado.
    const countsByCustomer = new Map<string, number>();
    for (const tpl of templates) {
        const c = customers[tpl.customerIndex]!;
        countsByCustomer.set(c.id, (countsByCustomer.get(c.id) ?? 0) + 1);
    }
    await Promise.all(
        Array.from(countsByCustomer.entries()).map(([customerId, count]) =>
            prisma.customer.update({
                where: { id: customerId },
                data: { orderCount: count },
            }),
        ),
    );

    console.log(`  · ${templates.length} pedidos (variados em status, pagamento e datas)`);
    return created;
}

async function seedWallet(
    organizationId: string,
    paidOrders: { id: string; total: string; daysAgo: number }[],
) {
    const existing = await prisma.wallet.findUnique({ where: { organizationId } });
    if (existing) {
        console.log('  · carteira já existente — pulando');
        return;
    }

    const wallet = await prisma.wallet.create({
        data: { organizationId },
    });

    // Crédito para cada pedido pago. Subimos o saldo via update após criar as txs.
    const credits = paidOrders.map((o) => ({
        walletId: wallet.id,
        kind: 'CREDIT' as const,
        amount: o.total,
        status: 'COMPLETED' as const,
        orderId: o.id,
        note: `Pedido #${String(paidOrders.indexOf(o) + 1).padStart(4, '0')}`,
        createdAt: daysAgo(o.daysAgo, 19, 35),
        updatedAt: daysAgo(o.daysAgo, 19, 35),
    }));
    if (credits.length > 0) {
        await prisma.walletTransaction.createMany({ data: credits });
    }

    const totalCredited = credits.reduce(
        (sum, c) => sum + Number.parseFloat(c.amount),
        0,
    );

    // Um saque pendente que deixa parte do saldo retido (testa o fluxo de PENDING).
    const withdrawalAmount = Math.min(150, totalCredited * 0.3);
    if (withdrawalAmount > 5) {
        await prisma.walletTransaction.create({
            data: {
                walletId: wallet.id,
                kind: 'WITHDRAWAL',
                amount: withdrawalAmount.toFixed(2),
                status: 'PENDING',
                note: 'Saque solicitado via PIX',
                createdAt: daysAgo(0, 10),
                updatedAt: daysAgo(0, 10),
            },
        });
    }

    // Saldo = créditos − saques pendentes (que já retêm o valor).
    const balance = totalCredited - withdrawalAmount;
    await prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: balance.toFixed(2) },
    });

    console.log(
        `  · carteira com saldo R$ ${balance.toFixed(2)} (${credits.length} créditos, 1 saque pendente)`,
    );
}

async function main() {
    console.log('🌱 Populando seed PT-BR…\n');

    console.log('• usuário');
    const userId = await ensureUser();
    console.log(`  · ${DEMO.user.email}`);

    console.log('• organização');
    const org = await ensureOrganization(userId);
    console.log(`  · ${org.name} (${org.slug})`);

    console.log('• bot');
    const bot = await ensureBot(org.id);
    console.log(`  · ${bot.name} (${bot.evolutionInstanceName})`);

    console.log('• cardápio');
    const menu = await seedMenu(org.id);

    console.log('• fluxo de atendimento');
    await seedFlow(org.id, bot.id);

    console.log('• promoções');
    await seedPromotions(org.id, menu);

    console.log('• clientes');
    const customers = await seedCustomers(org.id);

    console.log('• conversas');
    await seedConversations(org.id, bot.id, customers);

    console.log('• pedidos');
    const orders = await seedOrders(org.id, customers, menu);

    console.log('• carteira');
    const paidOrders = orders.filter((_, idx) => idx % 1 === 0); // todos os pedidos pagos do array já são PAID
    await seedWallet(org.id, paidOrders);

    console.log('\n✅ Tudo pronto. Faça login com:');
    console.log(`   email:    ${DEMO.user.email}`);
    console.log(`   senha:    ${DEMO.user.password}`);
}

main()
    .catch((err) => {
        console.error('❌ Seed falhou:', err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
