import React from 'react';
import { AvatarId, LanguageCode } from '../types/game';

export interface AvatarMeta {
  id: AvatarId;
  name: string;
  bg: string;
  priceCoins: number;
  renderSvg: () => React.ReactNode;
}

export const AVATAR_CATALOG: AvatarMeta[] = [
  {
    id: 'cybercat',
    name: 'Cyber Cat',
    bg: 'linear-gradient(135deg, #38BDF8 0%, #5865F2 100%)',
    priceCoins: 0,
    renderSvg: () => (
      <svg viewBox="0 0 64 64" width="100%" height="100%">
        <rect width="64" height="64" rx="16" fill="#1E293B" />
        <polygon points="14,28 18,12 28,22" fill="#38BDF8" />
        <polygon points="50,28 46,12 36,22" fill="#38BDF8" />
        <circle cx="32" cy="36" r="18" fill="#F8FAFC" />
        <rect x="18" y="29" width="28" height="9" rx="4.5" fill="#0F172A" />
        <circle cx="25" cy="33.5" r="2.5" fill="#22D3EE" />
        <circle cx="39" cy="33.5" r="2.5" fill="#22D3EE" />
        <polygon points="30,42 34,42 32,45" fill="#F43F5E" />
      </svg>
    ),
  },
  {
    id: 'shiba',
    name: 'Golden Doge',
    bg: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
    priceCoins: 0,
    renderSvg: () => (
      <svg viewBox="0 0 64 64" width="100%" height="100%">
        <rect width="64" height="64" rx="16" fill="#271E14" />
        <polygon points="14,26 18,11 28,21" fill="#F59E0B" />
        <polygon points="50,26 46,11 36,21" fill="#F59E0B" />
        <circle cx="32" cy="36" r="18" fill="#FBBF24" />
        <ellipse cx="32" cy="42" rx="11" ry="9" fill="#FEF3C7" />
        <circle cx="25" cy="32" r="2.6" fill="#1E293B" />
        <circle cx="39" cy="32" r="2.6" fill="#1E293B" />
        <ellipse cx="32" cy="39" rx="3.2" ry="2.2" fill="#1E293B" />
      </svg>
    ),
  },
  {
    id: 'kitsune',
    name: 'Kitsune Fox',
    bg: 'linear-gradient(135deg, #F43F5E 0%, #FB923C 100%)',
    priceCoins: 0,
    renderSvg: () => (
      <svg viewBox="0 0 64 64" width="100%" height="100%">
        <rect width="64" height="64" rx="16" fill="#23141B" />
        <polygon points="12,28 16,10 29,22" fill="#FB7185" />
        <polygon points="52,28 48,10 35,22" fill="#FB7185" />
        <polygon points="14,36 32,52 50,36 44,22 20,22" fill="#FFF1F2" />
        <path d="M20,22 L32,36 L44,22 Z" fill="#F43F5E" />
        <circle cx="25" cy="34" r="2.5" fill="#881337" />
        <circle cx="39" cy="34" r="2.5" fill="#881337" />
      </svg>
    ),
  },
  {
    id: 'astro',
    name: 'Pixel Bot',
    bg: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    priceCoins: 0,
    renderSvg: () => (
      <svg viewBox="0 0 64 64" width="100%" height="100%">
        <rect width="64" height="64" rx="16" fill="#0F221D" />
        <rect x="14" y="16" width="36" height="32" rx="8" fill="#34D399" />
        <rect x="19" y="21" width="26" height="20" rx="4" fill="#064E3B" />
        <rect x="24" y="27" width="4" height="5" fill="#A7F3D0" />
        <rect x="36" y="27" width="4" height="5" fill="#A7F3D0" />
        <rect x="26" y="35" width="12" height="2.5" fill="#A7F3D0" />
      </svg>
    ),
  },
  {
    id: 'ghosty',
    name: 'Phantom Kawaii',
    bg: 'linear-gradient(135deg, #A855F7 0%, #6366F1 100%)',
    priceCoins: 150,
    renderSvg: () => (
      <svg viewBox="0 0 64 64" width="100%" height="100%">
        <rect width="64" height="64" rx="16" fill="#1B1429" />
        <path d="M18,32 C18,19 46,19 46,32 L46,49 L40,44 L34,49 L30,49 L24,44 L18,49 Z" fill="#F3E8FF" />
        <circle cx="26" cy="32" r="2.8" fill="#3B0764" />
        <circle cx="38" cy="32" r="2.8" fill="#3B0764" />
        <ellipse cx="22" cy="36" rx="2.5" ry="1.5" fill="#F472B6" />
        <ellipse cx="42" cy="36" rx="2.5" ry="1.5" fill="#F472B6" />
      </svg>
    ),
  },
  {
    id: 'owl',
    name: 'Night Owl',
    bg: 'linear-gradient(135deg, #6366F1 0%, #3B82F6 100%)',
    priceCoins: 200,
    renderSvg: () => (
      <svg viewBox="0 0 64 64" width="100%" height="100%">
        <rect width="64" height="64" rx="16" fill="#13192B" />
        <circle cx="32" cy="35" r="18" fill="#6366F1" />
        <circle cx="25" cy="32" r="7" fill="#F8FAFC" />
        <circle cx="39" cy="32" r="7" fill="#F8FAFC" />
        <circle cx="25" cy="32" r="3.2" fill="#0F172A" />
        <circle cx="39" cy="32" r="3.2" fill="#0F172A" />
        <polygon points="29,37 35,37 32,43" fill="#FBBF24" />
      </svg>
    ),
  },
  {
    id: 'dragon',
    name: 'Neon Dragon',
    bg: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)',
    priceCoins: 300,
    renderSvg: () => (
      <svg viewBox="0 0 64 64" width="100%" height="100%">
        <rect width="64" height="64" rx="16" fill="#0D212B" />
        <polygon points="15,14 23,26 13,28" fill="#FACC15" />
        <polygon points="49,14 41,26 51,28" fill="#FACC15" />
        <rect x="16" y="22" width="32" height="28" rx="12" fill="#06B6D4" />
        <circle cx="25" cy="34" r="3" fill="#FEF08A" />
        <circle cx="39" cy="34" r="3" fill="#FEF08A" />
      </svg>
    ),
  },
  {
    id: 'witch',
    name: 'Starlight Mage',
    bg: 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)',
    priceCoins: 400,
    renderSvg: () => (
      <svg viewBox="0 0 64 64" width="100%" height="100%">
        <rect width="64" height="64" rx="16" fill="#231226" />
        <circle cx="32" cy="38" r="15" fill="#FDE68A" />
        <polygon points="10,28 54,28 32,9" fill="#8B5CF6" />
        <rect x="8" y="25" width="48" height="5" rx="2.5" fill="#EC4899" />
        <circle cx="26" cy="38" r="2.5" fill="#1E1B4B" />
        <circle cx="38" cy="38" r="2.5" fill="#1E1B4B" />
      </svg>
    ),
  },
];

export const I18N_STRINGS: Record<
  LanguageCode,
  {
    flag: string;
    label: string;
    rooms: string;
    ranked: string;
    shop: string;
    inventory: string;
    words: string;
    syllables: string;
    createRoom: string;
    joinBtn: string;
    started: string;
    multiLang: string;
    profileBtn: string;
    settingsTitle: string;
    footerRights: string;
    terms: string;
    privacy: string;
    status: string;
  }
> = {
  pt: {
    flag: '🇧🇷',
    label: 'PT-BR',
    rooms: 'Salas',
    ranked: 'Ranqueado',
    shop: 'Loja',
    inventory: 'Inventário',
    words: 'Palavras',
    syllables: 'Sílabas',
    createRoom: 'Criar Sala',
    joinBtn: 'JOGAR',
    started: 'Aberta',
    multiLang: 'Multi Idioma',
    profileBtn: 'Perfil',
    settingsTitle: 'Configurações e Opções do Sistema',
    footerRights: '© 2026 The Pulse Game. Todos os direitos reservados.',
    terms: 'Termos de Uso',
    privacy: 'Privacidade',
    status: 'Status: Online',
  },
  en: {
    flag: '🇺🇸',
    label: 'EN-US',
    rooms: 'Rooms',
    ranked: 'Ranked',
    shop: 'Shop',
    inventory: 'Inventory',
    words: 'Words',
    syllables: 'Syllables',
    createRoom: 'Create Room',
    joinBtn: 'JOIN',
    started: 'Started',
    multiLang: 'Multi Language',
    profileBtn: 'Profile',
    settingsTitle: 'System Settings & Options',
    footerRights: '© 2026 The Pulse Game. All rights reserved.',
    terms: 'Terms of Service',
    privacy: 'Privacy Policy',
    status: 'Status: Online',
  },
  es: {
    flag: '🇪🇸',
    label: 'ES',
    rooms: 'Salas',
    ranked: 'Clasificatoria',
    shop: 'Tienda',
    inventory: 'Inventario',
    words: 'Palabras',
    syllables: 'Sílabas',
    createRoom: 'Crear Sala',
    joinBtn: 'UNIRSE',
    started: 'Abierta',
    multiLang: 'Multi Idioma',
    profileBtn: 'Perfil',
    settingsTitle: 'Configuración y Opciones',
    footerRights: '© 2026 The Pulse Game. Todos los derechos reservados.',
    terms: 'Términos',
    privacy: 'Privacidad',
    status: 'Estado: En línea',
  },
};