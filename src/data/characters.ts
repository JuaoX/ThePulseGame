import { AvatarStyleId } from '../types/game';

export interface Character {
  id: string; name: string; asset: string; style: AvatarStyleId; seed: string; bg: string;
  cost: number; affinity: string; description: string; effect: string; color: string;
}

export const CHARACTERS: Character[] = [
  { id: 'kael', name: 'Kael', asset: 'lor_kael', style: 'lorelei', seed: 'Kael', bg: '0f172a', cost: 0, affinity: 'Foco', description: 'Acertos com um pulso ciano.', effect: 'focus', color: '#55d8e8' },
  { id: 'luna', name: 'Luna', asset: 'lor_luna', style: 'lorelei', seed: 'Luna', bg: '3b0764', cost: 0, affinity: 'Serenidade', description: 'Celebrações em tons de lavanda.', effect: 'moon', color: '#bca7ff' },
  { id: 'leo', name: 'Leo', asset: 'ava_leo', style: 'avataaars', seed: 'LeoPulse', bg: '14532d', cost: 18, affinity: 'Presença', description: 'Um brilho dourado nos acertos.', effect: 'sun', color: '#f5c568' },
  { id: 'maya', name: 'Maya', asset: 'ava_maya', style: 'avataaars', seed: 'MayaPulse', bg: '4c1d95', cost: 18, affinity: 'Florescer', description: 'Celebrações em verde suave.', effect: 'leaf', color: '#9be3b2' },
  { id: 'shinobi', name: 'Shinobi', asset: 'pix_cyber', style: 'pixel-art', seed: 'CyberNinja', bg: '31102F', cost: 32, affinity: 'Sutileza', description: 'Acertos discretos, sem partículas.', effect: 'shadow', color: '#ffb39e' },
  { id: '8bit', name: '8-Bit', asset: 'pix_arcade', style: 'pixel-art', seed: 'ArcadeHero', bg: '1e293b', cost: 32, affinity: 'Retro', description: 'Acertos com acabamento em pixels.', effect: 'pixel', color: '#9be3b2' },
  { id: 'kael-orbita', name: 'Kael · Órbita', asset: 'lor_kael', style: 'lorelei', seed: 'Kael', bg: '0f172a', cost: 64, affinity: 'Órbita', description: 'Um satélite acompanha seu personagem.', effect: 'orbit', color: '#55d8e8' },
  { id: 'luna-aurora', name: 'Luna · Aurora', asset: 'lor_luna', style: 'lorelei', seed: 'Luna', bg: '3b0764', cost: 64, affinity: 'Aurora', description: 'Um arco de luz percorre a moldura.', effect: 'aurora', color: '#bca7ff' },
  { id: 'shinobi-fantasma', name: 'Shinobi · Fantasma', asset: 'pix_cyber', style: 'pixel-art', seed: 'CyberNinja', bg: '31102F', cost: 88, affinity: 'Fantasma', description: 'Um eco translúcido acompanha o retrato.', effect: 'ghost', color: '#ffb39e' },
];
export const FREE_CHARACTERS = CHARACTERS.filter(character => character.cost === 0).map(character => character.id);
export const BASE_CHARACTERS = CHARACTERS.slice(0, 6).map(character => character.id);
export function characterById(id: string): Character { return CHARACTERS.find(character => character.id === id) || CHARACTERS[0]; }
