import { Rarity } from '../types';

export interface NarutoCharacter {
  id: string;
  name: string;
  rarity: Rarity;
  spriteUrl: string;
}

// Fallback image for characters without confirmed working URLs
const FALLBACK = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/No_image_available.svg/240px-No_image_available.svg.png';

// Using Wikimedia Commons images for Naruto characters
export const NARUTO_ZONE1: NarutoCharacter[] = [
  { id: 'n001', name: 'Naruto Uzumaki', rarity: 'elite', spriteUrl: 'https://upload.wikimedia.org/wikipedia/en/9/9a/NarutoUzumaki.png' },
  { id: 'n002', name: 'Sasuke Uchiha', rarity: 'elite', spriteUrl: 'https://upload.wikimedia.org/wikipedia/en/2/21/Sasuke_Uchiha.png' },
  { id: 'n003', name: 'Sakura Haruno', rarity: 'rare', spriteUrl: FALLBACK },
  { id: 'n004', name: 'Kakashi Hatake', rarity: 'elite', spriteUrl: FALLBACK },
  { id: 'n005', name: 'Rock Lee', rarity: 'rare', spriteUrl: FALLBACK },
  { id: 'n006', name: 'Neji Hyuga', rarity: 'rare', spriteUrl: FALLBACK },
  { id: 'n007', name: 'Hinata Hyuga', rarity: 'peu_commun', spriteUrl: FALLBACK },
  { id: 'n008', name: 'Shikamaru Nara', rarity: 'rare', spriteUrl: FALLBACK },
  { id: 'n009', name: 'Choji Akimichi', rarity: 'peu_commun', spriteUrl: FALLBACK },
  { id: 'n010', name: 'Ino Yamanaka', rarity: 'peu_commun', spriteUrl: FALLBACK },
  { id: 'n011', name: 'Kiba Inuzuka', rarity: 'peu_commun', spriteUrl: FALLBACK },
  { id: 'n012', name: 'Shino Aburame', rarity: 'peu_commun', spriteUrl: FALLBACK },
  { id: 'n013', name: 'Iruka Umino', rarity: 'commun', spriteUrl: FALLBACK },
  { id: 'n014', name: 'Tsunade', rarity: 'legendaire', spriteUrl: FALLBACK },
  { id: 'n015', name: 'Jiraiya', rarity: 'legendaire', spriteUrl: FALLBACK },
  { id: 'n016', name: 'Minato Namikaze', rarity: 'legendaire', spriteUrl: FALLBACK },
  { id: 'n017', name: 'Itachi Uchiha', rarity: 'legendaire', spriteUrl: FALLBACK },
  { id: 'n018', name: 'Guy Maito', rarity: 'rare', spriteUrl: FALLBACK },
  { id: 'n019', name: 'Kurenai Yūhi', rarity: 'rare', spriteUrl: FALLBACK },
  { id: 'n020', name: 'Asuma Sarutobi', rarity: 'rare', spriteUrl: FALLBACK },
  { id: 'n021', name: 'Hiruzen Sarutobi', rarity: 'elite', spriteUrl: FALLBACK },
  { id: 'n022', name: 'Anko Mitarashi', rarity: 'rare', spriteUrl: FALLBACK },
  { id: 'n023', name: 'Tenten', rarity: 'commun', spriteUrl: FALLBACK },
  { id: 'n024', name: 'Konohamaru', rarity: 'commun', spriteUrl: FALLBACK },
  { id: 'n025', name: 'Ebisu', rarity: 'commun', spriteUrl: FALLBACK },
  { id: 'n026', name: 'Genma Shiranui', rarity: 'commun', spriteUrl: FALLBACK },
  { id: 'n027', name: 'Izumo Kamizuki', rarity: 'commun', spriteUrl: FALLBACK },
  { id: 'n028', name: 'Kotetsu Hagane', rarity: 'commun', spriteUrl: FALLBACK },
  { id: 'n029', name: 'Yamato', rarity: 'elite', spriteUrl: FALLBACK },
  { id: 'n030', name: 'Sai', rarity: 'rare', spriteUrl: FALLBACK },
];

export const NARUTO_BY_ID: Record<string, NarutoCharacter> = Object.fromEntries(
  NARUTO_ZONE1.map((c) => [c.id, c])
);

export const NARUTO_BY_RARITY: Record<string, NarutoCharacter[]> = NARUTO_ZONE1.reduce(
  (acc, c) => {
    if (!acc[c.rarity]) acc[c.rarity] = [];
    acc[c.rarity].push(c);
    return acc;
  },
  {} as Record<string, NarutoCharacter[]>
);
