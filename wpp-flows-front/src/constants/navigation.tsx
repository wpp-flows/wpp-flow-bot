import {
  LayoutDashboard,
  Bot,
  UtensilsCrossed,
  Workflow,
  MessagesSquare,
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
    title: 'Workspace',
    items: [
      { label: 'Dashboard', to: ROUTES.dashboard, icon: LayoutDashboard },
      { label: 'Bots', to: ROUTES.bots, icon: Bot },
      { label: 'Conversations', to: ROUTES.conversations, icon: MessagesSquare },
    ],
  },
  {
    title: 'Configuration',
    items: [
      { label: 'Menu', to: ROUTES.menu, icon: UtensilsCrossed },
      { label: 'Flow Builder', to: ROUTES.flows, icon: Workflow },
      { label: 'Settings', to: ROUTES.settings, icon: Settings },
    ],
  },
];
