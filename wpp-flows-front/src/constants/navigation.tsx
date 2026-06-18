import {
  LayoutDashboard,
  Bot,
  UtensilsCrossed,
  Workflow,
  MessagesSquare,
  MessageSquareText,
  Receipt,
  Wallet,
  TicketPercent,
  BadgePercent,
  Smartphone,
  Settings,
  Table as TableIcon,
  ClipboardList,
  type LucideIcon,
} from 'lucide-react';
import { ROUTES } from './app';
import type { ServiceMode } from '@/stores/serviceModeStore';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  badge?: string;
}

export interface NavGroup {
  title?: string;
  items: NavItem[];
}

const DELIVERY_NAV: NavGroup[] = [
  {
    title: 'Delivery',
    items: [
      { label: 'Dashboard', to: ROUTES.dashboard, icon: LayoutDashboard },
      { label: 'Bots', to: ROUTES.bots, icon: Bot },
      { label: 'Conversas', to: ROUTES.conversations, icon: MessagesSquare },
      { label: 'Pedidos', to: ROUTES.orders, icon: Receipt },
      { label: 'Carteira', to: ROUTES.wallet, icon: Wallet },
    ],
  },
  {
    title: 'Configuração',
    items: [
      { label: 'Menu', to: ROUTES.menu, icon: UtensilsCrossed },
      { label: 'Visualizar cardápio', to: ROUTES.menuPreview, icon: Smartphone },
      { label: 'Promoções', to: ROUTES.promotions, icon: TicketPercent },
      { label: 'Cupons', to: ROUTES.coupons, icon: BadgePercent },
      { label: 'Mensagens', to: ROUTES.messages, icon: MessageSquareText },
      { label: 'Flow Builder', to: ROUTES.flows, icon: Workflow },
      { label: 'Configurações', to: ROUTES.settings, icon: Settings },
    ],
  },
];

const LOCAL_NAV: NavGroup[] = [
  {
    title: 'Salão',
    items: [
      { label: 'Mesas', to: ROUTES.localTables, icon: TableIcon },
      { label: 'Pedidos', to: ROUTES.localOrders, icon: ClipboardList },
      { label: 'Carteira', to: ROUTES.localWallet, icon: Wallet },
    ],
  },
  {
    title: 'Configuração',
    items: [
      { label: 'Menu', to: ROUTES.localMenu, icon: UtensilsCrossed },
      { label: 'Configurações', to: ROUTES.localSettings, icon: Settings },
    ],
  },
];

export function navGroupsFor(mode: ServiceMode): NavGroup[] {
  return mode === 'LOCAL' ? LOCAL_NAV : DELIVERY_NAV;
}

export const NAV_GROUPS: NavGroup[] = DELIVERY_NAV;
