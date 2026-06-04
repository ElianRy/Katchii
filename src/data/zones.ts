export interface Zone {
  id: string;
  name: string;
  description: string;
  background: string;
  pokemonIds: number[];
  completionThreshold: number;
  boss: {
    name: string;
    title: string;
    team: Array<{ pokemonId: number; isShiny: boolean }>;
    badge: string;
    reward: string;
  } | null;
  unlockRequirement: string | null;
  includesLegendaries: boolean;
}

// All Pokémon IDs excluding legendaries (144,145,146,150,151)
const NON_LEGENDARY_IDS = [
  1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,
  21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,
  41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,
  61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,
  81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,
  101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,
  121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,
  141,142,143,147,148,149,
];

export const ZONES: Zone[] = [
  {
    id: 'zone1',
    name: 'Forêt de Pallet',
    description: 'La forêt des débuts, pleine de Pokémon communs.',
    background: 'linear-gradient(180deg, #0a1a0a 0%, #1a3a1a 50%, #0f2a0f 100%)',
    pokemonIds: [10,11,13,14,16,17,19,20,21,22,27,29,32,39,41,43,46,48,50,72,74,84,96,98,100,102,104,109,111,116,118,120,129],
    completionThreshold: 0.70,
    boss: {
      name: 'Pierre',
      title: 'Gym Leader Roche',
      team: [
        { pokemonId: 74, isShiny: false },
        { pokemonId: 95, isShiny: false },
        { pokemonId: 75, isShiny: false },
      ],
      badge: 'Badge Pierre',
      reward: 'Débloque la Zone 2 — Bords de Mer',
    },
    unlockRequirement: null,
    includesLegendaries: false,
  },
  {
    id: 'zone2',
    name: 'Bords de Mer',
    description: 'Les côtes de Kanto, territoire des Pokémon aquatiques.',
    background: 'linear-gradient(180deg, #0a1a2e 0%, #0d2a4a 50%, #0a1a3a 100%)',
    pokemonIds: [54,55,60,61,62,72,73,79,80,86,87,90,91,98,99,116,117,118,119,120,121,129,130,131],
    completionThreshold: 0.70,
    boss: {
      name: 'Ondine',
      title: 'Gym Leader Eau',
      team: [
        { pokemonId: 120, isShiny: false },
        { pokemonId: 121, isShiny: false },
        { pokemonId: 73, isShiny: false },
      ],
      badge: 'Badge Cascade',
      reward: 'Débloque la Zone 3 — Centrale Électrique',
    },
    unlockRequirement: 'zone1',
    includesLegendaries: false,
  },
  {
    id: 'zone3',
    name: 'Centrale Électrique',
    description: 'Une zone industrielle chargée d\'électricité.',
    background: 'linear-gradient(180deg, #1a1a0a 0%, #2a2a00 50%, #1a1800 100%)',
    pokemonIds: [25,26,41,42,81,82,84,85,96,97,100,101,109,110,137],
    completionThreshold: 0.70,
    boss: {
      name: 'Roguele',
      title: 'Gym Leader Électrik',
      team: [
        { pokemonId: 100, isShiny: false },
        { pokemonId: 82, isShiny: false },
        { pokemonId: 26, isShiny: false },
      ],
      badge: 'Badge Tonnerre',
      reward: 'Débloque la Zone 4 — Bois aux Fleurs',
    },
    unlockRequirement: 'zone2',
    includesLegendaries: false,
  },
  {
    id: 'zone4',
    name: 'Bois aux Fleurs',
    description: 'Une forêt fleurie peuplée de Pokémon Plante et Insecte.',
    background: 'linear-gradient(180deg, #0a1a10 0%, #1a3a20 50%, #0a2010 100%)',
    pokemonIds: [1,2,3,10,11,12,13,14,15,43,44,45,46,47,48,49,69,70,71,102,103,114],
    completionThreshold: 0.70,
    boss: {
      name: 'Erika',
      title: 'Gym Leader Plante',
      team: [
        { pokemonId: 43, isShiny: false },
        { pokemonId: 44, isShiny: false },
        { pokemonId: 45, isShiny: false },
      ],
      badge: 'Badge Arc-en-ciel',
      reward: 'Débloque la Zone 5 — Tour Fantôme',
    },
    unlockRequirement: 'zone3',
    includesLegendaries: false,
  },
  {
    id: 'zone5',
    name: 'Tour Fantôme',
    description: 'Une tour hantée où les esprits errent.',
    background: 'linear-gradient(180deg, #0a0a1a 0%, #1a0a2a 50%, #0f0a1a 100%)',
    pokemonIds: [23,24,41,42,63,64,88,89,92,93,94,96,97,109,110],
    completionThreshold: 0.70,
    boss: {
      name: 'Koga',
      title: 'Gym Leader Poison',
      team: [
        { pokemonId: 23, isShiny: false },
        { pokemonId: 24, isShiny: false },
        { pokemonId: 110, isShiny: false },
      ],
      badge: 'Badge Âme',
      reward: 'Débloque la Zone 6 — Sylphe SARL',
    },
    unlockRequirement: 'zone4',
    includesLegendaries: false,
  },
  {
    id: 'zone6',
    name: 'Sylphe SARL',
    description: 'Le QG de Sylphe SARL, plein de mystères psychiques.',
    background: 'linear-gradient(180deg, #1a0a1a 0%, #2a1a3a 50%, #1a0a2a 100%)',
    pokemonIds: [35,36,39,40,52,53,63,64,65,79,80,96,97,103,113,122,132,137],
    completionThreshold: 0.70,
    boss: {
      name: 'Sabrina',
      title: 'Gym Leader Psy',
      team: [
        { pokemonId: 63, isShiny: false },
        { pokemonId: 64, isShiny: false },
        { pokemonId: 65, isShiny: false },
      ],
      badge: 'Badge Marais',
      reward: 'Débloque la Zone 7 — Île Cramoisie',
    },
    unlockRequirement: 'zone5',
    includesLegendaries: false,
  },
  {
    id: 'zone7',
    name: 'Île Cramoisie',
    description: 'Une île volcanique habitée par des Pokémon Feu.',
    background: 'linear-gradient(180deg, #1a0a0a 0%, #3a1a0a 50%, #2a0a0a 100%)',
    pokemonIds: [4,5,6,37,38,58,59,77,78,126,128,129,130,133,134,135,136,147,148,149],
    completionThreshold: 0.70,
    boss: {
      name: 'Blaine',
      title: 'Gym Leader Feu',
      team: [
        { pokemonId: 77, isShiny: false },
        { pokemonId: 78, isShiny: false },
        { pokemonId: 59, isShiny: false },
      ],
      badge: 'Badge Volcan',
      reward: 'Débloque la Zone 8 — Arène de Jadielle',
    },
    unlockRequirement: 'zone6',
    includesLegendaries: false,
  },
  {
    id: 'zone8',
    name: 'Arène de Jadielle',
    description: 'L\'arène finale avant la Ligue Pokémon.',
    background: 'linear-gradient(180deg, #0a0808 0%, #1a1210 50%, #0f0a08 100%)',
    pokemonIds: [27,28,50,51,56,57,66,67,68,74,75,76,83,95,98,99,104,105,106,107,108,111,112,115,123,124,125,127,128,142,143],
    completionThreshold: 0.70,
    boss: {
      name: 'Giovanni',
      title: 'Gym Leader Sol',
      team: [
        { pokemonId: 34, isShiny: false },
        { pokemonId: 31, isShiny: false },
        { pokemonId: 76, isShiny: false },
      ],
      badge: 'Badge Terre',
      reward: 'Débloque la Ligue Pokémon',
    },
    unlockRequirement: 'zone7',
    includesLegendaries: false,
  },
  {
    id: 'ligue',
    name: 'Ligue Pokémon',
    description: 'Le défi ultime. Affronte les meilleurs dresseurs de Kanto.',
    background: 'linear-gradient(180deg, #0a0a0a 0%, #1a1a2a 50%, #0a0a1a 100%)',
    pokemonIds: [],
    completionThreshold: 1.0,
    boss: {
      name: 'La Ligue',
      title: 'Champions de la Ligue',
      team: [
        { pokemonId: 149, isShiny: false },
        { pokemonId: 131, isShiny: false },
        { pokemonId: 130, isShiny: false },
        { pokemonId: 143, isShiny: false },
        { pokemonId: 94, isShiny: false },
      ],
      badge: 'Badge Championnat',
      reward: 'Débloque la Zone Libre — Tous les Pokémon !',
    },
    unlockRequirement: 'zone8',
    includesLegendaries: false,
  },
  {
    id: 'zone_libre',
    name: 'Zone Libre',
    description: 'Tous les Pokémon de Kanto, y compris les légendaires !',
    background: 'linear-gradient(180deg, #1a0a2a 0%, #2a1a4a 30%, #0a1a2a 70%, #0a0a1a 100%)',
    pokemonIds: NON_LEGENDARY_IDS.concat([144, 145, 146, 150, 151]),
    completionThreshold: 1.0,
    boss: null,
    unlockRequirement: 'ligue',
    includesLegendaries: true,
  },
];

export const ZONE_BY_ID: Record<string, Zone> = Object.fromEntries(
  ZONES.map((z) => [z.id, z])
);

export const ZONE_ORDER = ['zone1','zone2','zone3','zone4','zone5','zone6','zone7','zone8','ligue','zone_libre'];
