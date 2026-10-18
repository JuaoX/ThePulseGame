import React from 'react';
import { DiceBearStyle, LanguageCode } from '../types/game';

/**
 * Integração Oficial com DiceBear Open-Source Avatar Library (github.com/dicebear/dicebear — 8.2k+ stars)
 * Gera ilustrações vetoriais de alta qualidade (CC0 / MIT)
 */
export function buildDiceBearUrl(style: DiceBearStyle, seed: string, bgHex: string = '1e293b'): string {
  const cleanSeed = encodeURIComponent(seed.trim() || 'Pulse');
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${cleanSeed}&backgroundColor=${bgHex}&radius=20`;
}

export interface CuratedAvatarPreset {
  id: string;
  label: string;
  style: DiceBearStyle;
  seed: string;
  bg: string;
}

export const CURATED_COMMUNITY_AVATARS: CuratedAvatarPreset[] = [
  { id: 'adv_felix', label: 'Felix', style: 'adventurer', seed: 'Felix', bg: '1e293b' },
  { id: 'adv_amaya', label: 'Amaya', style: 'adventurer', seed: 'Amaya', bg: '312e81' },
  { id: 'lor_kael', label: 'Kael', style: 'lorelei', seed: 'Kael', bg: '0f172a' },
  { id: 'lor_luna', label: 'Luna', style: 'lorelei', seed: 'Luna', bg: '3b0764' },
  { id: 'bot_volt', label: 'Volt-X', style: 'bottts', seed: 'VoltX', bg: '083344' },
  { id: 'bot_nexus', label: 'Nexus-9', style: 'bottts', seed: 'Nexus9', bg: '1e1b4b' },
  { id: 'ava_leo', label: 'Leo', style: 'avataaars', seed: 'LeoPulse', bg: '14532d' },
  { id: 'ava_maya', label: 'Maya', style: 'avataaars', seed: 'MayaPulse', bg: '4c1d95' },
  { id: 'pix_arcade', label: '8-Bit Hero', style: 'pixel-art', seed: 'ArcadeHero', bg: '1e293b' },
  { id: 'pix_cyber', label: 'Cyber Ninja', style: 'pixel-art', seed: 'CyberNinja', bg: '31102F' },
  { id: 'fun_spark', label: 'Sparky', style: 'fun-emoji', seed: 'Sparky', bg: '1e293b' },
  { id: 'fun_chill', label: 'Vibe', style: 'fun-emoji', seed: 'ChillVibe', bg: '0f292a' },
];

export const DICEBEAR_STYLE_LIST: { id: DiceBearStyle; name: string }[] = [
  { id: 'adventurer', name: 'Adventurer' },
  { id: 'lorelei', name: 'Lorelei Anime' },
  { id: 'bottts', name: 'Mecha Bottts' },
  { id: 'avataaars', name: 'Avataaars' },
  { id: 'pixel-art', name: 'Pixel Art' },
  { id: 'fun-emoji', name: 'Fun Emoji' },
];

/**
 * Integração Oficial com HatScripts Circle-Flags (github.com/HatScripts/circle-flags — 2.6k+ stars)
 */
export const LANGUAGE_OPTIONS: {
  code: LanguageCode;
  name: string;
  short: string;
  flagUrl: string;
}[] = [
  {
    code: 'pt',
    name: 'Português (Brasil)',
    short: 'PT-BR',
    flagUrl: 'https://hatscripts.github.io/circle-flags/flags/br.svg',
  },
  {
    code: 'en',
    name: 'English (US)',
    short: 'EN-US',
    flagUrl: 'https://hatscripts.github.io/circle-flags/flags/us.svg',
  },
  {
    code: 'es',
    name: 'Español (ES)',
    short: 'ES',
    flagUrl: 'https://hatscripts.github.io/circle-flags/flags/es.svg',
  },
];

export const I18N_STRINGS: Record<
  LanguageCode,
  {
    navPlay: string;
    navRanked: string;
    navCustomize: string;
    navLexicon: string;
    navSyllables: string;
    launchSelected: string;
    dailySeedLabel: string;
    settingsTitle: string;
    profileTitle: string;
    playNow: string;
    bestScore: string;
  }
> = {
  pt: {
    navPlay: 'Arenas',
    navRanked: 'Carreira & Ligas',
    navCustomize: 'Avatares',
    navLexicon: 'Dicionário',
    navSyllables: 'Sílabas',
    launchSelected: 'Iniciar Partida Agora',
    dailySeedLabel: 'Semente Diária Oficial',
    settingsTitle: 'Configurações do Sistema',
    profileTitle: 'Seu Perfil & Estúdio de Avatar',
    playNow: 'Jogar Arena',
    bestScore: 'Recorde Pessoal',
  },
  en: {
    navPlay: 'Arenas',
    navRanked: 'Career & Leagues',
    navCustomize: 'Avatars',
    navLexicon: 'Dictionary',
    navSyllables: 'Syllables',
    launchSelected: 'Launch Match Now',
    dailySeedLabel: 'Official Daily Seed',
    settingsTitle: 'System Settings',
    profileTitle: 'Your Profile & Avatar Studio',
    playNow: 'Play Arena',
    bestScore: 'Personal Best',
  },
  es: {
    navPlay: 'Arenas',
    navRanked: 'Carrera y Ligas',
    navCustomize: 'Avatares',
    navLexicon: 'Diccionario',
    navSyllables: 'Sílabas',
    launchSelected: 'Iniciar Partida Ahora',
    dailySeedLabel: 'Semilla Diaria Oficial',
    settingsTitle: 'Configuración del Sistema',
    profileTitle: 'Tu Perfil y Estudio de Avatar',
    playNow: 'Jugar Arena',
    bestScore: 'Récord Personal',
  },
};

/**
 * Logo Oficial Minimalista — The Pulse Game (Squircle Geométrico + Pulso Harmônico)
 */
export function PulseBrandLogo({ size = 40 }: { size?: number }): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-label="The Pulse Game">
      <defs>
        <linearGradient id="pulseLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="50%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill="#0D111A" />
      <rect
        x="3"
        y="3"
        width="58"
        height="58"
        rx="15"
        fill="url(#pulseLogoGrad)"
        fillOpacity="0.14"
        stroke="url(#pulseLogoGrad)"
        strokeWidth="3"
      />
      <path
        d="M12 32H21L26.5 17L32.5 47L38.5 24L43 32H52"
        stroke="url(#pulseLogoGrad)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}