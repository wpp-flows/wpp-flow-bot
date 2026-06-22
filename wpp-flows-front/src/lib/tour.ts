import { driver, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { ROUTES } from '@/constants/app';
import { useServiceModeStore } from '@/stores/serviceModeStore';

const TOUR_STORAGE_KEY = 'mesa.tour.completed.v1';

type Side = 'top' | 'right' | 'bottom' | 'left';
type Align = 'start' | 'center' | 'end';

interface TourStep {
    id?: string;
    route?: string;
    title: string;
    description: string;
    side?: Side;
    align?: Align;
}

const WELCOME: TourStep[] = [
    {
        title: '👋 Boas-vindas ao Mesa!',
        description:
            'Tour completo da plataforma — vamos passar por cada aba primeiro do <b>Delivery</b> e depois do <b>Salão</b>, abrindo cada uma e mostrando o que dá pra fazer. Use <b>Próximo</b> para avançar e <b>Anterior</b> para voltar.',
    },
    {
        id: 'service-mode',
        title: 'Delivery e Salão',
        description:
            'Aqui você alterna entre os dois lados da plataforma. <b>Delivery</b> = pedidos via WhatsApp/site. <b>Salão</b> = mesas com QR Code. Cada lado tem seu cardápio, pedidos, carteira e configurações próprias.',
        side: 'right',
        align: 'start',
    },
];

const CLOSING: TourStep[] = [
    {
        id: 'notifications',
        title: 'Notificações em tempo real',
        description:
            'O sino acende com cada <b>pedido novo</b>, <b>pagamento confirmado</b> e quando o <b>bot fica offline</b>. Tudo via SSE — sem precisar dar F5.',
        side: 'bottom',
        align: 'end',
    },
    {
        id: 'help',
        title: '🎯 Tour concluído!',
        description:
            'Sempre que quiser rever este passeio, clique no <b>?</b> aqui na barra superior. Bons pedidos!',
        side: 'bottom',
        align: 'end',
    },
];

const DELIVERY_INTRO: TourStep = {
    title: '🛵 Lado do Delivery',
    description:
        'Começamos pelo Delivery. Vamos passar por cada aba do menu lateral, abrir e mostrar as principais ações. Use <b>Próximo</b> para avançar.',
};

const LOCAL_INTRO: TourStep = {
    title: '🪑 Lado do Salão',
    description:
        'Agora vamos pro Salão. Mesmo formato — uma aba por vez, com as ações principais destacadas. Esse lado é independente do Delivery: cardápio, pedidos e relatórios separados.',
};

const DELIVERY_STEPS: TourStep[] = [
    ...WELCOME,
    DELIVERY_INTRO,

    // Dashboard
    {
        id: 'nav-dashboard',
        route: ROUTES.dashboard,
        title: 'Dashboard',
        description:
            'Visão geral do dia: <b>pedidos confirmados</b>, <b>faturamento da semana</b>, <b>conversas ativas</b> e os <b>itens mais pedidos</b>. É a primeira tela após o login.',
        side: 'right',
        align: 'start',
    },

    // Bots
    {
        id: 'nav-bots',
        route: ROUTES.bots,
        title: 'Bots do WhatsApp',
        description:
            'Aqui você cadastra e gerencia os bots que atendem seus clientes no WhatsApp. Cada bot conecta via <b>QR Code</b> e exibe um status: Online / Offline.',
        side: 'right',
        align: 'start',
    },
    {
        id: 'page-actions',
        route: ROUTES.bots,
        title: 'Novo bot',
        description:
            'Cadastre um bot informando nome e número. Depois é só escanear o <b>QR Code</b> com o WhatsApp do estabelecimento. Se a conexão cair, dá pra regenerar a partir do card.',
        side: 'bottom',
        align: 'end',
    },

    {
        id: 'nav-chats',
        route: ROUTES.conversations,
        title: 'Conversas',
        description:
            'Todos os atendimentos do WhatsApp que o bot está gerenciando. Filtre por status, busque por nome/número e, quando precisar, <b>pause o bot</b> para responder você mesmo.',
        side: 'right',
        align: 'start',
    },

    {
        id: 'nav-orders',
        route: ROUTES.orders,
        title: 'Pedidos',
        description:
            'Quadro Kanban com os pedidos confirmados de hoje. <b>Arraste um card</b> entre as colunas (Recebido → Preparando → Saiu para entrega → Entregue) para avançar o status. O cliente é avisado pelo WhatsApp a cada mudança.',
        side: 'right',
        align: 'start',
    },

    {
        id: 'nav-wallet',
        route: ROUTES.wallet,
        title: 'Carteira',
        description:
            'Saldo a sacar, histórico de transações e <b>relatórios diários</b>. Clique numa linha do relatório para abrir uma prévia em PDF do dia.',
        side: 'right',
        align: 'start',
    },

    {
        id: 'nav-menu',
        route: ROUTES.menu,
        title: 'Cardápio do Delivery',
        description:
            'Organize categorias e itens do delivery. Cada item tem foto, preço, descrição, <b>grupos de opções</b> (estilo iFood — para combos e personalização) e suporte a <b>preço promocional</b> (riscado + valor atual).',
        side: 'right',
        align: 'start',
    },
    {
        id: 'page-actions',
        route: ROUTES.menu,
        title: 'Nova categoria / Novo item',
        description:
            'Use estes botões para criar categorias e itens. Dentro do item você configura <b>grupos de opções obrigatórios ou opcionais</b> (ex: "Escolha o sanduíche", "Adicionais até 3"). É assim que você monta combos sem precisar de uma promoção separada.',
        side: 'bottom',
        align: 'end',
    },

    {
        id: 'nav-menu-preview',
        route: ROUTES.menuPreview,
        title: 'Visualizar cardápio',
        description:
            'Pré-visualização do cardápio público — exatamente como o cliente vê quando abre o link no celular. Útil pra testar antes de divulgar.',
        side: 'right',
        align: 'start',
    },

    {
        id: 'nav-promotions',
        route: ROUTES.promotions,
        title: 'Promoções',
        description:
            'Regras automáticas que o bot aplica sozinho: <b>desconto no Nº pedido</b> ("10% no 5º pedido") e <b>mensagem do dia</b>. Para combos use os <b>grupos de opções</b> dentro de um item no cardápio.',
        side: 'right',
        align: 'start',
    },
    {
        id: 'page-actions',
        route: ROUTES.promotions,
        title: 'Nova promoção',
        description:
            'Crie uma promoção do tipo <b>Nº pedido</b> (com teaser opcional antes do qualificante) ou <b>Mensagem do dia</b> com item destacado e preço promocional opcional.',
        side: 'bottom',
        align: 'end',
    },

    {
        id: 'nav-coupons',
        route: ROUTES.coupons,
        title: 'Cupons',
        description:
            'Códigos de desconto que o cliente <b>digita no checkout</b>. Defina valor (% ou R$ fixo), limite de uso e data de validade.',
        side: 'right',
        align: 'start',
    },
    {
        id: 'page-actions',
        route: ROUTES.coupons,
        title: 'Novo cupom',
        description:
            'Configure código, tipo de desconto e validade. Cupons inativos ou esgotados não são aceitos no checkout.',
        side: 'bottom',
        align: 'end',
    },

    {
        id: 'nav-messages',
        route: ROUTES.messages,
        title: 'Mensagens automáticas',
        description:
            'Textos que o bot envia em momentos-chave: <b>fora do horário</b>, <b>pagamento confirmado</b>, <b>pagamento cancelado</b> e <b>timeout de pagamento</b>. Personalize cada um.',
        side: 'right',
        align: 'start',
    },

    {
        id: 'nav-flows',
        route: ROUTES.flows,
        title: 'Flow Builder',
        description:
            'Editor visual do fluxo de conversa do bot — defina a sequência de mensagens, perguntas e decisões que o bot segue ao atender o cliente.',
        side: 'right',
        align: 'start',
    },
    {
        id: 'page-actions',
        route: ROUTES.flows,
        title: 'Novo fluxo',
        description:
            'Crie um novo fluxo do zero ou versione um existente. Cada versão fica salva — dá pra voltar pra uma anterior se precisar.',
        side: 'bottom',
        align: 'end',
    },

    // Settings
    {
        id: 'nav-settings',
        route: ROUTES.settings,
        title: 'Configurações',
        description:
            'Dados da empresa, <b>integração com o Mercado Pago</b>, <b>horário de funcionamento</b>, <b>taxa de entrega</b> e preferências de notificação ficam aqui.',
        side: 'right',
        align: 'start',
    },
];

const LOCAL_STEPS: TourStep[] = [
    LOCAL_INTRO,

    {
        id: 'nav-tables',
        route: ROUTES.localTables,
        title: 'Mesas',
        description:
            'Cada mesa tem um <b>QR Code</b> que o cliente escaneia para pedir pelo próprio celular. Cadastre, imprima o QR e, quando o cliente terminar, clique em <b>Fechar conta</b>.',
        side: 'right',
        align: 'start',
    },
    {
        id: 'page-actions',
        route: ROUTES.localTables,
        title: 'Nova mesa',
        description:
            'Crie uma mesa com um número/identificação. A plataforma gera o QR Code automaticamente — é só imprimir e colar na mesa.',
        side: 'bottom',
        align: 'end',
    },

    {
        id: 'nav-orders',
        route: ROUTES.localOrders,
        title: 'Pedidos do Salão',
        description:
            'Kanban com os pedidos das mesas que ainda não fecharam a conta. Arraste o card pelas colunas: Recebido → Preparando → Servido. Quando a conta fecha, o pedido sai do quadro e vai pro relatório.',
        side: 'right',
        align: 'start',
    },

    {
        id: 'nav-wallet',
        route: ROUTES.localWallet,
        title: 'Carteira do Salão',
        description:
            'Faturamento do salão, contas fechadas e <b>relatórios diários</b>. Cada fechamento de conta vira uma linha aqui.',
        side: 'right',
        align: 'start',
    },

    {
        id: 'nav-menu',
        route: ROUTES.localMenu,
        title: 'Cardápio do Salão',
        description:
            'Cardápio <b>independente</b> do delivery — os pratos do salão podem ser totalmente diferentes. Mesma estrutura: categorias, itens, grupos de opções e preço promocional.',
        side: 'right',
        align: 'start',
    },
    {
        id: 'page-actions',
        route: ROUTES.localMenu,
        title: 'Nova categoria / Novo item',
        description:
            'Crie categorias e itens exclusivos do salão. Os <b>grupos de opções</b> funcionam igual ao delivery — use-os para combos e personalização.',
        side: 'bottom',
        align: 'end',
    },

    {
        id: 'nav-settings',
        route: ROUTES.localSettings,
        title: 'Configurações do Salão',
        description:
            'Horário de funcionamento do salão e mensagem que aparece para o cliente quando ele escaneia o QR fora do horário.',
        side: 'right',
        align: 'start',
    },
];

const FULL_STEPS: TourStep[] = [...DELIVERY_STEPS, ...LOCAL_STEPS, ...CLOSING];

function waitForElement(selector: string, timeoutMs = 3000): Promise<boolean> {
    return new Promise((resolve) => {
        if (document.querySelector(selector)) {
            resolve(true);
            return;
        }
        const deadline = Date.now() + timeoutMs;
        const tick = () => {
            if (document.querySelector(selector)) {
                resolve(true);
                return;
            }
            if (Date.now() >= deadline) {
                resolve(false);
                return;
            }
            setTimeout(tick, 50);
        };
        setTimeout(tick, 50);
    });
}

function pickSteps(): TourStep[] {
    return FULL_STEPS;
}

let activeDriver: Driver | null = null;

export function startTour(navigate: (path: string) => void): void {
    if (activeDriver) return;
    const steps = pickSteps();
    if (steps.length === 0) return;

    const serviceMode = useServiceModeStore.getState();

    let activeIdx = 0;

    const syncMode = (step: TourStep): void => {
        const route = step.route ?? '';
        const wantsLocal = route.startsWith('/local');
        const currentMode = useServiceModeStore.getState().mode;
        if (wantsLocal && currentMode !== 'LOCAL') {
            serviceMode.setMode('LOCAL');
        } else if (!wantsLocal && route && currentMode !== 'DELIVERY') {
            serviceMode.setMode('DELIVERY');
        }
    };

    const goToStep = async (targetIdx: number, driverObj: Driver): Promise<void> => {
        const step = steps[targetIdx];
        if (!step) {
            driverObj.destroy();
            return;
        }

        syncMode(step);

        if (step.route && globalThis.location.pathname !== step.route) {
            navigate(step.route);
        }
        if (step.id) {
            await waitForElement(`[data-tour="${step.id}"]`);
        }
        activeIdx = targetIdx;
        if (targetIdx === 0) {
            driverObj.drive(0);
        } else {
            driverObj.moveTo(targetIdx);
        }
    };

    const driverObj = driver({
        showProgress: true,
        smoothScroll: true,
        stagePadding: 8,
        allowClose: true,
        overlayColor: 'rgba(15, 23, 42, 0.55)',
        popoverClass: 'mesa-tour',
        progressText: 'Passo {{current}} de {{total}}',
        nextBtnText: 'Próximo →',
        prevBtnText: '← Anterior',
        doneBtnText: 'Concluir',
        steps: steps.map((s) => ({
            element: s.id ? `[data-tour="${s.id}"]` : undefined,
            popover: {
                title: s.title,
                description: s.description,
                ...(s.side ? { side: s.side } : {}),
                ...(s.align ? { align: s.align } : {}),
            },
        })),
        onNextClick: () => {
            void goToStep(activeIdx + 1, driverObj);
        },
        onPrevClick: () => {
            void goToStep(activeIdx - 1, driverObj);
        },
        onDestroyed: () => {
            activeDriver = null;
            try {
                globalThis.localStorage.setItem(TOUR_STORAGE_KEY, '1');
            } catch {
                /* noop — Safari private mode etc */
            }
        },
    });

    activeDriver = driverObj;
    void goToStep(0, driverObj);
}

export function shouldAutoStartTour(): boolean {
    try {
        return globalThis.localStorage.getItem(TOUR_STORAGE_KEY) !== '1';
    } catch {
        return false;
    }
}
