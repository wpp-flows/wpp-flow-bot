import 'dotenv/config';
import { auth } from '../src/infrastructure/auth/better-auth';
import { prisma } from '../src/infrastructure/database/client';

/**
 * PT-BR demo seed — covers everything an operator configures **before** taking
 * a first order: user + org (with the new delivery / payment-message fields),
 * bot (with working hours), full menu, attendance flow, promotions, sample
 * coupons, and a small customer book.
 *
 * Intentionally does NOT seed orders, conversations, or wallet data — those
 * accumulate naturally from real customer activity.
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
        deliveryFee: '8.00',
        paymentTimeoutMinutes: 15,
        paymentCancelMessage:
            'Que pena, {{customer_name}}! Seu pedido foi cancelado. Quando quiser voltar, é só chamar por aqui 🙌',
        paymentTimeoutMessage:
            'O tempo para pagamento expirou e seu pedido foi cancelado automaticamente. Sem problemas — é só fazer um novo quando quiser!',
        paymentReceivedMessage:
            '✅ Pagamento confirmado, {{customer_name}}! Já estamos preparando seu pedido com carinho. Assim que sair pra entrega, te avisamos por aqui 🍕',
        /** Segunda a sábado (1..6) — fechado aos domingos. */
        workingDaysOfWeek: [1, 2, 3, 4, 5, 6],
        workingStartTime: '18:00',
        workingEndTime: '23:30',
        outOfHoursMessage:
            'Estamos fechados no momento 😴. Trabalhamos {{days_of_work}} das {{from}} às {{to}}. Volte logo!',
        botCooldownMinutes: 60,
    },
    bot: {
        name: 'Atendimento Rossi',
        evolutionInstanceName: 'demo-rossi-main',
        phoneNumber: '+5511988887777',
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
    const orgData = {
        deliveryFee: DEMO.organization.deliveryFee,
        paymentTimeoutMinutes: DEMO.organization.paymentTimeoutMinutes,
        paymentCancelMessage: DEMO.organization.paymentCancelMessage,
        paymentTimeoutMessage: DEMO.organization.paymentTimeoutMessage,
        paymentReceivedMessage: DEMO.organization.paymentReceivedMessage,
        workingDaysOfWeek: DEMO.organization.workingDaysOfWeek,
        workingStartTime: DEMO.organization.workingStartTime,
        workingEndTime: DEMO.organization.workingEndTime,
        outOfHoursMessage: DEMO.organization.outOfHoursMessage,
        botCooldownMinutes: DEMO.organization.botCooldownMinutes,
    };
    const existing = await prisma.organization.findUnique({ where: { ownerId } });
    if (existing) {
        // Refresh org-level settings on re-runs so the seed reflects the latest
        // features without needing a wipe.
        return prisma.organization.update({
            where: { id: existing.id },
            data: orgData,
        });
    }
    return prisma.organization.create({
        data: {
            ownerId,
            name: DEMO.organization.name,
            slug: DEMO.organization.slug,
            ...orgData,
        },
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
                availableDaysOfWeek: [4],
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
                availableDaysOfWeek: [0, 6],
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

    // MESSAGE-only flow. The bot greets, points the customer at the digital
    // menu URL, and ends. Ordering / confirmation / payment all happen on the
    // web checkout (`/r/<slug>`), not in WhatsApp.
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
                            'Olá, {{customer_name}}! 👋 Bem-vindo(a) à *{{restaurant_name}}*. Sou o atendente virtual.',
                    },
                    {
                        type: 'MESSAGE',
                        order: 1,
                        content:
                            'Para fazer seu pedido, é só abrir nosso cardápio digital: {{menu_url}}\n\nPor lá você escolhe os itens, adiciona observações e paga pelo Mercado Pago. Qualquer dúvida, é só responder por aqui que um atendente humano te ajuda 🙌',
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
                daysOfWeek: [2],
                message:
                    '🍕 *Terça em dose dupla:* peça duas pizzas grandes e ganhe um refri 2L na faixa!',
            },
            {
                organizationId,
                kind: 'DAILY_MESSAGE',
                name: 'Item do dia: Calabresa',
                isActive: true,
                daysOfWeek: [],
                message: 'Hoje a *Calabresa* tá com preço especial — aproveita! 🔥',
                featuredItemId: menu.items.calabresa,
                promotionalPrice: '39.90',
            },
        ],
    });

    console.log('  · 3 promoções (1 nth-order + 2 daily, sendo 1 com item destacado)');
}

async function seedCoupons(organizationId: string) {
    const existing = await prisma.coupon.count({ where: { organizationId } });
    if (existing > 0) {
        console.log('  · cupons já existentes — pulando');
        return;
    }

    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    await prisma.coupon.createMany({
        data: [
            {
                organizationId,
                code: 'BEMVINDO10',
                discountType: 'PERCENT',
                discountValue: '10',
                isActive: true,
                description: 'Desconto de boas-vindas — 10% off no primeiro pedido.',
                // Sem validade — sempre válido.
            },
            {
                organizationId,
                code: 'SEXTA15',
                discountType: 'PERCENT',
                discountValue: '15',
                isActive: true,
                validFrom: now,
                validUntil: in30Days,
                description: 'Promoção da sexta-feira — 15% off por 30 dias.',
            },
            {
                organizationId,
                code: 'ENTREGA8',
                discountType: 'FIXED',
                discountValue: '8.00',
                isActive: true,
                description: 'Pague a taxa de entrega por nossa conta (R$ 8 off).',
            },
            {
                organizationId,
                code: 'JUNHO2025',
                discountType: 'PERCENT',
                discountValue: '20',
                isActive: false,
                validFrom: lastMonth,
                validUntil: yesterday,
                description: 'Cupom expirado — exemplo de cupom inativo.',
            },
        ],
    });

    console.log('  · 4 cupons (1 sempre válido, 1 com janela, 1 fixo, 1 expirado/inativo)');
}

async function seedCustomers(organizationId: string) {
    const existing = await prisma.customer.count({ where: { organizationId } });
    if (existing > 0) {
        console.log('  · clientes já existentes — pulando');
        return;
    }

    await prisma.customer.createMany({
        data: [
            { organizationId, name: 'Ana Beatriz Santos', phone: '5511955554141' },
            { organizationId, name: 'João Silva', phone: '5511955554242' },
            { organizationId, name: 'Maria Costa', phone: '5511955554343' },
            { organizationId, name: 'Pedro Almeida', phone: '5511955554444' },
            { organizationId, name: 'Lucas Pereira', phone: '5511955554545' },
        ],
    });

    console.log('  · 5 clientes (sem histórico de pedidos)');
}

async function main() {
    console.log('🌱 Populando seed PT-BR…\n');

    console.log('• usuário');
    const userId = await ensureUser();
    console.log(`  · ${DEMO.user.email}`);

    console.log('• organização');
    const org = await ensureOrganization(userId);
    console.log(`  · ${org.name} (${org.slug})`);
    console.log(`  · taxa de entrega: R$ ${org.deliveryFee} · timeout: ${org.paymentTimeoutMinutes} min`);
    console.log(`  · horário: ${org.workingStartTime}–${org.workingEndTime}, dias ${org.workingDaysOfWeek.join(',')}`);

    console.log('• bot');
    const bot = await ensureBot(org.id);
    console.log(`  · ${bot.name} (${bot.evolutionInstanceName})`);

    console.log('• cardápio');
    const menu = await seedMenu(org.id);

    console.log('• fluxo de atendimento');
    await seedFlow(org.id, bot.id);

    console.log('• promoções');
    await seedPromotions(org.id, menu);

    console.log('• cupons');
    await seedCoupons(org.id);

    console.log('• clientes');
    await seedCustomers(org.id);

    console.log('\n✅ Tudo pronto. Faça login com:');
    console.log(`   email:    ${DEMO.user.email}`);
    console.log(`   senha:    ${DEMO.user.password}`);
    console.log(`\n   Cardápio público: /r/${org.slug}`);
}

main()
    .catch((err) => {
        console.error('❌ Seed falhou:', err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
