export const APP_CONFIG = {
  name: 'Mesa',
  tagline: 'WhatsApp chatbots para restaurantes',
  shortDescription: 'Crie e gerencie bots do WhatsApp para seus restaurantes.',
  supportEmail: 'medinamurilo4@gmail.com',
  version: '0.1.0',
} as const;

export const STORAGE_KEYS = {
  authToken: 'mesa.auth.token',
  authUser: 'mesa.auth.user',
  theme: 'mesa.theme',
  bots: 'mesa.bots',
  menu: 'mesa.menu',
  flows: 'mesa.flows',
  chats: 'mesa.chats',
} as const;

export const ROUTES = {
  login: '/login',
  signUp: '/sign-up',
  onboarding: '/onboarding',
  dashboard: '/',
  bots: '/bots',
  menu: '/menu',
  flows: '/flows',
  conversations: '/conversations',
  orders: '/orders',
  wallet: '/wallet',
  promotions: '/promotions',
  coupons: '/coupons',
  menuPreview: '/menu-preview',
  messages: '/messages',
  notifications: '/notifications',
  settings: '/settings',
  privacy: '/privacidade',
  terms: '/termos',
} as const;

export const API_LATENCY_MS = 600;
