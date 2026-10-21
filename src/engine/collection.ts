import { CHARACTERS, characterById } from '../data/characters';
import { PlayerProfile } from '../types/game';

export function rewardDiscovery(profile: PlayerProfile, key: string, amount = 8): PlayerProfile {
  if (!key || profile.discoveries.includes(key) || !Number.isInteger(amount) || amount <= 0) return profile;
  return { ...profile, fragments: Math.min(1_000_000, profile.fragments + amount), discoveries: [...profile.discoveries, key].slice(-2000) };
}
export function acquireCharacter(profile: PlayerProfile, id: string): PlayerProfile {
  const character = CHARACTERS.find(item => item.id === id);
  if (!character || profile.ownedCharacters.includes(id) || profile.fragments < character.cost) return profile;
  return { ...profile, fragments: profile.fragments - character.cost, ownedCharacters: [...profile.ownedCharacters, id] };
}
export function equipCharacter(profile: PlayerProfile, id: string): PlayerProfile {
  if (!profile.ownedCharacters.includes(id)) return profile;
  const character = characterById(id);
  return { ...profile, equippedCharacter: id, avatarStyle: character.style, avatarSeed: character.seed, avatarBg: character.bg };
}
