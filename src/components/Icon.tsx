import React from 'react';
export type IconName = 'play' | 'map' | 'book' | 'chart' | 'user' | 'settings' | 'water' | 'market' | 'signal' | 'shield' | 'check' | 'arrow' | 'pause' | 'sound' | 'star' | 'bolt' | 'fragment';
const paths: Record<IconName, React.ReactNode> = {
  play: <path d="m9 5 11 7-11 7Z" />,
  map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z"/><path d="M9 3v15m6-12v15"/></>,
  book: <><path d="M3 4h6a3 3 0 0 1 3 3v14a4 4 0 0 0-4-3H3Zm18 0h-6a3 3 0 0 0-3 3v14a4 4 0 0 1 4-3h5Z"/></>,
  chart: <><path d="M4 4v16h17M8 15v-4m5 4V7m5 8V4"/></>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  settings: <><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="8" cy="18" r="2"/></>,
  water: <path d="M12 3C9 8 5 11 5 15a7 7 0 0 0 14 0c0-4-4-7-7-12ZM8 15a4 4 0 0 0 4 4"/>,
  market: <><path d="M3 9h18l-2-5H5Zm2 0v11h14V9M9 20v-7h6v7"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/></>,
  signal: <><path d="M4 17a12 12 0 0 1 16 0M7 13a8 8 0 0 1 10 0M10 9a3 3 0 0 1 4 0"/><circle cx="12" cy="21" r="1"/></>,
  shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z"/><path d="m8 12 3 3 5-6"/></>,
  check: <path d="m5 12 4 4L20 5"/>, arrow: <path d="M4 12h15m-6-6 6 6-6 6"/>,
  pause: <path d="M8 5v14M16 5v14"/>, sound: <><path d="m4 9 5 0 5-4v14l-5-4H4ZM18 8a6 6 0 0 1 0 8"/></>,
  star: <path d="m12 3 3 6 6 1-4.5 4.5 1 6.5-5.5-3-5.5 3 1-6.5L3 10l6-1Z"/>,
  bolt: <path d="m13 2-8 12h6l-1 8 9-13h-6Z"/>,
  fragment: <><path d="m12 2 8 7-3 11H7L4 9Z"/><path d="m4 9 8 4 8-4m-8 4V2m0 11-5 7m5-7 5 7"/></>,
};
export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
