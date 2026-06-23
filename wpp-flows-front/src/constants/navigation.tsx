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
  tourId?: string;
}

export interface NavGroup {
  title?: string;
  items: NavItem[];
}

const DELIVERY_NAV: NavGroup[] = [
  {
    title: 'Delivery',
    items: [
      { label: 'Dashboard', to: ROUTES.dashboard, icon: LayoutDashboard, tourId: 'nav-dashboard' },
      { label: 'Bots', to: ROUTES.bots, icon: Bot, tourId: 'nav-bots' },
      { label: 'Conversas', to: ROUTES.conversations, icon: MessagesSquare, tourId: 'nav-chats' },
      { label: 'Pedidos', to: ROUTES.orders, icon: Receipt, tourId: 'nav-orders' },
      { label: 'Carteira', to: ROUTES.wallet, icon: Wallet, tourId: 'nav-wallet' },
    ],
  },
  {
    title: 'Configuração',
    items: [
      { label: 'Menu', to: ROUTES.menu, icon: UtensilsCrossed, tourId: 'nav-menu' },
      { label: 'Visualizar cardápio', to: ROUTES.menuPreview, icon: Smartphone, tourId: 'nav-menu-preview' },
      { label: 'Promoções', to: ROUTES.promotions, icon: TicketPercent, tourId: 'nav-promotions' },
      { label: 'Cupons', to: ROUTES.coupons, icon: BadgePercent, tourId: 'nav-coupons' },
      { label: 'Mensagens', to: ROUTES.messages, icon: MessageSquareText, tourId: 'nav-messages' },
      { label: 'Flow Builder', to: ROUTES.flows, icon: Workflow, tourId: 'nav-flows' },
      { label: 'Configurações', to: ROUTES.settings, icon: Settings, tourId: 'nav-settings' },
    ],
  },
];

const LOCAL_NAV: NavGroup[] = [
  {
    title: 'Salão',
    items: [
      { label: 'Mesas', to: ROUTES.localTables, icon: TableIcon, tourId: 'nav-tables' },
      { label: 'Pedidos', to: ROUTES.localOrders, icon: ClipboardList, tourId: 'nav-orders' },
      { label: 'Carteira', to: ROUTES.localWallet, icon: Wallet, tourId: 'nav-wallet' },
    ],
  },
  {
    title: 'Configuração',
    items: [
      { label: 'Menu', to: ROUTES.localMenu, icon: UtensilsCrossed, tourId: 'nav-menu' },
      { label: 'Configurações', to: ROUTES.localSettings, icon: Settings, tourId: 'nav-settings' },
    ],
  },
];

export function navGroupsFor(mode: ServiceMode): NavGroup[] {
  return mode === 'LOCAL' ? LOCAL_NAV : DELIVERY_NAV;
}

export const NAV_GROUPS: NavGroup[] = DELIVERY_NAV;
