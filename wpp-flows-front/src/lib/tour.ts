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
            'Em menos de um minuto você conhece cada aba do menu lateral e o que fazer em cada uma. Use <b>Próximo</b> para avançar e <b>Anterior</b> para voltar.',
    },
    {
        id: 'service-mode',
        title: 'Delivery e Salão',
        description:
            'Alterne aqui entre o lado do <b>Delivery</b> (pedidos via WhatsApp/site) e o <b>Salão</b> (mesas com QR Code). Cada lado tem seu próprio menu, pedidos e relatórios — totalmente independentes.',
        side: 'right',
        align: 'start',
    },
];

const CLOSING: TourStep[] = [
    {
        id: 'notifications',
        title: 'Notificações em tempo real',
        description:
            'O sino acende com cada <b>pedido novo</b>, <b>pagamento confirmado</b> e quando o <b>bot fica offline</b>. Tudo em tempo real, sem precisar dar F5.',
        side: 'bottom',
        align: 'end',
    },
    {
        id: 'help',
        title: '🎯 Tour completo!',
        description:
            'Sempre que quiser rever este passeio, é só clicar no <b>?</b> aqui na barra superior. Bons pedidos!',
        side: 'bottom',
        align: 'end',
    },
];

const DELIVERY_STEPS: TourStep[] = [
    ...WELCOME,
    {
        id: 'nav-dashboard',
        route: ROUTES.dashboard,
        title: 'Dashboard',
        description:
            'Sua visão geral do dia: pedidos confirmados, faturamento da semana, conversas ativas e os itens mais pedidos. É a primeira tela após o login.',
        side: 'right',
        align: 'start',
    },
    {
        id: 'nav-bots',
        route: ROUTES.bots,
        title: 'Bots do WhatsApp',
        description:
            'Cadastre um bot e <b>conecte ao WhatsApp escaneando um QR Code</b>. Aqui você acompanha o status (Online/Offline) e pode regenerar a conexão se cair. É o bot que atende seus clientes.',
        side: 'right',
        align: 'start',
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
            'Organize as categorias e itens. Cada item tem foto, preço, descrição e adicionais opcionais. <b>Arraste categorias</b> para reordenar como elas aparecem para o cliente.',
        side: 'right',
        align: 'start',
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
            'Regras automáticas que o bot aplica sozinho: <b>desconto no Nº pedido</b> ("10% no 5º pedido"), <b>mensagem do dia</b> e <b>combos</b> ("2 pizzas + refri grátis").',
        side: 'right',
        align: 'start',
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
        id: 'nav-settings',
        route: ROUTES.settings,
        title: 'Configurações',
        description:
            'Dados da empresa, <b>integração com o Mercado Pago</b>, horário de funcionamento, taxa de entrega e preferências de notificação ficam aqui.',
        side: 'right',
        align: 'start',
    },
    ...CLOSING,
];

const LOCAL_STEPS: TourStep[] = [
    ...WELCOME,
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
            'Faturamento do salão, contas fechadas e relatórios diários. Cada fechamento de conta vira uma linha aqui.',
        side: 'right',
        align: 'start',
    },
    {
        id: 'nav-menu',
        route: ROUTES.localMenu,
        title: 'Cardápio do Salão',
        description:
            'Cardápio <b>independente</b> do delivery. Os pratos que aparecem para o cliente na mesa não precisam ser os mesmos do delivery — você decide.',
        side: 'right',
        align: 'start',
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
    ...CLOSING,
];

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
    const mode = useServiceModeStore.getState().mode;
    return mode === 'LOCAL' ? LOCAL_STEPS : DELIVERY_STEPS;
}

export function startTour(navigate: (path: string) => void): void {
    const steps = pickSteps();
    if (steps.length === 0) return;

    let activeIdx = 0;

    const goToStep = async (targetIdx: number, driverObj: Driver): Promise<void> => {
        const step = steps[targetIdx];
        if (!step) {
            driverObj.destroy();
            return;
        }

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
            try {
                globalThis.localStorage.setItem(TOUR_STORAGE_KEY, '1');
            } catch {
                /* noop — Safari private mode etc */
            }
        },
    });

    void goToStep(0, driverObj);
}

export function shouldAutoStartTour(): boolean {
    try {
        return globalThis.localStorage.getItem(TOUR_STORAGE_KEY) !== '1';
    } catch {
        return false;
    }
}
