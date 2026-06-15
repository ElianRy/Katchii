export type StatKey = 'attack' | 'defense' | 'spAttack' | 'spDefense' | 'speed';

export interface Nature {
  name: string;
  increased: StatKey | null;
  decreased: StatKey | null;
}

export const NATURES: Record<string, Nature> = {
  Hardy:   { name: 'Hardy',   increased: null,        decreased: null },
  Lonely:  { name: 'Lonely',  increased: 'attack',    decreased: 'defense' },
  Brave:   { name: 'Brave',   increased: 'attack',    decreased: 'speed' },
  Adamant: { name: 'Adamant', increased: 'attack',    decreased: 'spAttack' },
  Naughty: { name: 'Naughty', increased: 'attack',    decreased: 'spDefense' },
  Bold:    { name: 'Bold',    increased: 'defense',   decreased: 'attack' },
  Docile:  { name: 'Docile',  increased: null,        decreased: null },
  Relaxed: { name: 'Relaxed', increased: 'defense',   decreased: 'speed' },
  Impish:  { name: 'Impish',  increased: 'defense',   decreased: 'spAttack' },
  Lax:     { name: 'Lax',     increased: 'defense',   decreased: 'spDefense' },
  Timid:   { name: 'Timid',   increased: 'speed',     decreased: 'attack' },
  Hasty:   { name: 'Hasty',   increased: 'speed',     decreased: 'defense' },
  Serious: { name: 'Serious', increased: null,        decreased: null },
  Jolly:   { name: 'Jolly',   increased: 'speed',     decreased: 'spAttack' },
  Naive:   { name: 'Naive',   increased: 'speed',     decreased: 'spDefense' },
  Modest:  { name: 'Modest',  increased: 'spAttack',  decreased: 'attack' },
  Mild:    { name: 'Mild',    increased: 'spAttack',  decreased: 'defense' },
  Quiet:   { name: 'Quiet',   increased: 'spAttack',  decreased: 'speed' },
  Bashful: { name: 'Bashful', increased: null,        decreased: null },
  Rash:    { name: 'Rash',    increased: 'spAttack',  decreased: 'spDefense' },
  Calm:    { name: 'Calm',    increased: 'spDefense', decreased: 'attack' },
  Gentle:  { name: 'Gentle',  increased: 'spDefense', decreased: 'defense' },
  Sassy:   { name: 'Sassy',   increased: 'spDefense', decreased: 'speed' },
  Careful: { name: 'Careful', increased: 'spDefense', decreased: 'spAttack' },
  Quirky:  { name: 'Quirky',  increased: null,        decreased: null },
};

export const NATURE_NAMES = Object.keys(NATURES);

export function randomNature(): string {
  return NATURE_NAMES[Math.floor(Math.random() * NATURE_NAMES.length)];
}

export function natureMult(natureName: string, stat: StatKey): number {
  const n = NATURES[natureName];
  if (!n) return 1;
  if (n.increased === stat) return 1.1;
  if (n.decreased === stat) return 0.9;
  return 1;
}
