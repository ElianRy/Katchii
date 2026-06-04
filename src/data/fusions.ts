import { Rarity } from '../types';

export interface FusionDefinition {
  id: string;
  name: string;
  a: number; // pokemonId
  b: number; // pokemonId
  rarity: Rarity;
  desc: string;
}

export const FUSIONS: FusionDefinition[] = [
  { id: 'f001', name: 'Dracopouvoirs', a: 6, b: 150, rarity: 'legendaire', desc: 'Dracaufeu + Mewtwo' },
  { id: 'f002', name: 'Aquatwo', a: 9, b: 150, rarity: 'legendaire', desc: 'Tortank + Mewtwo' },
  { id: 'f003', name: 'Floratwo', a: 3, b: 150, rarity: 'legendaire', desc: 'Florizarre + Mewtwo' },
  { id: 'f004', name: 'Pikafeu', a: 25, b: 4, rarity: 'rare', desc: 'Pikachu + Salamèche' },
  { id: 'f005', name: 'Léviasaure', a: 130, b: 3, rarity: 'elite', desc: 'Léviator + Florizarre' },
  { id: 'f006', name: 'Ronflex Roi', a: 143, b: 94, rarity: 'elite', desc: 'Ronflex + Ectoplasma' },
  { id: 'f007', name: 'Dracolosse Shiny', a: 149, b: 145, rarity: 'legendaire', desc: 'Dracolosse + Électhor' },
  { id: 'f008', name: 'Évolution Ultime', a: 133, b: 151, rarity: 'legendaire', desc: 'Évoli + Mew' },
  { id: 'f009', name: 'Magicarpe Dieu', a: 129, b: 151, rarity: 'legendaire', desc: 'Magicarpe + Mew' },
  { id: 'f010', name: 'Pikachu Fantôme', a: 25, b: 94, rarity: 'elite', desc: 'Pikachu + Ectoplasma' },
];

export const FUSION_BY_ID: Record<string, FusionDefinition> = Object.fromEntries(
  FUSIONS.map((f) => [f.id, f])
);
