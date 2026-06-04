import { Rarity } from '../types';
import { GEN1_POKEMON } from './gen1';
import { NARUTO_ZONE1 } from './naruto';

export interface CharacterData {
  id: string;
  name: string;
  rarity: Rarity;
  spriteUrl: string;
  universe: 'pokemon' | 'naruto';
}

export const ALL_CHARACTERS: CharacterData[] = [
  ...GEN1_POKEMON.map((p) => ({
    id: String(p.id),
    name: p.name,
    rarity: p.rarity,
    spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png`,
    universe: 'pokemon' as const,
  })),
  ...NARUTO_ZONE1.map((c) => ({
    id: c.id,
    name: c.name,
    rarity: c.rarity,
    spriteUrl: c.spriteUrl,
    universe: 'naruto' as const,
  })),
];

export const CHARACTER_BY_ID: Record<string, CharacterData> = Object.fromEntries(
  ALL_CHARACTERS.map((c) => [c.id, c])
);
