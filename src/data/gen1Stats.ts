export type MoveCategory = 'physical' | 'special';

export type AnimationType =
  | 'fire'
  | 'water'
  | 'electric'
  | 'grass'
  | 'psychic'
  | 'ice'
  | 'fighting'
  | 'poison'
  | 'ground'
  | 'flying'
  | 'bug'
  | 'rock'
  | 'ghost'
  | 'dragon'
  | 'normal'
  | 'dark'
  | 'steel';

export interface SignatureMove {
  name: string;
  type: string;
  power: number;
  category: MoveCategory;
  animationType: AnimationType;
}

export interface PokemonStatData {
  id: number;
  hp: number;
  attack: number;
  defense: number;
  spAttack: number;
  spDefense: number;
  speed: number;
  baseXp: number;
  move: SignatureMove;
}

export const GEN1_STATS: Record<number, PokemonStatData> = {
  1: {
    id: 1,
    hp: 45, attack: 49, defense: 49, spAttack: 65, spDefense: 65, speed: 45, baseXp: 64,
    move: { name: 'Razor Leaf', type: 'grass', power: 55, category: 'physical', animationType: 'grass' },
  },
  2: {
    id: 2,
    hp: 60, attack: 62, defense: 63, spAttack: 80, spDefense: 80, speed: 60, baseXp: 141,
    move: { name: 'Razor Leaf', type: 'grass', power: 55, category: 'physical', animationType: 'grass' },
  },
  3: {
    id: 3,
    hp: 80, attack: 82, defense: 83, spAttack: 100, spDefense: 100, speed: 80, baseXp: 208,
    move: { name: 'Solar Beam', type: 'grass', power: 120, category: 'special', animationType: 'grass' },
  },
  4: {
    id: 4,
    hp: 39, attack: 52, defense: 43, spAttack: 60, spDefense: 50, speed: 65, baseXp: 62,
    move: { name: 'Ember', type: 'fire', power: 40, category: 'special', animationType: 'fire' },
  },
  5: {
    id: 5,
    hp: 58, attack: 64, defense: 58, spAttack: 80, spDefense: 65, speed: 80, baseXp: 142,
    move: { name: 'Flamethrower', type: 'fire', power: 95, category: 'special', animationType: 'fire' },
  },
  6: {
    id: 6,
    hp: 78, attack: 84, defense: 78, spAttack: 109, spDefense: 85, speed: 100, baseXp: 209,
    move: { name: 'Fire Blast', type: 'fire', power: 120, category: 'special', animationType: 'fire' },
  },
  7: {
    id: 7,
    hp: 44, attack: 48, defense: 65, spAttack: 50, spDefense: 64, speed: 43, baseXp: 63,
    move: { name: 'Water Gun', type: 'water', power: 40, category: 'special', animationType: 'water' },
  },
  8: {
    id: 8,
    hp: 59, attack: 63, defense: 80, spAttack: 65, spDefense: 80, speed: 58, baseXp: 142,
    move: { name: 'Surf', type: 'water', power: 95, category: 'special', animationType: 'water' },
  },
  9: {
    id: 9,
    hp: 79, attack: 83, defense: 100, spAttack: 85, spDefense: 105, speed: 78, baseXp: 210,
    move: { name: 'Hydro Pump', type: 'water', power: 110, category: 'special', animationType: 'water' },
  },
  10: {
    id: 10,
    hp: 45, attack: 30, defense: 35, spAttack: 20, spDefense: 20, speed: 45, baseXp: 53,
    move: { name: 'Tackle', type: 'normal', power: 35, category: 'physical', animationType: 'normal' },
  },
  11: {
    id: 11,
    hp: 50, attack: 20, defense: 55, spAttack: 25, spDefense: 25, speed: 30, baseXp: 72,
    move: { name: 'Tackle', type: 'normal', power: 35, category: 'physical', animationType: 'normal' },
  },
  12: {
    id: 12,
    hp: 60, attack: 45, defense: 50, spAttack: 90, spDefense: 80, speed: 70, baseXp: 160,
    move: { name: 'Bug Buzz', type: 'bug', power: 90, category: 'special', animationType: 'bug' },
  },
  13: {
    id: 13,
    hp: 40, attack: 35, defense: 30, spAttack: 20, spDefense: 20, speed: 50, baseXp: 52,
    move: { name: 'Poison Sting', type: 'poison', power: 15, category: 'physical', animationType: 'poison' },
  },
  14: {
    id: 14,
    hp: 45, attack: 25, defense: 50, spAttack: 25, spDefense: 25, speed: 35, baseXp: 72,
    move: { name: 'Poison Sting', type: 'poison', power: 15, category: 'physical', animationType: 'poison' },
  },
  15: {
    id: 15,
    hp: 65, attack: 90, defense: 40, spAttack: 45, spDefense: 80, speed: 75, baseXp: 159,
    move: { name: 'X-Scissor', type: 'bug', power: 80, category: 'physical', animationType: 'bug' },
  },
  16: {
    id: 16,
    hp: 40, attack: 45, defense: 40, spAttack: 35, spDefense: 35, speed: 56, baseXp: 55,
    move: { name: 'Gust', type: 'flying', power: 40, category: 'special', animationType: 'flying' },
  },
  17: {
    id: 17,
    hp: 63, attack: 60, defense: 55, spAttack: 50, spDefense: 50, speed: 71, baseXp: 113,
    move: { name: 'Wing Attack', type: 'flying', power: 60, category: 'physical', animationType: 'flying' },
  },
  18: {
    id: 18,
    hp: 83, attack: 80, defense: 75, spAttack: 70, spDefense: 70, speed: 91, baseXp: 172,
    move: { name: 'Brave Bird', type: 'flying', power: 120, category: 'physical', animationType: 'flying' },
  },
  19: {
    id: 19,
    hp: 30, attack: 56, defense: 35, spAttack: 25, spDefense: 35, speed: 72, baseXp: 51,
    move: { name: 'Quick Attack', type: 'normal', power: 40, category: 'physical', animationType: 'normal' },
  },
  20: {
    id: 20,
    hp: 55, attack: 81, defense: 60, spAttack: 50, spDefense: 70, speed: 97, baseXp: 145,
    move: { name: 'Hyper Fang', type: 'normal', power: 80, category: 'physical', animationType: 'normal' },
  },
  21: {
    id: 21,
    hp: 40, attack: 60, defense: 30, spAttack: 31, spDefense: 31, speed: 70, baseXp: 52,
    move: { name: 'Peck', type: 'flying', power: 35, category: 'physical', animationType: 'flying' },
  },
  22: {
    id: 22,
    hp: 65, attack: 90, defense: 65, spAttack: 61, spDefense: 61, speed: 100, baseXp: 155,
    move: { name: 'Drill Peck', type: 'flying', power: 80, category: 'physical', animationType: 'flying' },
  },
  23: {
    id: 23,
    hp: 35, attack: 60, defense: 44, spAttack: 40, spDefense: 54, speed: 55, baseXp: 62,
    move: { name: 'Poison Fang', type: 'poison', power: 50, category: 'physical', animationType: 'poison' },
  },
  24: {
    id: 24,
    hp: 60, attack: 95, defense: 69, spAttack: 65, spDefense: 79, speed: 80, baseXp: 147,
    move: { name: 'Gunk Shot', type: 'poison', power: 120, category: 'physical', animationType: 'poison' },
  },
  25: {
    id: 25,
    hp: 35, attack: 55, defense: 40, spAttack: 50, spDefense: 50, speed: 90, baseXp: 82,
    move: { name: 'Thunderbolt', type: 'electric', power: 95, category: 'special', animationType: 'electric' },
  },
  26: {
    id: 26,
    hp: 60, attack: 90, defense: 55, spAttack: 90, spDefense: 80, speed: 110, baseXp: 122,
    move: { name: 'Thunder', type: 'electric', power: 120, category: 'special', animationType: 'electric' },
  },
  27: {
    id: 27,
    hp: 50, attack: 75, defense: 85, spAttack: 20, spDefense: 30, speed: 40, baseXp: 93,
    move: { name: 'Slash', type: 'normal', power: 70, category: 'physical', animationType: 'normal' },
  },
  28: {
    id: 28,
    hp: 75, attack: 100, defense: 110, spAttack: 45, spDefense: 55, speed: 65, baseXp: 163,
    move: { name: 'Earthquake', type: 'ground', power: 100, category: 'physical', animationType: 'ground' },
  },
  29: {
    id: 29,
    hp: 55, attack: 47, defense: 52, spAttack: 40, spDefense: 40, speed: 41, baseXp: 59,
    move: { name: 'Poison Sting', type: 'poison', power: 15, category: 'physical', animationType: 'poison' },
  },
  30: {
    id: 30,
    hp: 70, attack: 62, defense: 67, spAttack: 55, spDefense: 55, speed: 56, baseXp: 117,
    move: { name: 'Poison Fang', type: 'poison', power: 50, category: 'physical', animationType: 'poison' },
  },
  31: {
    id: 31,
    hp: 90, attack: 92, defense: 87, spAttack: 75, spDefense: 85, speed: 76, baseXp: 193,
    move: { name: 'Earthquake', type: 'ground', power: 100, category: 'physical', animationType: 'ground' },
  },
  32: {
    id: 32,
    hp: 46, attack: 57, defense: 40, spAttack: 40, spDefense: 40, speed: 50, baseXp: 60,
    move: { name: 'Poison Sting', type: 'poison', power: 15, category: 'physical', animationType: 'poison' },
  },
  33: {
    id: 33,
    hp: 61, attack: 72, defense: 57, spAttack: 55, spDefense: 55, speed: 65, baseXp: 118,
    move: { name: 'Poison Jab', type: 'poison', power: 80, category: 'physical', animationType: 'poison' },
  },
  34: {
    id: 34,
    hp: 81, attack: 102, defense: 77, spAttack: 85, spDefense: 75, speed: 85, baseXp: 195,
    move: { name: 'Earthquake', type: 'ground', power: 100, category: 'physical', animationType: 'ground' },
  },
  35: {
    id: 35,
    hp: 70, attack: 45, defense: 48, spAttack: 60, spDefense: 65, speed: 35, baseXp: 68,
    move: { name: 'Pound', type: 'normal', power: 40, category: 'physical', animationType: 'normal' },
  },
  36: {
    id: 36,
    hp: 95, attack: 70, defense: 73, spAttack: 85, spDefense: 90, speed: 60, baseXp: 129,
    move: { name: 'Hyper Beam', type: 'normal', power: 150, category: 'special', animationType: 'normal' },
  },
  37: {
    id: 37,
    hp: 38, attack: 41, defense: 40, spAttack: 50, spDefense: 65, speed: 65, baseXp: 63,
    move: { name: 'Ember', type: 'fire', power: 40, category: 'special', animationType: 'fire' },
  },
  38: {
    id: 38,
    hp: 73, attack: 76, defense: 75, spAttack: 81, spDefense: 100, speed: 100, baseXp: 178,
    move: { name: 'Flamethrower', type: 'fire', power: 95, category: 'special', animationType: 'fire' },
  },
  39: {
    id: 39,
    hp: 115, attack: 45, defense: 20, spAttack: 45, spDefense: 25, speed: 20, baseXp: 76,
    move: { name: 'Body Slam', type: 'normal', power: 85, category: 'physical', animationType: 'normal' },
  },
  40: {
    id: 40,
    hp: 140, attack: 70, defense: 45, spAttack: 75, spDefense: 50, speed: 45, baseXp: 109,
    move: { name: 'Hyper Beam', type: 'normal', power: 150, category: 'special', animationType: 'normal' },
  },
  41: {
    id: 41,
    hp: 40, attack: 45, defense: 35, spAttack: 30, spDefense: 40, speed: 55, baseXp: 54,
    move: { name: 'Air Cutter', type: 'flying', power: 55, category: 'special', animationType: 'flying' },
  },
  42: {
    id: 42,
    hp: 75, attack: 80, defense: 70, spAttack: 65, spDefense: 75, speed: 90, baseXp: 171,
    move: { name: 'Air Slash', type: 'flying', power: 75, category: 'special', animationType: 'flying' },
  },
  43: {
    id: 43,
    hp: 45, attack: 50, defense: 55, spAttack: 75, spDefense: 65, speed: 30, baseXp: 78,
    move: { name: 'Absorb', type: 'grass', power: 20, category: 'special', animationType: 'grass' },
  },
  44: {
    id: 44,
    hp: 60, attack: 65, defense: 70, spAttack: 85, spDefense: 75, speed: 40, baseXp: 132,
    move: { name: 'Mega Drain', type: 'grass', power: 40, category: 'special', animationType: 'grass' },
  },
  45: {
    id: 45,
    hp: 75, attack: 80, defense: 85, spAttack: 110, spDefense: 90, speed: 50, baseXp: 184,
    move: { name: 'Petal Dance', type: 'grass', power: 90, category: 'special', animationType: 'grass' },
  },
  46: {
    id: 46,
    hp: 35, attack: 70, defense: 55, spAttack: 45, spDefense: 55, speed: 25, baseXp: 70,
    move: { name: 'X-Scissor', type: 'bug', power: 80, category: 'physical', animationType: 'bug' },
  },
  47: {
    id: 47,
    hp: 60, attack: 95, defense: 80, spAttack: 60, spDefense: 80, speed: 30, baseXp: 128,
    move: { name: 'X-Scissor', type: 'bug', power: 80, category: 'physical', animationType: 'bug' },
  },
  48: {
    id: 48,
    hp: 60, attack: 55, defense: 50, spAttack: 40, spDefense: 55, speed: 45, baseXp: 75,
    move: { name: 'Bug Buzz', type: 'bug', power: 90, category: 'special', animationType: 'bug' },
  },
  49: {
    id: 49,
    hp: 70, attack: 65, defense: 60, spAttack: 90, spDefense: 75, speed: 90, baseXp: 138,
    move: { name: 'Bug Buzz', type: 'bug', power: 90, category: 'special', animationType: 'bug' },
  },
  50: {
    id: 50,
    hp: 10, attack: 55, defense: 25, spAttack: 35, spDefense: 45, speed: 95, baseXp: 81,
    move: { name: 'Dig', type: 'ground', power: 80, category: 'physical', animationType: 'ground' },
  },
  51: {
    id: 51,
    hp: 35, attack: 80, defense: 50, spAttack: 50, spDefense: 70, speed: 120, baseXp: 153,
    move: { name: 'Earthquake', type: 'ground', power: 100, category: 'physical', animationType: 'ground' },
  },
  52: {
    id: 52,
    hp: 40, attack: 45, defense: 35, spAttack: 40, spDefense: 40, speed: 90, baseXp: 69,
    move: { name: 'Slash', type: 'normal', power: 70, category: 'physical', animationType: 'normal' },
  },
  53: {
    id: 53,
    hp: 65, attack: 70, defense: 60, spAttack: 65, spDefense: 65, speed: 115, baseXp: 148,
    move: { name: 'Slash', type: 'normal', power: 70, category: 'physical', animationType: 'normal' },
  },
  54: {
    id: 54,
    hp: 50, attack: 52, defense: 48, spAttack: 65, spDefense: 50, speed: 55, baseXp: 80,
    move: { name: 'Confusion', type: 'psychic', power: 50, category: 'special', animationType: 'psychic' },
  },
  55: {
    id: 55,
    hp: 80, attack: 82, defense: 78, spAttack: 95, spDefense: 80, speed: 85, baseXp: 174,
    move: { name: 'Surf', type: 'water', power: 95, category: 'special', animationType: 'water' },
  },
  56: {
    id: 56,
    hp: 40, attack: 80, defense: 35, spAttack: 35, spDefense: 45, speed: 70, baseXp: 74,
    move: { name: 'Karate Chop', type: 'fighting', power: 50, category: 'physical', animationType: 'fighting' },
  },
  57: {
    id: 57,
    hp: 65, attack: 105, defense: 60, spAttack: 60, spDefense: 70, speed: 95, baseXp: 149,
    move: { name: 'Close Combat', type: 'fighting', power: 120, category: 'physical', animationType: 'fighting' },
  },
  58: {
    id: 58,
    hp: 55, attack: 70, defense: 45, spAttack: 70, spDefense: 50, speed: 60, baseXp: 91,
    move: { name: 'Ember', type: 'fire', power: 40, category: 'special', animationType: 'fire' },
  },
  59: {
    id: 59,
    hp: 90, attack: 110, defense: 80, spAttack: 100, spDefense: 80, speed: 95, baseXp: 194,
    move: { name: 'Flare Blitz', type: 'fire', power: 120, category: 'physical', animationType: 'fire' },
  },
  60: {
    id: 60,
    hp: 40, attack: 50, defense: 40, spAttack: 40, spDefense: 40, speed: 90, baseXp: 77,
    move: { name: 'Water Gun', type: 'water', power: 40, category: 'special', animationType: 'water' },
  },
  61: {
    id: 61,
    hp: 65, attack: 65, defense: 65, spAttack: 50, spDefense: 50, speed: 90, baseXp: 131,
    move: { name: 'Surf', type: 'water', power: 95, category: 'special', animationType: 'water' },
  },
  62: {
    id: 62,
    hp: 90, attack: 95, defense: 95, spAttack: 70, spDefense: 90, speed: 70, baseXp: 185,
    move: { name: 'Waterfall', type: 'water', power: 80, category: 'physical', animationType: 'water' },
  },
  63: {
    id: 63,
    hp: 25, attack: 20, defense: 15, spAttack: 105, spDefense: 55, speed: 90, baseXp: 73,
    move: { name: 'Confusion', type: 'psychic', power: 50, category: 'special', animationType: 'psychic' },
  },
  64: {
    id: 64,
    hp: 40, attack: 35, defense: 30, spAttack: 120, spDefense: 70, speed: 105, baseXp: 145,
    move: { name: 'Psychic', type: 'psychic', power: 90, category: 'special', animationType: 'psychic' },
  },
  65: {
    id: 65,
    hp: 55, attack: 50, defense: 45, spAttack: 135, spDefense: 85, speed: 120, baseXp: 186,
    move: { name: 'Psychic', type: 'psychic', power: 90, category: 'special', animationType: 'psychic' },
  },
  66: {
    id: 66,
    hp: 70, attack: 80, defense: 50, spAttack: 35, spDefense: 35, speed: 35, baseXp: 75,
    move: { name: 'Karate Chop', type: 'fighting', power: 50, category: 'physical', animationType: 'fighting' },
  },
  67: {
    id: 67,
    hp: 80, attack: 100, defense: 70, spAttack: 50, spDefense: 60, speed: 45, baseXp: 146,
    move: { name: 'Brick Break', type: 'fighting', power: 75, category: 'physical', animationType: 'fighting' },
  },
  68: {
    id: 68,
    hp: 90, attack: 130, defense: 80, spAttack: 65, spDefense: 85, speed: 55, baseXp: 193,
    move: { name: 'Close Combat', type: 'fighting', power: 120, category: 'physical', animationType: 'fighting' },
  },
  69: {
    id: 69,
    hp: 50, attack: 75, defense: 35, spAttack: 70, spDefense: 30, speed: 40, baseXp: 84,
    move: { name: 'Vine Whip', type: 'grass', power: 35, category: 'physical', animationType: 'grass' },
  },
  70: {
    id: 70,
    hp: 65, attack: 90, defense: 50, spAttack: 85, spDefense: 45, speed: 55, baseXp: 151,
    move: { name: 'Razor Leaf', type: 'grass', power: 55, category: 'physical', animationType: 'grass' },
  },
  71: {
    id: 71,
    hp: 80, attack: 105, defense: 65, spAttack: 100, spDefense: 60, speed: 70, baseXp: 191,
    move: { name: 'Solar Beam', type: 'grass', power: 120, category: 'special', animationType: 'grass' },
  },
  72: {
    id: 72,
    hp: 40, attack: 40, defense: 35, spAttack: 50, spDefense: 100, speed: 70, baseXp: 67,
    move: { name: 'Acid', type: 'poison', power: 40, category: 'special', animationType: 'poison' },
  },
  73: {
    id: 73,
    hp: 80, attack: 70, defense: 65, spAttack: 80, spDefense: 120, speed: 100, baseXp: 180,
    move: { name: 'Sludge Bomb', type: 'poison', power: 90, category: 'special', animationType: 'poison' },
  },
  74: {
    id: 74,
    hp: 40, attack: 80, defense: 100, spAttack: 30, spDefense: 30, speed: 20, baseXp: 73,
    move: { name: 'Rock Throw', type: 'rock', power: 50, category: 'physical', animationType: 'rock' },
  },
  75: {
    id: 75,
    hp: 55, attack: 95, defense: 115, spAttack: 45, spDefense: 45, speed: 35, baseXp: 134,
    move: { name: 'Rock Slide', type: 'rock', power: 75, category: 'physical', animationType: 'rock' },
  },
  76: {
    id: 76,
    hp: 80, attack: 120, defense: 130, spAttack: 55, spDefense: 65, speed: 45, baseXp: 177,
    move: { name: 'Stone Edge', type: 'rock', power: 100, category: 'physical', animationType: 'rock' },
  },
  77: {
    id: 77,
    hp: 50, attack: 85, defense: 55, spAttack: 65, spDefense: 65, speed: 90, baseXp: 92,
    move: { name: 'Ember', type: 'fire', power: 40, category: 'special', animationType: 'fire' },
  },
  78: {
    id: 78,
    hp: 65, attack: 100, defense: 70, spAttack: 80, spDefense: 80, speed: 105, baseXp: 175,
    move: { name: 'Flare Blitz', type: 'fire', power: 120, category: 'physical', animationType: 'fire' },
  },
  79: {
    id: 79,
    hp: 90, attack: 65, defense: 65, spAttack: 40, spDefense: 40, speed: 15, baseXp: 99,
    move: { name: 'Water Gun', type: 'water', power: 40, category: 'special', animationType: 'water' },
  },
  80: {
    id: 80,
    hp: 95, attack: 75, defense: 110, spAttack: 100, spDefense: 80, speed: 30, baseXp: 164,
    move: { name: 'Surf', type: 'water', power: 95, category: 'special', animationType: 'water' },
  },
  81: {
    id: 81,
    hp: 25, attack: 35, defense: 70, spAttack: 95, spDefense: 55, speed: 45, baseXp: 89,
    move: { name: 'Thunderbolt', type: 'electric', power: 95, category: 'special', animationType: 'electric' },
  },
  82: {
    id: 82,
    hp: 50, attack: 60, defense: 95, spAttack: 120, spDefense: 70, speed: 70, baseXp: 161,
    move: { name: 'Thunderbolt', type: 'electric', power: 95, category: 'special', animationType: 'electric' },
  },
  83: {
    id: 83,
    hp: 52, attack: 65, defense: 55, spAttack: 58, spDefense: 62, speed: 60, baseXp: 94,
    move: { name: 'Slash', type: 'normal', power: 70, category: 'physical', animationType: 'normal' },
  },
  84: {
    id: 84,
    hp: 35, attack: 85, defense: 45, spAttack: 35, spDefense: 35, speed: 75, baseXp: 62,
    move: { name: 'Peck', type: 'flying', power: 35, category: 'physical', animationType: 'flying' },
  },
  85: {
    id: 85,
    hp: 60, attack: 110, defense: 70, spAttack: 60, spDefense: 60, speed: 100, baseXp: 161,
    move: { name: 'Drill Peck', type: 'flying', power: 80, category: 'physical', animationType: 'flying' },
  },
  86: {
    id: 86,
    hp: 65, attack: 45, defense: 55, spAttack: 45, spDefense: 70, speed: 45, baseXp: 91,
    move: { name: 'Ice Shard', type: 'ice', power: 40, category: 'physical', animationType: 'ice' },
  },
  87: {
    id: 87,
    hp: 90, attack: 70, defense: 80, spAttack: 70, spDefense: 95, speed: 70, baseXp: 176,
    move: { name: 'Ice Beam', type: 'ice', power: 95, category: 'special', animationType: 'ice' },
  },
  88: {
    id: 88,
    hp: 80, attack: 80, defense: 50, spAttack: 40, spDefense: 50, speed: 25, baseXp: 90,
    move: { name: 'Sludge', type: 'poison', power: 65, category: 'special', animationType: 'poison' },
  },
  89: {
    id: 89,
    hp: 105, attack: 105, defense: 75, spAttack: 65, spDefense: 100, speed: 50, baseXp: 157,
    move: { name: 'Sludge Bomb', type: 'poison', power: 90, category: 'special', animationType: 'poison' },
  },
  90: {
    id: 90,
    hp: 30, attack: 65, defense: 100, spAttack: 45, spDefense: 25, speed: 40, baseXp: 61,
    move: { name: 'Water Gun', type: 'water', power: 40, category: 'special', animationType: 'water' },
  },
  91: {
    id: 91,
    hp: 50, attack: 95, defense: 180, spAttack: 85, spDefense: 45, speed: 70, baseXp: 184,
    move: { name: 'Blizzard', type: 'ice', power: 120, category: 'special', animationType: 'ice' },
  },
  92: {
    id: 92,
    hp: 30, attack: 35, defense: 30, spAttack: 100, spDefense: 35, speed: 80, baseXp: 95,
    move: { name: 'Shadow Ball', type: 'ghost', power: 80, category: 'special', animationType: 'ghost' },
  },
  93: {
    id: 93,
    hp: 45, attack: 50, defense: 45, spAttack: 115, spDefense: 55, speed: 95, baseXp: 126,
    move: { name: 'Shadow Ball', type: 'ghost', power: 80, category: 'special', animationType: 'ghost' },
  },
  94: {
    id: 94,
    hp: 60, attack: 65, defense: 60, spAttack: 130, spDefense: 75, speed: 110, baseXp: 190,
    move: { name: 'Shadow Ball', type: 'ghost', power: 80, category: 'special', animationType: 'ghost' },
  },
  95: {
    id: 95,
    hp: 35, attack: 45, defense: 160, spAttack: 30, spDefense: 45, speed: 70, baseXp: 108,
    move: { name: 'Stone Edge', type: 'rock', power: 100, category: 'physical', animationType: 'rock' },
  },
  96: {
    id: 96,
    hp: 60, attack: 48, defense: 45, spAttack: 43, spDefense: 90, speed: 42, baseXp: 102,
    move: { name: 'Confusion', type: 'psychic', power: 50, category: 'special', animationType: 'psychic' },
  },
  97: {
    id: 97,
    hp: 85, attack: 73, defense: 70, spAttack: 73, spDefense: 115, speed: 67, baseXp: 165,
    move: { name: 'Psychic', type: 'psychic', power: 90, category: 'special', animationType: 'psychic' },
  },
  98: {
    id: 98,
    hp: 30, attack: 105, defense: 90, spAttack: 25, spDefense: 25, speed: 50, baseXp: 65,
    move: { name: 'Crabhammer', type: 'water', power: 90, category: 'physical', animationType: 'water' },
  },
  99: {
    id: 99,
    hp: 55, attack: 130, defense: 115, spAttack: 50, spDefense: 50, speed: 75, baseXp: 167,
    move: { name: 'Crabhammer', type: 'water', power: 90, category: 'physical', animationType: 'water' },
  },
  100: {
    id: 100,
    hp: 40, attack: 30, defense: 50, spAttack: 55, spDefense: 55, speed: 100, baseXp: 103,
    move: { name: 'Thunderbolt', type: 'electric', power: 95, category: 'special', animationType: 'electric' },
  },
  101: {
    id: 101,
    hp: 60, attack: 50, defense: 70, spAttack: 80, spDefense: 80, speed: 140, baseXp: 150,
    move: { name: 'Thunder', type: 'electric', power: 120, category: 'special', animationType: 'electric' },
  },
  102: {
    id: 102,
    hp: 60, attack: 40, defense: 80, spAttack: 60, spDefense: 45, speed: 40, baseXp: 98,
    move: { name: 'Confusion', type: 'psychic', power: 50, category: 'special', animationType: 'psychic' },
  },
  103: {
    id: 103,
    hp: 95, attack: 95, defense: 85, spAttack: 125, spDefense: 65, speed: 55, baseXp: 182,
    move: { name: 'Psychic', type: 'psychic', power: 90, category: 'special', animationType: 'psychic' },
  },
  104: {
    id: 104,
    hp: 50, attack: 50, defense: 95, spAttack: 40, spDefense: 50, speed: 35, baseXp: 87,
    move: { name: 'Bone Club', type: 'ground', power: 65, category: 'physical', animationType: 'ground' },
  },
  105: {
    id: 105,
    hp: 60, attack: 80, defense: 110, spAttack: 50, spDefense: 80, speed: 45, baseXp: 124,
    move: { name: 'Earthquake', type: 'ground', power: 100, category: 'physical', animationType: 'ground' },
  },
  106: {
    id: 106,
    hp: 50, attack: 120, defense: 53, spAttack: 35, spDefense: 110, speed: 87, baseXp: 139,
    move: { name: 'Hi Jump Kick', type: 'fighting', power: 100, category: 'physical', animationType: 'fighting' },
  },
  107: {
    id: 107,
    hp: 50, attack: 105, defense: 79, spAttack: 35, spDefense: 110, speed: 76, baseXp: 140,
    move: { name: 'Close Combat', type: 'fighting', power: 120, category: 'physical', animationType: 'fighting' },
  },
  108: {
    id: 108,
    hp: 90, attack: 55, defense: 75, spAttack: 60, spDefense: 75, speed: 30, baseXp: 127,
    move: { name: 'Lick', type: 'ghost', power: 20, category: 'physical', animationType: 'ghost' },
  },
  109: {
    id: 109,
    hp: 40, attack: 65, defense: 95, spAttack: 60, spDefense: 45, speed: 35, baseXp: 114,
    move: { name: 'Sludge', type: 'poison', power: 65, category: 'special', animationType: 'poison' },
  },
  110: {
    id: 110,
    hp: 65, attack: 90, defense: 120, spAttack: 85, spDefense: 70, speed: 60, baseXp: 173,
    move: { name: 'Sludge Bomb', type: 'poison', power: 90, category: 'special', animationType: 'poison' },
  },
  111: {
    id: 111,
    hp: 80, attack: 85, defense: 95, spAttack: 30, spDefense: 30, speed: 25, baseXp: 135,
    move: { name: 'Rock Slide', type: 'rock', power: 75, category: 'physical', animationType: 'rock' },
  },
  112: {
    id: 112,
    hp: 105, attack: 130, defense: 120, spAttack: 45, spDefense: 45, speed: 40, baseXp: 204,
    move: { name: 'Earthquake', type: 'ground', power: 100, category: 'physical', animationType: 'ground' },
  },
  113: {
    id: 113,
    hp: 250, attack: 5, defense: 5, spAttack: 35, spDefense: 105, speed: 50, baseXp: 255,
    move: { name: 'Egg Bomb', type: 'normal', power: 100, category: 'physical', animationType: 'normal' },
  },
  114: {
    id: 114,
    hp: 65, attack: 55, defense: 115, spAttack: 100, spDefense: 40, speed: 60, baseXp: 166,
    move: { name: 'Power Whip', type: 'grass', power: 120, category: 'physical', animationType: 'grass' },
  },
  115: {
    id: 115,
    hp: 105, attack: 95, defense: 80, spAttack: 40, spDefense: 80, speed: 90, baseXp: 175,
    move: { name: 'Body Slam', type: 'normal', power: 85, category: 'physical', animationType: 'normal' },
  },
  116: {
    id: 116,
    hp: 30, attack: 40, defense: 70, spAttack: 70, spDefense: 25, speed: 60, baseXp: 83,
    move: { name: 'Water Gun', type: 'water', power: 40, category: 'special', animationType: 'water' },
  },
  117: {
    id: 117,
    hp: 55, attack: 65, defense: 95, spAttack: 95, spDefense: 45, speed: 85, baseXp: 155,
    move: { name: 'Hydro Pump', type: 'water', power: 110, category: 'special', animationType: 'water' },
  },
  118: {
    id: 118,
    hp: 45, attack: 67, defense: 60, spAttack: 35, spDefense: 50, speed: 63, baseXp: 111,
    move: { name: 'Waterfall', type: 'water', power: 80, category: 'physical', animationType: 'water' },
  },
  119: {
    id: 119,
    hp: 80, attack: 92, defense: 65, spAttack: 65, spDefense: 80, speed: 68, baseXp: 170,
    move: { name: 'Waterfall', type: 'water', power: 80, category: 'physical', animationType: 'water' },
  },
  120: {
    id: 120,
    hp: 30, attack: 45, defense: 55, spAttack: 70, spDefense: 55, speed: 85, baseXp: 106,
    move: { name: 'Water Pulse', type: 'water', power: 60, category: 'special', animationType: 'water' },
  },
  121: {
    id: 121,
    hp: 60, attack: 75, defense: 85, spAttack: 100, spDefense: 85, speed: 115, baseXp: 207,
    move: { name: 'Surf', type: 'water', power: 95, category: 'special', animationType: 'water' },
  },
  122: {
    id: 122,
    hp: 40, attack: 45, defense: 65, spAttack: 100, spDefense: 120, speed: 90, baseXp: 136,
    move: { name: 'Psychic', type: 'psychic', power: 90, category: 'special', animationType: 'psychic' },
  },
  123: {
    id: 123,
    hp: 70, attack: 110, defense: 80, spAttack: 55, spDefense: 80, speed: 105, baseXp: 187,
    move: { name: 'X-Scissor', type: 'bug', power: 80, category: 'physical', animationType: 'bug' },
  },
  124: {
    id: 124,
    hp: 65, attack: 50, defense: 35, spAttack: 115, spDefense: 95, speed: 95, baseXp: 137,
    move: { name: 'Blizzard', type: 'ice', power: 120, category: 'special', animationType: 'ice' },
  },
  125: {
    id: 125,
    hp: 65, attack: 83, defense: 57, spAttack: 95, spDefense: 85, speed: 105, baseXp: 156,
    move: { name: 'Thunderbolt', type: 'electric', power: 95, category: 'special', animationType: 'electric' },
  },
  126: {
    id: 126,
    hp: 65, attack: 95, defense: 57, spAttack: 100, spDefense: 85, speed: 93, baseXp: 167,
    move: { name: 'Fire Blast', type: 'fire', power: 120, category: 'special', animationType: 'fire' },
  },
  127: {
    id: 127,
    hp: 65, attack: 125, defense: 100, spAttack: 55, spDefense: 70, speed: 85, baseXp: 200,
    move: { name: 'X-Scissor', type: 'bug', power: 80, category: 'physical', animationType: 'bug' },
  },
  128: {
    id: 128,
    hp: 75, attack: 100, defense: 95, spAttack: 40, spDefense: 70, speed: 110, baseXp: 172,
    move: { name: 'Body Slam', type: 'normal', power: 85, category: 'physical', animationType: 'normal' },
  },
  129: {
    id: 129,
    hp: 20, attack: 10, defense: 55, spAttack: 15, spDefense: 20, speed: 80, baseXp: 40,
    move: { name: 'Tackle', type: 'normal', power: 35, category: 'physical', animationType: 'normal' },
  },
  130: {
    id: 130,
    hp: 95, attack: 125, defense: 79, spAttack: 60, spDefense: 100, speed: 81, baseXp: 189,
    move: { name: 'Waterfall', type: 'water', power: 80, category: 'physical', animationType: 'water' },
  },
  131: {
    id: 131,
    hp: 130, attack: 85, defense: 80, spAttack: 85, spDefense: 95, speed: 60, baseXp: 219,
    move: { name: 'Ice Beam', type: 'ice', power: 95, category: 'special', animationType: 'ice' },
  },
  132: {
    id: 132,
    hp: 48, attack: 48, defense: 48, spAttack: 48, spDefense: 48, speed: 48, baseXp: 101,
    move: { name: 'Pound', type: 'normal', power: 40, category: 'physical', animationType: 'normal' },
  },
  133: {
    id: 133,
    hp: 55, attack: 55, defense: 50, spAttack: 45, spDefense: 65, speed: 55, baseXp: 92,
    move: { name: 'Quick Attack', type: 'normal', power: 40, category: 'physical', animationType: 'normal' },
  },
  134: {
    id: 134,
    hp: 130, attack: 65, defense: 60, spAttack: 110, spDefense: 95, speed: 65, baseXp: 196,
    move: { name: 'Surf', type: 'water', power: 95, category: 'special', animationType: 'water' },
  },
  135: {
    id: 135,
    hp: 65, attack: 65, defense: 60, spAttack: 110, spDefense: 95, speed: 130, baseXp: 197,
    move: { name: 'Thunderbolt', type: 'electric', power: 95, category: 'special', animationType: 'electric' },
  },
  136: {
    id: 136,
    hp: 65, attack: 130, defense: 60, spAttack: 95, spDefense: 110, speed: 65, baseXp: 198,
    move: { name: 'Flare Blitz', type: 'fire', power: 120, category: 'physical', animationType: 'fire' },
  },
  137: {
    id: 137,
    hp: 65, attack: 60, defense: 70, spAttack: 85, spDefense: 75, speed: 40, baseXp: 130,
    move: { name: 'Tri Attack', type: 'normal', power: 80, category: 'special', animationType: 'normal' },
  },
  138: {
    id: 138,
    hp: 35, attack: 40, defense: 100, spAttack: 90, spDefense: 55, speed: 35, baseXp: 99,
    move: { name: 'Water Gun', type: 'water', power: 40, category: 'special', animationType: 'water' },
  },
  139: {
    id: 139,
    hp: 70, attack: 60, defense: 125, spAttack: 115, spDefense: 70, speed: 55, baseXp: 173,
    move: { name: 'Hydro Pump', type: 'water', power: 110, category: 'special', animationType: 'water' },
  },
  140: {
    id: 140,
    hp: 30, attack: 80, defense: 90, spAttack: 55, spDefense: 45, speed: 55, baseXp: 99,
    move: { name: 'Rock Slide', type: 'rock', power: 75, category: 'physical', animationType: 'rock' },
  },
  141: {
    id: 141,
    hp: 60, attack: 115, defense: 105, spAttack: 65, spDefense: 70, speed: 80, baseXp: 182,
    move: { name: 'Stone Edge', type: 'rock', power: 100, category: 'physical', animationType: 'rock' },
  },
  142: {
    id: 142,
    hp: 80, attack: 105, defense: 65, spAttack: 60, spDefense: 75, speed: 130, baseXp: 202,
    move: { name: 'Stone Edge', type: 'rock', power: 100, category: 'physical', animationType: 'rock' },
  },
  143: {
    id: 143,
    hp: 160, attack: 110, defense: 65, spAttack: 65, spDefense: 110, speed: 30, baseXp: 154,
    move: { name: 'Body Slam', type: 'normal', power: 85, category: 'physical', animationType: 'normal' },
  },
  144: {
    id: 144,
    hp: 90, attack: 85, defense: 100, spAttack: 95, spDefense: 125, speed: 85, baseXp: 261,
    move: { name: 'Blizzard', type: 'ice', power: 120, category: 'special', animationType: 'ice' },
  },
  145: {
    id: 145,
    hp: 90, attack: 90, defense: 85, spAttack: 125, spDefense: 90, speed: 100, baseXp: 261,
    move: { name: 'Thunder', type: 'electric', power: 120, category: 'special', animationType: 'electric' },
  },
  146: {
    id: 146,
    hp: 90, attack: 100, defense: 90, spAttack: 125, spDefense: 85, speed: 90, baseXp: 261,
    move: { name: 'Fire Blast', type: 'fire', power: 120, category: 'special', animationType: 'fire' },
  },
  147: {
    id: 147,
    hp: 41, attack: 64, defense: 45, spAttack: 50, spDefense: 50, speed: 50, baseXp: 67,
    move: { name: 'Dragon Pulse', type: 'dragon', power: 90, category: 'special', animationType: 'dragon' },
  },
  148: {
    id: 148,
    hp: 61, attack: 84, defense: 65, spAttack: 70, spDefense: 70, speed: 70, baseXp: 144,
    move: { name: 'Dragon Pulse', type: 'dragon', power: 90, category: 'special', animationType: 'dragon' },
  },
  149: {
    id: 149,
    hp: 91, attack: 134, defense: 95, spAttack: 100, spDefense: 100, speed: 80, baseXp: 218,
    move: { name: 'Outrage', type: 'dragon', power: 120, category: 'physical', animationType: 'dragon' },
  },
  150: {
    id: 150,
    hp: 106, attack: 110, defense: 90, spAttack: 154, spDefense: 90, speed: 130, baseXp: 220,
    move: { name: 'Psystrike', type: 'psychic', power: 100, category: 'special', animationType: 'psychic' },
  },
  151: {
    id: 151,
    hp: 100, attack: 100, defense: 100, spAttack: 100, spDefense: 100, speed: 100, baseXp: 64,
    move: { name: 'Psychic', type: 'psychic', power: 90, category: 'special', animationType: 'psychic' },
  },
};
