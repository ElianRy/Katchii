import { Rarity } from '../types';

export interface NarutoCharacter {
  id: string;
  name: string;
  rarity: Rarity;
  spriteUrl: string;
}

export const NARUTO_ZONE1: NarutoCharacter[] = [
  { id: 'n001', name: 'Naruto Uzumaki', rarity: 'elite', spriteUrl: 'https://www.narutodb.xyz/images/character/naruto-uzumaki.webp' },
  { id: 'n002', name: 'Sasuke Uchiha', rarity: 'elite', spriteUrl: 'https://www.narutodb.xyz/images/character/sasuke-uchiha.webp' },
  { id: 'n003', name: 'Sakura Haruno', rarity: 'rare', spriteUrl: 'https://www.narutodb.xyz/images/character/sakura-haruno.webp' },
  { id: 'n004', name: 'Kakashi Hatake', rarity: 'elite', spriteUrl: 'https://www.narutodb.xyz/images/character/kakashi-hatake.webp' },
  { id: 'n005', name: 'Rock Lee', rarity: 'rare', spriteUrl: 'https://www.narutodb.xyz/images/character/rock-lee.webp' },
  { id: 'n006', name: 'Neji Hyuga', rarity: 'rare', spriteUrl: 'https://www.narutodb.xyz/images/character/neji-hyuga.webp' },
  { id: 'n007', name: 'Hinata Hyuga', rarity: 'peu_commun', spriteUrl: 'https://www.narutodb.xyz/images/character/hinata-hyuga.webp' },
  { id: 'n008', name: 'Shikamaru Nara', rarity: 'rare', spriteUrl: 'https://www.narutodb.xyz/images/character/shikamaru-nara.webp' },
  { id: 'n009', name: 'Choji Akimichi', rarity: 'peu_commun', spriteUrl: 'https://www.narutodb.xyz/images/character/choji-akimichi.webp' },
  { id: 'n010', name: 'Ino Yamanaka', rarity: 'peu_commun', spriteUrl: 'https://www.narutodb.xyz/images/character/ino-yamanaka.webp' },
  { id: 'n011', name: 'Kiba Inuzuka', rarity: 'peu_commun', spriteUrl: 'https://www.narutodb.xyz/images/character/kiba-inuzuka.webp' },
  { id: 'n012', name: 'Shino Aburame', rarity: 'peu_commun', spriteUrl: 'https://www.narutodb.xyz/images/character/shino-aburame.webp' },
  { id: 'n013', name: 'Iruka Umino', rarity: 'commun', spriteUrl: 'https://www.narutodb.xyz/images/character/iruka-umino.webp' },
  { id: 'n014', name: 'Tsunade', rarity: 'legendaire', spriteUrl: 'https://www.narutodb.xyz/images/character/tsunade.webp' },
  { id: 'n015', name: 'Jiraiya', rarity: 'legendaire', spriteUrl: 'https://www.narutodb.xyz/images/character/jiraiya.webp' },
  { id: 'n016', name: 'Minato Namikaze', rarity: 'legendaire', spriteUrl: 'https://www.narutodb.xyz/images/character/minato-namikaze.webp' },
  { id: 'n017', name: 'Itachi Uchiha', rarity: 'legendaire', spriteUrl: 'https://www.narutodb.xyz/images/character/itachi-uchiha.webp' },
  { id: 'n018', name: 'Guy Maito', rarity: 'rare', spriteUrl: 'https://www.narutodb.xyz/images/character/guy-maito.webp' },
  { id: 'n019', name: 'Kurenai Yūhi', rarity: 'rare', spriteUrl: 'https://www.narutodb.xyz/images/character/kurenai-yuhi.webp' },
  { id: 'n020', name: 'Asuma Sarutobi', rarity: 'rare', spriteUrl: 'https://www.narutodb.xyz/images/character/asuma-sarutobi.webp' },
  { id: 'n021', name: 'Hiruzen Sarutobi', rarity: 'elite', spriteUrl: 'https://www.narutodb.xyz/images/character/hiruzen-sarutobi.webp' },
  { id: 'n022', name: 'Anko Mitarashi', rarity: 'rare', spriteUrl: 'https://www.narutodb.xyz/images/character/anko-mitarashi.webp' },
  { id: 'n023', name: 'Tenten', rarity: 'commun', spriteUrl: 'https://www.narutodb.xyz/images/character/tenten.webp' },
  { id: 'n024', name: 'Konohamaru', rarity: 'commun', spriteUrl: 'https://www.narutodb.xyz/images/character/konohamaru.webp' },
  { id: 'n025', name: 'Ebisu', rarity: 'commun', spriteUrl: 'https://www.narutodb.xyz/images/character/ebisu.webp' },
  { id: 'n026', name: 'Genma Shiranui', rarity: 'commun', spriteUrl: 'https://www.narutodb.xyz/images/character/genma-shiranui.webp' },
  { id: 'n027', name: 'Izumo Kamizuki', rarity: 'commun', spriteUrl: 'https://www.narutodb.xyz/images/character/izumo-kamizuki.webp' },
  { id: 'n028', name: 'Kotetsu Hagane', rarity: 'commun', spriteUrl: 'https://www.narutodb.xyz/images/character/kotetsu-hagane.webp' },
  { id: 'n029', name: 'Yamato', rarity: 'elite', spriteUrl: 'https://www.narutodb.xyz/images/character/yamato.webp' },
  { id: 'n030', name: 'Sai', rarity: 'rare', spriteUrl: 'https://www.narutodb.xyz/images/character/sai.webp' },
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
