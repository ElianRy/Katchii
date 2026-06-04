import { Rarity } from '../types';

export interface NarutoCharacter {
  id: string;
  name: string;
  rarity: Rarity;
  spriteUrl: string;
}

// Using NarutoDB API images
const N = (path: string) => `https://narutodb.xyz/api/character/image/${path}`;

export const NARUTO_ZONE1: NarutoCharacter[] = [
  { id: 'n001', name: 'Naruto Uzumaki', rarity: 'elite', spriteUrl: N('1') },
  { id: 'n002', name: 'Sasuke Uchiha', rarity: 'elite', spriteUrl: N('2') },
  { id: 'n003', name: 'Sakura Haruno', rarity: 'rare', spriteUrl: N('3') },
  { id: 'n004', name: 'Kakashi Hatake', rarity: 'elite', spriteUrl: N('4') },
  { id: 'n005', name: 'Rock Lee', rarity: 'rare', spriteUrl: N('11') },
  { id: 'n006', name: 'Neji Hyuga', rarity: 'rare', spriteUrl: N('10') },
  { id: 'n007', name: 'Hinata Hyuga', rarity: 'peu_commun', spriteUrl: N('9') },
  { id: 'n008', name: 'Shikamaru Nara', rarity: 'rare', spriteUrl: N('13') },
  { id: 'n009', name: 'Choji Akimichi', rarity: 'peu_commun', spriteUrl: N('14') },
  { id: 'n010', name: 'Ino Yamanaka', rarity: 'peu_commun', spriteUrl: N('15') },
  { id: 'n011', name: 'Kiba Inuzuka', rarity: 'peu_commun', spriteUrl: N('16') },
  { id: 'n012', name: 'Shino Aburame', rarity: 'peu_commun', spriteUrl: N('17') },
  { id: 'n013', name: 'Iruka Umino', rarity: 'commun', spriteUrl: N('33') },
  { id: 'n014', name: 'Tsunade', rarity: 'legendaire', spriteUrl: N('6') },
  { id: 'n015', name: 'Jiraiya', rarity: 'legendaire', spriteUrl: N('5') },
  { id: 'n016', name: 'Minato Namikaze', rarity: 'legendaire', spriteUrl: N('7') },
  { id: 'n017', name: 'Itachi Uchiha', rarity: 'legendaire', spriteUrl: N('18') },
  { id: 'n018', name: 'Guy Maito', rarity: 'rare', spriteUrl: N('12') },
  { id: 'n019', name: 'Kurenai Yūhi', rarity: 'rare', spriteUrl: N('25') },
  { id: 'n020', name: 'Asuma Sarutobi', rarity: 'rare', spriteUrl: N('24') },
  { id: 'n021', name: 'Hiruzen Sarutobi', rarity: 'elite', spriteUrl: N('8') },
  { id: 'n022', name: 'Anko Mitarashi', rarity: 'rare', spriteUrl: N('26') },
  { id: 'n023', name: 'Tenten', rarity: 'commun', spriteUrl: N('19') },
  { id: 'n024', name: 'Konohamaru', rarity: 'commun', spriteUrl: N('36') },
  { id: 'n025', name: 'Ebisu', rarity: 'commun', spriteUrl: N('37') },
  { id: 'n026', name: 'Genma Shiranui', rarity: 'commun', spriteUrl: N('38') },
  { id: 'n027', name: 'Izumo Kamizuki', rarity: 'commun', spriteUrl: N('39') },
  { id: 'n028', name: 'Kotetsu Hagane', rarity: 'commun', spriteUrl: N('40') },
  { id: 'n029', name: 'Yamato', rarity: 'elite', spriteUrl: N('41') },
  { id: 'n030', name: 'Sai', rarity: 'rare', spriteUrl: N('42') },
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
