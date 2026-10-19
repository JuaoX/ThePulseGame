import React from 'react';
import { AvatarStyleId, GameModeId, LanguageCode } from '../types/game';

export function buildAvatarUrl(style: AvatarStyleId, seed: string, bgHex: string = '1e293b'): string {
  const cleanSeed = encodeURIComponent(seed.trim() || 'Pulse');
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${cleanSeed}&backgroundColor=${bgHex}&radius=20`;
}

export interface CuratedAvatarPreset {
  id: string;
  label: string;
  style: AvatarStyleId;
  seed: string;
  bg: string;
}

export const CURATED_AVATARS: CuratedAvatarPreset[] = [
  { id: 'adv_felix', label: 'Felix', style: 'adventurer', seed: 'Felix', bg: '1e293b' },
  { id: 'adv_amaya', label: 'Amaya', style: 'adventurer', seed: 'Amaya', bg: '312e81' },
  { id: 'lor_kael', label: 'Kael', style: 'lorelei', seed: 'Kael', bg: '0f172a' },
  { id: 'lor_luna', label: 'Luna', style: 'lorelei', seed: 'Luna', bg: '3b0764' },
  { id: 'bot_volt', label: 'Volt-X', style: 'bottts', seed: 'VoltX', bg: '083344' },
  { id: 'bot_nexus', label: 'Nexus-9', style: 'bottts', seed: 'Nexus9', bg: '1e1b4b' },
  { id: 'ava_leo', label: 'Leo', style: 'avataaars', seed: 'LeoPulse', bg: '14532d' },
  { id: 'ava_maya', label: 'Maya', style: 'avataaars', seed: 'MayaPulse', bg: '4c1d95' },
  { id: 'pix_arcade', label: '8-Bit', style: 'pixel-art', seed: 'ArcadeHero', bg: '1e293b' },
  { id: 'pix_cyber', label: 'Shinobi', style: 'pixel-art', seed: 'CyberNinja', bg: '31102F' },
  { id: 'fun_spark', label: 'Sparky', style: 'fun-emoji', seed: 'Sparky', bg: '1e293b' },
  { id: 'fun_chill', label: 'Vibe', style: 'fun-emoji', seed: 'ChillVibe', bg: '0f292a' },
];

export const AVATAR_STYLE_OPTIONS: { id: AvatarStyleId; name: string }[] = [
  { id: 'adventurer', name: 'Herói' },
  { id: 'lorelei', name: 'Anime' },
  { id: 'bottts', name: 'Mecha' },
  { id: 'avataaars', name: 'Urbano' },
  { id: 'pixel-art', name: '8-Bit' },
  { id: 'fun-emoji', name: 'Arcade' },
];

export const LANGUAGE_OPTIONS: {
  code: LanguageCode;
  name: string;
  short: string;
  flagUrl: string;
}[] = [
  {
    code: 'pt',
    name: 'Português (Brasil)',
    short: 'PT',
    flagUrl: 'https://hatscripts.github.io/circle-flags/flags/br.svg',
  },
  {
    code: 'en',
    name: 'English (US)',
    short: 'EN',
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
    playBigBtn: string;
    settingsTitle: string;
    profileTitle: string;
  }
> = {
  pt: {
    navPlay: 'Jogar',
    navRanked: 'Ligas',
    navCustomize: 'Avatares',
    navLexicon: 'Palavras',
    navSyllables: 'Sílabas',
    playBigBtn: 'JOGAR AGORA',
    settingsTitle: 'Configurações do Jogo',
    profileTitle: 'Seu Perfil & Personagem',
  },
  en: {
    navPlay: 'Play',
    navRanked: 'Ranked',
    navCustomize: 'Avatars',
    navLexicon: 'Words',
    navSyllables: 'Syllables',
    playBigBtn: 'PLAY NOW',
    settingsTitle: 'Game Settings',
    profileTitle: 'Your Profile & Character',
  },
  es: {
    navPlay: 'Jugar',
    navRanked: 'Ligas',
    navCustomize: 'Avatares',
    navLexicon: 'Palabras',
    navSyllables: 'Sílabas',
    playBigBtn: 'JUGAR AHORA',
    settingsTitle: 'Ajustes del Juego',
    profileTitle: 'Tu Perfil y Personaje',
  },
};

export function PulseBrandLogo({ size = 38 }: { size?: number }): React.ReactElement {
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
        fillOpacity="0.16"
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

export function ModeVisualArtwork({ mode }: { mode: GameModeId }): React.ReactElement {
  if (mode === 'wordbomb') {
    return (
      <svg viewBox="0 0 180 100" className="mode-art-svg">
        <defs>
          <radialGradient id="bombGlow" cx="50%" cy="55%" r="50%">
            <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#22D3EE" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="90" cy="56" r="44" fill="url(#bombGlow)" className="art-pulse-slow" />
        <path d="M98 24 Q116 10 128 20" fill="none" stroke="#94A3B8" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="130" cy="20" r="6" fill="#FACC15" className="art-spark-flicker" />
        <circle cx="130" cy="20" r="11" fill="#F43F5E" fillOpacity="0.4" className="art-spark-flicker" />
        <circle cx="88" cy="56" r="30" fill="#111726" stroke="#22D3EE" strokeWidth="3" />
        <rect x="65" y="44" width="46" height="24" rx="6" fill="#090D16" stroke="#38BDF8" strokeWidth="1.5" />
        <text x="88" y="61" textAnchor="middle" fill="#22D3EE" fontFamily="JetBrains Mono, monospace" fontWeight="800" fontSize="15">
          PRO
        </text>
      </svg>
    );
  }

  if (mode === 'daily') {
    return (
      <svg viewBox="0 0 180 100" className="mode-art-svg">
        <defs>
          <radialGradient id="dailyGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="90" cy="50" r="44" fill="url(#dailyGlow)" className="art-pulse-slow" />
        <g className="art-float">
          <rect x="46" y="20" width="36" height="36" rx="8" fill="#10B981" stroke="#34D399" strokeWidth="2" />
          <text x="64" y="44" textAnchor="middle" fill="#052E16" fontFamily="Outfit, sans-serif" fontWeight="900" fontSize="19">
            24
          </text>
          <rect x="92" y="20" width="36" height="36" rx="8" fill="#F59E0B" stroke="#FBBF24" strokeWidth="2" />
          <text x="110" y="44" textAnchor="middle" fill="#451A03" fontFamily="Outfit, sans-serif" fontWeight="900" fontSize="19">
            H
          </text>
          <rect x="46" y="62" width="82" height="16" rx="5" fill="#172033" stroke="#334155" strokeWidth="1.5" />
          <circle cx="60" cy="70" r="3.5" fill="#10B981" />
          <circle cx="78" cy="70" r="3.5" fill="#10B981" />
          <circle cx="96" cy="70" r="3.5" fill="#F59E0B" />
          <circle cx="114" cy="70" r="3.5" fill="#38BDF8" />
        </g>
      </svg>
    );
  }

  if (mode === 'elevator') {
    return (
      <svg viewBox="0 0 180 100" className="mode-art-svg">
        <defs>
          <radialGradient id="elevGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#F43F5E" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="90" cy="50" r="44" fill="url(#elevGlow)" className="art-pulse-slow" />
        <rect x="58" y="14" width="64" height="72" rx="11" fill="#141824" stroke="#F43F5E" strokeWidth="2.5" />
        <line x1="90" y1="20" x2="90" y2="80" stroke="rgba(244,63,94,0.3)" strokeWidth="2" strokeDasharray="4 4" />
        <g className="art-rise">
          <path d="M75 48 L90 33 L105 48" fill="none" stroke="#FB7185" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M75 65 L90 50 L105 65" fill="none" stroke="#F43F5E" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 180 100" className="mode-art-svg">
      <defs>
        <radialGradient id="classicGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#818CF8" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#818CF8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="90" cy="50" r="44" fill="url(#classicGlow)" className="art-pulse-slow" />
      <circle cx="90" cy="50" r="30" fill="#131829" stroke="#818CF8" strokeWidth="3" strokeDasharray="140 36" />
      <polygon points="94,26 75,52 90,52 84,74 106,46 91,46" fill="#FACC15" className="art-spark-flicker" />
    </svg>
  );
}