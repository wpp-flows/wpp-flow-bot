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
  type LucideIcon,
} from 'lucide-react';
import { ROUTES } from './app';

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

export const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Principal',
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
