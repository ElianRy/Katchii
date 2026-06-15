export type MoveCategory = 'physical' | 'special' | 'status';
export type StatusEffect = 'burn' | 'poison' | 'paralysis' | 'sleep' | 'freeze';
export type AnimationType = 'fire' | 'water' | 'electric' | 'grass' | 'psychic' | 'ice' | 'fighting' | 'poison' | 'ground' | 'flying' | 'bug' | 'rock' | 'ghost' | 'dragon' | 'normal' | 'dark' | 'steel';

export interface Move {
  name: string;
  type: string;
  category: MoveCategory;
  power: number;
  accuracy: number;
  pp: number;
  effect?: { type: StatusEffect; chance: number };
  recoil?: number;
}

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
  evYield: Partial<Record<'hp' | 'attack' | 'defense' | 'spAttack' | 'spDefense' | 'speed', number>>;
  moves: [Move, Move, Move, Move];
}

const TACKLE: Move = { name: 'Charge', type: 'normal', category: 'physical', power: 35, accuracy: 95, pp: 35 };
const GROWL: Move = { name: 'Rugissement', type: 'normal', category: 'status', power: 0, accuracy: 100, pp: 40 };
const SCRATCH: Move = { name: 'Griffe', type: 'normal', category: 'physical', power: 40, accuracy: 100, pp: 35 };
const TAIL_WHIP: Move = { name: 'Jackpot', type: 'normal', category: 'status', power: 0, accuracy: 100, pp: 10 };
const BITE: Move = { name: 'Morsure', type: 'dark', category: 'physical', power: 60, accuracy: 100, pp: 25 };
const EMBER: Move = { name: 'Flammèche', type: 'fire', category: 'special', power: 40, accuracy: 100, pp: 25, effect: { type: 'burn', chance: 10 } };
const FLAMETHROWER: Move = { name: 'Lance-Flammes', type: 'fire', category: 'special', power: 95, accuracy: 100, pp: 15, effect: { type: 'burn', chance: 10 } };
const FIRE_BLAST: Move = { name: 'Déflagration', type: 'fire', category: 'special', power: 110, accuracy: 85, pp: 5, effect: { type: 'burn', chance: 10 } };
const WATER_GUN: Move = { name: 'Pistolet à O', type: 'water', category: 'special', power: 40, accuracy: 100, pp: 25 };
const SURF: Move = { name: 'Surf', type: 'water', category: 'special', power: 95, accuracy: 100, pp: 15 };
const HYDRO_PUMP: Move = { name: 'Hydrocanon', type: 'water', category: 'special', power: 110, accuracy: 80, pp: 5 };
const RAZOR_LEAF: Move = { name: 'Tranche', type: 'grass', category: 'physical', power: 55, accuracy: 95, pp: 25 };
const SOLAR_BEAM: Move = { name: 'Lance-Soleil', type: 'grass', category: 'special', power: 120, accuracy: 100, pp: 10 };
const THUNDER: Move = { name: 'Fatal-Foudre', type: 'electric', category: 'special', power: 120, accuracy: 50, pp: 5, effect: { type: 'paralysis', chance: 100 } };
const THUNDERBOLT: Move = { name: 'Tonnerre', type: 'electric', category: 'special', power: 95, accuracy: 100, pp: 15, effect: { type: 'paralysis', chance: 10 } };
const THUNDER_SHOCK: Move = { name: 'Éclair', type: 'electric', category: 'special', power: 40, accuracy: 100, pp: 30, effect: { type: 'paralysis', chance: 10 } };
const PSYCHIC: Move = { name: 'Psyko', type: 'psychic', category: 'special', power: 90, accuracy: 100, pp: 10 };
const PSYBEAM: Move = { name: 'Rafale Psy', type: 'psychic', category: 'special', power: 65, accuracy: 100, pp: 20 };
const BLIZZARD: Move = { name: 'Blizzard', type: 'ice', category: 'special', power: 110, accuracy: 70, pp: 5, effect: { type: 'freeze', chance: 10 } };
const ICE_BEAM: Move = { name: 'Laser Glace', type: 'ice', category: 'special', power: 95, accuracy: 100, pp: 10, effect: { type: 'freeze', chance: 10 } };
const EARTHQUAKE: Move = { name: 'Séisme', type: 'ground', category: 'physical', power: 100, accuracy: 100, pp: 10 };
const ROCK_THROW: Move = { name: 'Éclate-Roc', type: 'rock', category: 'physical', power: 50, accuracy: 90, pp: 15 };
const AERIAL_ACE: Move = { name: 'Tranche-Air', type: 'flying', category: 'physical', power: 60, accuracy: 100, pp: 20 };
const WING_ATTACK: Move = { name: 'Aile d\'Acier', type: 'flying', category: 'physical', power: 60, accuracy: 100, pp: 35 };
const PECK: Move = { name: 'Bec Vrille', type: 'flying', category: 'physical', power: 35, accuracy: 100, pp: 35 };
const POISON_STING: Move = { name: 'Dard-Venin', type: 'poison', category: 'physical', power: 15, accuracy: 100, pp: 35, effect: { type: 'poison', chance: 30 } };
const ACID: Move = { name: 'Acide', type: 'poison', category: 'special', power: 40, accuracy: 100, pp: 30 };
const SMOG: Move = { name: 'Smog', type: 'poison', category: 'special', power: 20, accuracy: 70, pp: 20, effect: { type: 'poison', chance: 40 } };
const NIGHT_SHADE: Move = { name: 'Ombre Nuit', type: 'ghost', category: 'physical', power: 70, accuracy: 100, pp: 15 };
const DRAGON_RAGE: Move = { name: 'Colère', type: 'dragon', category: 'special', power: 80, accuracy: 100, pp: 10 };
const CLOSE_COMBAT: Move = { name: 'Close Combat', type: 'fighting', category: 'physical', power: 120, accuracy: 100, pp: 5 };
const KARATE_CHOP: Move = { name: 'Poing Karaté', type: 'fighting', category: 'physical', power: 50, accuracy: 100, pp: 25 };
const LOW_KICK: Move = { name: 'Balayage', type: 'fighting', category: 'physical', power: 65, accuracy: 100, pp: 20 };
const X_SCISSOR: Move = { name: 'X-Ciseau', type: 'bug', category: 'physical', power: 80, accuracy: 100, pp: 15 };
const CUT: Move = { name: 'Coupe', type: 'normal', category: 'physical', power: 50, accuracy: 95, pp: 30 };
const SWIFT: Move = { name: 'Météores', type: 'normal', category: 'special', power: 60, accuracy: 100, pp: 20 };
const BODY_SLAM: Move = { name: 'Plaquage', type: 'normal', category: 'physical', power: 85, accuracy: 100, pp: 15, effect: { type: 'paralysis', chance: 30 } };
const HYPER_FANG: Move = { name: 'Hyper Croc', type: 'normal', category: 'physical', power: 80, accuracy: 90, pp: 15 };
const WRAP: Move = { name: 'Ligotage', type: 'normal', category: 'physical', power: 15, accuracy: 90, pp: 20 };
const POUND: Move = { name: 'Frappe', type: 'normal', category: 'physical', power: 40, accuracy: 100, pp: 35 };
const SING: Move = { name: 'Berceuse', type: 'normal', category: 'status', power: 0, accuracy: 55, pp: 15, effect: { type: 'sleep', chance: 100 } };
const HYPNOSIS: Move = { name: 'Hypnose', type: 'psychic', category: 'status', power: 0, accuracy: 60, pp: 20, effect: { type: 'sleep', chance: 100 } };
const SLEEP_POWDER: Move = { name: 'Poudre Dodo', type: 'grass', category: 'status', power: 0, accuracy: 75, pp: 15, effect: { type: 'sleep', chance: 100 } };
// STUN_SPORE available for future use
const POISON_POWDER: Move = { name: 'Poudre Toxik', type: 'poison', category: 'status', power: 0, accuracy: 75, pp: 35, effect: { type: 'poison', chance: 100 } };
const LEECH_SEED: Move = { name: 'Vampigraine', type: 'grass', category: 'status', power: 0, accuracy: 90, pp: 10 };
// MINIMIZE available for future use
const TELEPORT: Move = { name: 'Téléport', type: 'psychic', category: 'status', power: 0, accuracy: 100, pp: 20 };
const HARDEN: Move = { name: 'Harden', type: 'normal', category: 'status', power: 0, accuracy: 100, pp: 30 };
const SUPERSONIC: Move = { name: 'Ultrason', type: 'normal', category: 'status', power: 0, accuracy: 55, pp: 20 };
const CONFUSE_RAY: Move = { name: 'Onde Folle', type: 'ghost', category: 'status', power: 0, accuracy: 100, pp: 10 };
const STRING_SHOT: Move = { name: 'Sécrétion', type: 'bug', category: 'status', power: 0, accuracy: 95, pp: 40 };
const TRANSFORM: Move = { name: 'Métamorph', type: 'normal', category: 'status', power: 0, accuracy: 100, pp: 10 };
const AMNESIA: Move = { name: 'Amnésie', type: 'psychic', category: 'status', power: 0, accuracy: 100, pp: 20 };
const SONIC_BOOM: Move = { name: 'Ultrason', type: 'normal', category: 'special', power: 40, accuracy: 90, pp: 20 };
const SLAM: Move = { name: 'Mâchouille', type: 'normal', category: 'physical', power: 80, accuracy: 75, pp: 20 };
const RECOVER: Move = { name: 'Soin', type: 'normal', category: 'status', power: 0, accuracy: 100, pp: 10 };
const FIRE_PUNCH: Move = { name: 'Poing-Feu', type: 'fire', category: 'physical', power: 75, accuracy: 100, pp: 15, effect: { type: 'burn', chance: 10 } };
// DIZZY_PUNCH available for future use
const STOMP: Move = { name: 'Piétinage', type: 'normal', category: 'physical', power: 65, accuracy: 100, pp: 20 };
const DOUBLE_KICK: Move = { name: 'Double Pied', type: 'fighting', category: 'physical', power: 30, accuracy: 100, pp: 30 };
const LEER: Move = { name: 'Groz\'Yeux', type: 'normal', category: 'status', power: 0, accuracy: 100, pp: 30 };
const FURY_ATTACK: Move = { name: 'Frénésie', type: 'normal', category: 'physical', power: 15, accuracy: 85, pp: 20 };
const PIN_MISSILE: Move = { name: 'Dard-Missile', type: 'bug', category: 'physical', power: 14, accuracy: 85, pp: 20 };
const TOXIC: Move = { name: 'Détérioration', type: 'poison', category: 'status', power: 0, accuracy: 90, pp: 10, effect: { type: 'poison', chance: 100 } };
const METRONOME: Move = { name: 'Copie', type: 'normal', category: 'special', power: 55, accuracy: 100, pp: 15 };

export const GEN1_STATS: Record<number, PokemonStatData> = {
  1: { id: 1, hp: 45, attack: 49, defense: 49, spAttack: 65, spDefense: 65, speed: 45, baseXp: 64, evYield: { spAttack: 1 }, moves: [RAZOR_LEAF, TACKLE, LEECH_SEED, TOXIC] },
  2: { id: 2, hp: 60, attack: 62, defense: 63, spAttack: 80, spDefense: 80, speed: 60, baseXp: 141, evYield: { spAttack: 1, spDefense: 1 }, moves: [RAZOR_LEAF, TACKLE, LEECH_SEED, TOXIC] },
  3: { id: 3, hp: 80, attack: 82, defense: 83, spAttack: 100, spDefense: 100, speed: 80, baseXp: 208, evYield: { spAttack: 2, spDefense: 1 }, moves: [SOLAR_BEAM, RAZOR_LEAF, TACKLE, TOXIC] },
  4: { id: 4, hp: 39, attack: 52, defense: 43, spAttack: 60, spDefense: 50, speed: 65, baseXp: 62, evYield: { speed: 1 }, moves: [EMBER, SCRATCH, GROWL, TACKLE] },
  5: { id: 5, hp: 58, attack: 64, defense: 58, spAttack: 80, spDefense: 65, speed: 80, baseXp: 142, evYield: { speed: 1, spAttack: 1 }, moves: [EMBER, SCRATCH, GROWL, FLAMETHROWER] },
  6: { id: 6, hp: 78, attack: 84, defense: 78, spAttack: 109, spDefense: 85, speed: 100, baseXp: 209, evYield: { spAttack: 3 }, moves: [FLAMETHROWER, AERIAL_ACE, GROWL, FIRE_BLAST] },
  7: { id: 7, hp: 44, attack: 48, defense: 65, spAttack: 50, spDefense: 64, speed: 43, baseXp: 63, evYield: { defense: 1 }, moves: [WATER_GUN, TAIL_WHIP, GROWL, BITE] },
  8: { id: 8, hp: 59, attack: 63, defense: 80, spAttack: 65, spDefense: 80, speed: 58, baseXp: 142, evYield: { defense: 1, spDefense: 1 }, moves: [SURF, TAIL_WHIP, GROWL, BITE] },
  9: { id: 9, hp: 79, attack: 83, defense: 100, spAttack: 85, spDefense: 105, speed: 78, baseXp: 210, evYield: { defense: 3 }, moves: [HYDRO_PUMP, SURF, TAIL_WHIP, BITE] },
  10: { id: 10, hp: 45, attack: 30, defense: 35, spAttack: 20, spDefense: 20, speed: 45, baseXp: 39, evYield: { hp: 1 }, moves: [TACKLE, GROWL, STRING_SHOT, TACKLE] },
  11: { id: 11, hp: 50, attack: 20, defense: 55, spAttack: 25, spDefense: 25, speed: 30, baseXp: 72, evYield: { defense: 1 }, moves: [HARDEN, HARDEN, TACKLE, HARDEN] },
  12: { id: 12, hp: 60, attack: 45, defense: 50, spAttack: 90, spDefense: 80, speed: 70, baseXp: 178, evYield: { spAttack: 2, spDefense: 1 }, moves: [PSYBEAM, TACKLE, POISON_POWDER, HYPNOSIS] },
  13: { id: 13, hp: 40, attack: 35, defense: 30, spAttack: 20, spDefense: 20, speed: 50, baseXp: 39, evYield: { speed: 1 }, moves: [POISON_STING, TACKLE, GROWL, POISON_STING] },
  14: { id: 14, hp: 45, attack: 25, defense: 50, spAttack: 25, spDefense: 25, speed: 35, baseXp: 72, evYield: { defense: 1 }, moves: [HARDEN, HARDEN, TACKLE, HARDEN] },
  15: { id: 15, hp: 65, attack: 90, defense: 40, spAttack: 45, spDefense: 80, speed: 75, baseXp: 178, evYield: { attack: 2, spDefense: 1 }, moves: [PIN_MISSILE, TAIL_WHIP, POISON_STING, CUT] },
  16: { id: 16, hp: 40, attack: 45, defense: 40, spAttack: 35, spDefense: 35, speed: 56, baseXp: 50, evYield: { speed: 1 }, moves: [TACKLE, GROWL, PECK, TAIL_WHIP] },
  17: { id: 17, hp: 63, attack: 60, defense: 55, spAttack: 50, spDefense: 50, speed: 71, baseXp: 122, evYield: { speed: 1, attack: 1 }, moves: [AERIAL_ACE, GROWL, PECK, TAIL_WHIP] },
  18: { id: 18, hp: 83, attack: 80, defense: 75, spAttack: 70, spDefense: 70, speed: 101, baseXp: 172, evYield: { speed: 3 }, moves: [AERIAL_ACE, WING_ATTACK, GROWL, PECK] },
  19: { id: 19, hp: 30, attack: 56, defense: 35, spAttack: 25, spDefense: 35, speed: 72, baseXp: 51, evYield: { speed: 1 }, moves: [TAIL_WHIP, BITE, TACKLE, GROWL] },
  20: { id: 20, hp: 55, attack: 81, defense: 60, spAttack: 50, spDefense: 70, speed: 97, baseXp: 145, evYield: { speed: 2, attack: 1 }, moves: [HYPER_FANG, BITE, TAIL_WHIP, GROWL] },
  21: { id: 21, hp: 40, attack: 60, defense: 30, spAttack: 31, spDefense: 31, speed: 70, baseXp: 52, evYield: { speed: 1 }, moves: [PECK, SCRATCH, GROWL, TAIL_WHIP] },
  22: { id: 22, hp: 65, attack: 90, defense: 65, spAttack: 61, spDefense: 61, speed: 100, baseXp: 155, evYield: { speed: 1, attack: 2 }, moves: [PECK, AERIAL_ACE, GROWL, WING_ATTACK] },
  23: { id: 23, hp: 35, attack: 60, defense: 44, spAttack: 40, spDefense: 54, speed: 55, baseXp: 58, evYield: { attack: 1 }, moves: [WRAP, POISON_STING, BITE, TAIL_WHIP] },
  24: { id: 24, hp: 60, attack: 95, defense: 69, spAttack: 65, spDefense: 79, speed: 80, baseXp: 153, evYield: { attack: 2, spDefense: 1 }, moves: [BITE, POISON_STING, WRAP, TAIL_WHIP] },
  25: { id: 25, hp: 35, attack: 55, defense: 40, spAttack: 50, spDefense: 50, speed: 90, baseXp: 105, evYield: { speed: 2 }, moves: [THUNDERBOLT, THUNDER_SHOCK, TAIL_WHIP, SCRATCH] },
  26: { id: 26, hp: 60, attack: 90, defense: 55, spAttack: 90, spDefense: 80, speed: 110, baseXp: 218, evYield: { speed: 3 }, moves: [THUNDERBOLT, THUNDER, TAIL_WHIP, BODY_SLAM] },
  27: { id: 27, hp: 50, attack: 75, defense: 85, spAttack: 20, spDefense: 30, speed: 40, baseXp: 93, evYield: { defense: 1 }, moves: [SCRATCH, SWIFT, TAIL_WHIP, GROWL] },
  28: { id: 28, hp: 75, attack: 100, defense: 110, spAttack: 45, spDefense: 55, speed: 65, baseXp: 163, evYield: { defense: 2, attack: 1 }, moves: [SCRATCH, SWIFT, EARTHQUAKE, GROWL] },
  29: { id: 29, hp: 55, attack: 47, defense: 52, spAttack: 40, spDefense: 40, speed: 41, baseXp: 55, evYield: { hp: 1 }, moves: [POISON_STING, TACKLE, GROWL, DOUBLE_KICK] },
  30: { id: 30, hp: 70, attack: 62, defense: 67, spAttack: 55, spDefense: 55, speed: 56, baseXp: 128, evYield: { hp: 1, defense: 1 }, moves: [POISON_STING, BITE, GROWL, DOUBLE_KICK] },
  31: { id: 31, hp: 90, attack: 92, defense: 87, spAttack: 75, spDefense: 85, speed: 76, baseXp: 193, evYield: { hp: 3 }, moves: [EARTHQUAKE, TAIL_WHIP, BITE, POISON_STING] },
  32: { id: 32, hp: 46, attack: 57, defense: 40, spAttack: 40, spDefense: 40, speed: 50, baseXp: 55, evYield: { attack: 1 }, moves: [POISON_STING, TACKLE, GROWL, DOUBLE_KICK] },
  33: { id: 33, hp: 61, attack: 72, defense: 57, spAttack: 55, spDefense: 55, speed: 65, baseXp: 128, evYield: { attack: 1, spAttack: 1 }, moves: [POISON_STING, BITE, GROWL, DOUBLE_KICK] },
  34: { id: 34, hp: 81, attack: 102, defense: 77, spAttack: 85, spDefense: 75, speed: 85, baseXp: 194, evYield: { attack: 3 }, moves: [EARTHQUAKE, TAIL_WHIP, BITE, POISON_STING] },
  35: { id: 35, hp: 70, attack: 45, defense: 48, spAttack: 60, spDefense: 65, speed: 35, baseXp: 68, evYield: { hp: 2 }, moves: [METRONOME, TAIL_WHIP, GROWL, SING] },
  36: { id: 36, hp: 95, attack: 70, defense: 73, spAttack: 95, spDefense: 90, speed: 60, baseXp: 129, evYield: { hp: 3 }, moves: [SWIFT, METRONOME, TAIL_WHIP, SING] },
  37: { id: 37, hp: 38, attack: 41, defense: 40, spAttack: 50, spDefense: 65, speed: 65, baseXp: 60, evYield: { spDefense: 1 }, moves: [EMBER, TAIL_WHIP, GROWL, FLAMETHROWER] },
  38: { id: 38, hp: 73, attack: 76, defense: 75, spAttack: 81, spDefense: 100, speed: 100, baseXp: 177, evYield: { spDefense: 3 }, moves: [FLAMETHROWER, EMBER, TAIL_WHIP, FIRE_BLAST] },
  39: { id: 39, hp: 115, attack: 45, defense: 20, spAttack: 45, spDefense: 25, speed: 20, baseXp: 68, evYield: { hp: 2 }, moves: [SING, TAIL_WHIP, GROWL, TACKLE] },
  40: { id: 40, hp: 140, attack: 70, defense: 45, spAttack: 85, spDefense: 50, speed: 45, baseXp: 109, evYield: { hp: 3 }, moves: [SING, SWIFT, TAIL_WHIP, GROWL] },
  41: { id: 41, hp: 40, attack: 45, defense: 35, spAttack: 30, spDefense: 40, speed: 55, baseXp: 49, evYield: { speed: 1 }, moves: [BITE, SUPERSONIC, TACKLE, WING_ATTACK] },
  42: { id: 42, hp: 75, attack: 80, defense: 70, spAttack: 65, spDefense: 75, speed: 90, baseXp: 159, evYield: { speed: 2, attack: 1 }, moves: [BITE, WING_ATTACK, SUPERSONIC, AERIAL_ACE] },
  43: { id: 43, hp: 45, attack: 50, defense: 55, spAttack: 75, spDefense: 65, speed: 30, baseXp: 64, evYield: { spAttack: 1 }, moves: [TAIL_WHIP, TOXIC, GROWL, ACID] },
  44: { id: 44, hp: 60, attack: 65, defense: 70, spAttack: 85, spDefense: 75, speed: 40, baseXp: 138, evYield: { spAttack: 2 }, moves: [TAIL_WHIP, TOXIC, ACID, SOLAR_BEAM] },
  45: { id: 45, hp: 75, attack: 80, defense: 85, spAttack: 110, spDefense: 90, speed: 50, baseXp: 216, evYield: { spAttack: 3 }, moves: [TAIL_WHIP, TOXIC, POISON_POWDER, SOLAR_BEAM] },
  46: { id: 46, hp: 35, attack: 70, defense: 55, spAttack: 45, spDefense: 55, speed: 25, baseXp: 57, evYield: { attack: 1 }, moves: [TAIL_WHIP, SCRATCH, SLEEP_POWDER, CUT] },
  47: { id: 47, hp: 60, attack: 95, defense: 80, spAttack: 60, spDefense: 80, speed: 30, baseXp: 142, evYield: { attack: 2, defense: 1 }, moves: [TAIL_WHIP, SCRATCH, SLEEP_POWDER, X_SCISSOR] },
  48: { id: 48, hp: 60, attack: 55, defense: 50, spAttack: 40, spDefense: 55, speed: 45, baseXp: 61, evYield: { spDefense: 1 }, moves: [TAIL_WHIP, BITE, POISON_STING, HYPNOSIS] },
  49: { id: 49, hp: 70, attack: 65, defense: 60, spAttack: 90, spDefense: 75, speed: 90, baseXp: 158, evYield: { spAttack: 2, spDefense: 1 }, moves: [PSYBEAM, TAIL_WHIP, POISON_POWDER, HYPNOSIS] },
  50: { id: 50, hp: 10, attack: 55, defense: 25, spAttack: 35, spDefense: 45, speed: 95, baseXp: 81, evYield: { speed: 1 }, moves: [SCRATCH, TAIL_WHIP, EARTHQUAKE, GROWL] },
  51: { id: 51, hp: 35, attack: 100, defense: 50, spAttack: 50, spDefense: 70, speed: 120, baseXp: 153, evYield: { speed: 2, attack: 1 }, moves: [EARTHQUAKE, TAIL_WHIP, SCRATCH, CUT] },
  52: { id: 52, hp: 40, attack: 45, defense: 35, spAttack: 40, spDefense: 40, speed: 90, baseXp: 58, evYield: { speed: 1 }, moves: [SCRATCH, TAIL_WHIP, BITE, GROWL] },
  53: { id: 53, hp: 65, attack: 70, defense: 60, spAttack: 65, spDefense: 65, speed: 115, baseXp: 154, evYield: { speed: 2, attack: 1 }, moves: [SCRATCH, TAIL_WHIP, BITE, SWIFT] },
  54: { id: 54, hp: 50, attack: 52, defense: 48, spAttack: 65, spDefense: 50, speed: 55, baseXp: 64, evYield: { spAttack: 1 }, moves: [TAIL_WHIP, PSYCHIC, RECOVER, SURF] },
  55: { id: 55, hp: 80, attack: 82, defense: 78, spAttack: 95, spDefense: 80, speed: 85, baseXp: 175, evYield: { spAttack: 2, attack: 1 }, moves: [HYDRO_PUMP, SURF, PSYCHIC, TAIL_WHIP] },
  56: { id: 56, hp: 40, attack: 80, defense: 35, spAttack: 35, spDefense: 45, speed: 70, baseXp: 61, evYield: { attack: 1 }, moves: [TAIL_WHIP, FIRE_PUNCH, SCRATCH, GROWL] },
  57: { id: 57, hp: 65, attack: 105, defense: 60, spAttack: 60, spDefense: 70, speed: 95, baseXp: 159, evYield: { attack: 2, speed: 1 }, moves: [CLOSE_COMBAT, TAIL_WHIP, FIRE_PUNCH, GROWL] },
  58: { id: 58, hp: 55, attack: 70, defense: 45, spAttack: 70, spDefense: 50, speed: 60, baseXp: 91, evYield: { attack: 1 }, moves: [EMBER, BITE, TAIL_WHIP, GROWL] },
  59: { id: 59, hp: 90, attack: 110, defense: 80, spAttack: 100, spDefense: 80, speed: 95, baseXp: 194, evYield: { attack: 2, spAttack: 1 }, moves: [FLAMETHROWER, BITE, TAIL_WHIP, FIRE_BLAST] },
  60: { id: 60, hp: 40, attack: 50, defense: 40, spAttack: 40, spDefense: 40, speed: 90, baseXp: 60, evYield: { speed: 1 }, moves: [TAIL_WHIP, SURF, GROWL, POUND] },
  61: { id: 61, hp: 65, attack: 65, defense: 65, spAttack: 50, spDefense: 50, speed: 90, baseXp: 135, evYield: { speed: 2 }, moves: [SURF, TAIL_WHIP, SING, BODY_SLAM] },
  62: { id: 62, hp: 90, attack: 95, defense: 95, spAttack: 70, spDefense: 90, speed: 70, baseXp: 185, evYield: { defense: 3 }, moves: [HYDRO_PUMP, CLOSE_COMBAT, SURF, TAIL_WHIP] },
  63: { id: 63, hp: 25, attack: 20, defense: 15, spAttack: 105, spDefense: 55, speed: 90, baseXp: 62, evYield: { spAttack: 1 }, moves: [TELEPORT, PSYCHIC, TAIL_WHIP, PSYBEAM] },
  64: { id: 64, hp: 40, attack: 35, defense: 30, spAttack: 120, spDefense: 70, speed: 105, baseXp: 140, evYield: { spAttack: 2 }, moves: [PSYCHIC, TAIL_WHIP, PSYBEAM, TELEPORT] },
  65: { id: 65, hp: 55, attack: 50, defense: 45, spAttack: 135, spDefense: 95, speed: 120, baseXp: 186, evYield: { spAttack: 3 }, moves: [PSYCHIC, TAIL_WHIP, PSYBEAM, SWIFT] },
  66: { id: 66, hp: 70, attack: 80, defense: 50, spAttack: 35, spDefense: 35, speed: 35, baseXp: 61, evYield: { attack: 1 }, moves: [TAIL_WHIP, KARATE_CHOP, GROWL, POUND] },
  67: { id: 67, hp: 80, attack: 100, defense: 70, spAttack: 50, spDefense: 60, speed: 45, baseXp: 142, evYield: { attack: 2 }, moves: [KARATE_CHOP, TAIL_WHIP, GROWL, LOW_KICK] },
  68: { id: 68, hp: 90, attack: 130, defense: 80, spAttack: 65, spDefense: 85, speed: 55, baseXp: 193, evYield: { attack: 3 }, moves: [CLOSE_COMBAT, TAIL_WHIP, KARATE_CHOP, GROWL] },
  69: { id: 69, hp: 50, attack: 75, defense: 35, spAttack: 70, spDefense: 30, speed: 40, baseXp: 60, evYield: { attack: 1 }, moves: [TAIL_WHIP, ACID, TOXIC, RAZOR_LEAF] },
  70: { id: 70, hp: 65, attack: 90, defense: 50, spAttack: 85, spDefense: 45, speed: 55, baseXp: 137, evYield: { attack: 2 }, moves: [TAIL_WHIP, ACID, TOXIC, SOLAR_BEAM] },
  71: { id: 71, hp: 80, attack: 105, defense: 65, spAttack: 100, spDefense: 60, speed: 70, baseXp: 191, evYield: { attack: 3 }, moves: [TAIL_WHIP, ACID, TOXIC, SOLAR_BEAM] },
  72: { id: 72, hp: 40, attack: 40, defense: 35, spAttack: 50, spDefense: 100, speed: 70, baseXp: 67, evYield: { spDefense: 1 }, moves: [ACID, SURF, TAIL_WHIP, POISON_STING] },
  73: { id: 73, hp: 80, attack: 70, defense: 65, spAttack: 80, spDefense: 120, speed: 100, baseXp: 180, evYield: { spDefense: 2, speed: 1 }, moves: [ACID, HYDRO_PUMP, SURF, TAIL_WHIP] },
  74: { id: 74, hp: 40, attack: 80, defense: 100, spAttack: 30, spDefense: 30, speed: 20, baseXp: 73, evYield: { defense: 1 }, moves: [TAIL_WHIP, EARTHQUAKE, ROCK_THROW, GROWL] },
  75: { id: 75, hp: 55, attack: 95, defense: 115, spAttack: 45, spDefense: 45, speed: 35, baseXp: 134, evYield: { defense: 2 }, moves: [EARTHQUAKE, ROCK_THROW, TAIL_WHIP, GROWL] },
  76: { id: 76, hp: 80, attack: 120, defense: 130, spAttack: 55, spDefense: 65, speed: 45, baseXp: 177, evYield: { defense: 3 }, moves: [EARTHQUAKE, TAIL_WHIP, ROCK_THROW, GROWL] },
  77: { id: 77, hp: 50, attack: 85, defense: 55, spAttack: 65, spDefense: 65, speed: 90, baseXp: 82, evYield: { speed: 1 }, moves: [EMBER, TAIL_WHIP, STOMP, GROWL] },
  78: { id: 78, hp: 65, attack: 100, defense: 70, spAttack: 80, spDefense: 80, speed: 105, baseXp: 175, evYield: { speed: 2, attack: 1 }, moves: [FLAMETHROWER, EMBER, TAIL_WHIP, FIRE_BLAST] },
  79: { id: 79, hp: 90, attack: 65, defense: 65, spAttack: 40, spDefense: 40, speed: 15, baseXp: 99, evYield: { hp: 1 }, moves: [TAIL_WHIP, SURF, GROWL, AMNESIA] },
  80: { id: 80, hp: 95, attack: 75, defense: 110, spAttack: 100, spDefense: 80, speed: 30, baseXp: 164, evYield: { defense: 2, spAttack: 1 }, moves: [PSYCHIC, SURF, TAIL_WHIP, AMNESIA] },
  81: { id: 81, hp: 25, attack: 35, defense: 70, spAttack: 95, spDefense: 55, speed: 45, baseXp: 89, evYield: { spAttack: 1 }, moves: [THUNDERBOLT, THUNDER_SHOCK, TAIL_WHIP, SONIC_BOOM] },
  82: { id: 82, hp: 50, attack: 60, defense: 95, spAttack: 120, spDefense: 70, speed: 70, baseXp: 161, evYield: { spAttack: 2, defense: 1 }, moves: [THUNDERBOLT, THUNDER, TAIL_WHIP, THUNDER_SHOCK] },
  83: { id: 83, hp: 52, attack: 90, defense: 55, spAttack: 58, spDefense: 62, speed: 60, baseXp: 94, evYield: { attack: 1 }, moves: [TAIL_WHIP, AERIAL_ACE, GROWL, CUT] },
  84: { id: 84, hp: 35, attack: 85, defense: 45, spAttack: 35, spDefense: 35, speed: 75, baseXp: 62, evYield: { attack: 1 }, moves: [TAIL_WHIP, PECK, GROWL, FURY_ATTACK] },
  85: { id: 85, hp: 60, attack: 110, defense: 70, spAttack: 60, spDefense: 60, speed: 110, baseXp: 165, evYield: { attack: 2, speed: 1 }, moves: [PECK, TAIL_WHIP, GROWL, AERIAL_ACE] },
  86: { id: 86, hp: 65, attack: 45, defense: 55, spAttack: 45, spDefense: 70, speed: 45, baseXp: 65, evYield: { spDefense: 1 }, moves: [TAIL_WHIP, SURF, BLIZZARD, GROWL] },
  87: { id: 87, hp: 90, attack: 70, defense: 80, spAttack: 70, spDefense: 95, speed: 70, baseXp: 166, evYield: { spDefense: 2, hp: 1 }, moves: [SURF, BLIZZARD, TAIL_WHIP, ICE_BEAM] },
  88: { id: 88, hp: 80, attack: 80, defense: 50, spAttack: 40, spDefense: 50, speed: 25, baseXp: 90, evYield: { hp: 1 }, moves: [TAIL_WHIP, ACID, TOXIC, SMOG] },
  89: { id: 89, hp: 105, attack: 105, defense: 75, spAttack: 65, spDefense: 100, speed: 50, baseXp: 157, evYield: { hp: 2, attack: 1 }, moves: [TAIL_WHIP, ACID, TOXIC, SMOG] },
  90: { id: 90, hp: 30, attack: 65, defense: 100, spAttack: 45, spDefense: 25, speed: 40, baseXp: 61, evYield: { defense: 1 }, moves: [TAIL_WHIP, WATER_GUN, GROWL, TACKLE] },
  91: { id: 91, hp: 50, attack: 95, defense: 180, spAttack: 85, spDefense: 45, speed: 70, baseXp: 184, evYield: { defense: 3 }, moves: [TAIL_WHIP, HYDRO_PUMP, BLIZZARD, WATER_GUN] },
  92: { id: 92, hp: 30, attack: 35, defense: 30, spAttack: 100, spDefense: 35, speed: 80, baseXp: 62, evYield: { spAttack: 1 }, moves: [TAIL_WHIP, NIGHT_SHADE, HYPNOSIS, CONFUSE_RAY] },
  93: { id: 93, hp: 45, attack: 50, defense: 45, spAttack: 115, spDefense: 55, speed: 95, baseXp: 142, evYield: { spAttack: 2 }, moves: [TAIL_WHIP, NIGHT_SHADE, HYPNOSIS, CONFUSE_RAY] },
  94: { id: 94, hp: 60, attack: 65, defense: 60, spAttack: 130, spDefense: 75, speed: 110, baseXp: 190, evYield: { spAttack: 3 }, moves: [TAIL_WHIP, NIGHT_SHADE, HYPNOSIS, PSYCHIC] },
  95: { id: 95, hp: 35, attack: 45, defense: 160, spAttack: 30, spDefense: 45, speed: 70, baseXp: 108, evYield: { defense: 1 }, moves: [TAIL_WHIP, EARTHQUAKE, ROCK_THROW, GROWL] },
  96: { id: 96, hp: 60, attack: 48, defense: 45, spAttack: 43, spDefense: 90, speed: 42, baseXp: 102, evYield: { spDefense: 1 }, moves: [HYPNOSIS, TAIL_WHIP, PSYCHIC, POUND] },
  97: { id: 97, hp: 85, attack: 73, defense: 70, spAttack: 73, spDefense: 115, speed: 67, baseXp: 165, evYield: { spDefense: 2, hp: 1 }, moves: [HYPNOSIS, PSYCHIC, TAIL_WHIP, POUND] },
  98: { id: 98, hp: 30, attack: 105, defense: 90, spAttack: 25, spDefense: 25, speed: 50, baseXp: 65, evYield: { attack: 1 }, moves: [TAIL_WHIP, SCRATCH, GROWL, LEER] },
  99: { id: 99, hp: 55, attack: 130, defense: 115, spAttack: 50, spDefense: 50, speed: 75, baseXp: 166, evYield: { attack: 2, defense: 1 }, moves: [TAIL_WHIP, SCRATCH, GROWL, HYDRO_PUMP] },
  100: { id: 100, hp: 40, attack: 30, defense: 50, spAttack: 55, spDefense: 55, speed: 100, baseXp: 66, evYield: { speed: 1 }, moves: [THUNDERBOLT, TAIL_WHIP, GROWL, THUNDER_SHOCK] },
  101: { id: 101, hp: 60, attack: 50, defense: 70, spAttack: 80, spDefense: 80, speed: 140, baseXp: 168, evYield: { speed: 2, spAttack: 1 }, moves: [THUNDERBOLT, THUNDER, TAIL_WHIP, GROWL] },
  102: { id: 102, hp: 60, attack: 40, defense: 80, spAttack: 60, spDefense: 45, speed: 40, baseXp: 65, evYield: { defense: 1 }, moves: [TAIL_WHIP, PSYCHIC, HYPNOSIS, SLEEP_POWDER] },
  103: { id: 103, hp: 95, attack: 95, defense: 85, spAttack: 125, spDefense: 75, speed: 55, baseXp: 182, evYield: { spAttack: 2, hp: 1 }, moves: [SOLAR_BEAM, PSYCHIC, TAIL_WHIP, HYPNOSIS] },
  104: { id: 104, hp: 50, attack: 50, defense: 95, spAttack: 40, spDefense: 50, speed: 35, baseXp: 74, evYield: { defense: 1 }, moves: [TAIL_WHIP, EARTHQUAKE, GROWL, LEER] },
  105: { id: 105, hp: 60, attack: 80, defense: 110, spAttack: 50, spDefense: 80, speed: 45, baseXp: 149, evYield: { defense: 2 }, moves: [EARTHQUAKE, TAIL_WHIP, GROWL, LEER] },
  106: { id: 106, hp: 50, attack: 120, defense: 53, spAttack: 35, spDefense: 110, speed: 87, baseXp: 139, evYield: { attack: 2 }, moves: [CLOSE_COMBAT, TAIL_WHIP, LOW_KICK, GROWL] },
  107: { id: 107, hp: 50, attack: 105, defense: 79, spAttack: 35, spDefense: 110, speed: 76, baseXp: 140, evYield: { attack: 1, spDefense: 1 }, moves: [FIRE_PUNCH, TAIL_WHIP, KARATE_CHOP, GROWL] },
  108: { id: 108, hp: 90, attack: 55, defense: 75, spAttack: 60, spDefense: 75, speed: 30, baseXp: 127, evYield: { hp: 2 }, moves: [TAIL_WHIP, POUND, GROWL, SLAM] },
  109: { id: 109, hp: 40, attack: 65, defense: 95, spAttack: 60, spDefense: 45, speed: 35, baseXp: 114, evYield: { defense: 1 }, moves: [TAIL_WHIP, SMOG, TOXIC, ACID] },
  110: { id: 110, hp: 65, attack: 90, defense: 120, spAttack: 85, spDefense: 70, speed: 60, baseXp: 173, evYield: { defense: 2, attack: 1 }, moves: [TAIL_WHIP, SMOG, TOXIC, ACID] },
  111: { id: 111, hp: 80, attack: 85, defense: 95, spAttack: 30, spDefense: 30, speed: 25, baseXp: 135, evYield: { defense: 1 }, moves: [TAIL_WHIP, EARTHQUAKE, GROWL, ROCK_THROW] },
  112: { id: 112, hp: 105, attack: 130, defense: 120, spAttack: 45, spDefense: 45, speed: 40, baseXp: 204, evYield: { attack: 2, defense: 1 }, moves: [EARTHQUAKE, TAIL_WHIP, GROWL, ROCK_THROW] },
  113: { id: 113, hp: 250, attack: 5, defense: 5, spAttack: 35, spDefense: 105, speed: 50, baseXp: 255, evYield: { hp: 2 }, moves: [TAIL_WHIP, SING, GROWL, TACKLE] },
  114: { id: 114, hp: 65, attack: 55, defense: 115, spAttack: 100, spDefense: 40, speed: 60, baseXp: 166, evYield: { defense: 1 }, moves: [TAIL_WHIP, RAZOR_LEAF, SOLAR_BEAM, TOXIC] },
  115: { id: 115, hp: 105, attack: 95, defense: 80, spAttack: 40, spDefense: 80, speed: 90, baseXp: 172, evYield: { hp: 2 }, moves: [TAIL_WHIP, BITE, GROWL, SCRATCH] },
  116: { id: 116, hp: 30, attack: 40, defense: 70, spAttack: 70, spDefense: 25, speed: 60, baseXp: 59, evYield: { spAttack: 1 }, moves: [TAIL_WHIP, WATER_GUN, GROWL, LEER] },
  117: { id: 117, hp: 55, attack: 65, defense: 95, spAttack: 95, spDefense: 45, speed: 85, baseXp: 154, evYield: { spAttack: 2 }, moves: [TAIL_WHIP, HYDRO_PUMP, GROWL, SURF] },
  118: { id: 118, hp: 45, attack: 67, defense: 60, spAttack: 35, spDefense: 50, speed: 63, baseXp: 64, evYield: { attack: 1 }, moves: [TAIL_WHIP, SURF, GROWL, PECK] },
  119: { id: 119, hp: 80, attack: 92, defense: 65, spAttack: 65, spDefense: 80, speed: 68, baseXp: 158, evYield: { attack: 2 }, moves: [HYDRO_PUMP, SURF, TAIL_WHIP, GROWL] },
  120: { id: 120, hp: 30, attack: 45, defense: 55, spAttack: 70, spDefense: 55, speed: 85, baseXp: 68, evYield: { speed: 1 }, moves: [TAIL_WHIP, SURF, WATER_GUN, SWIFT] },
  121: { id: 121, hp: 60, attack: 75, defense: 85, spAttack: 100, spDefense: 85, speed: 115, baseXp: 182, evYield: { spAttack: 1, speed: 2 }, moves: [HYDRO_PUMP, PSYCHIC, SURF, SWIFT] },
  122: { id: 122, hp: 40, attack: 45, defense: 65, spAttack: 100, spDefense: 120, speed: 90, baseXp: 136, evYield: { spDefense: 2 }, moves: [PSYCHIC, TAIL_WHIP, GROWL, PSYBEAM] },
  123: { id: 123, hp: 70, attack: 110, defense: 80, spAttack: 55, spDefense: 80, speed: 105, baseXp: 187, evYield: { attack: 2 }, moves: [TAIL_WHIP, AERIAL_ACE, SCRATCH, X_SCISSOR] },
  124: { id: 124, hp: 65, attack: 50, defense: 35, spAttack: 115, spDefense: 95, speed: 95, baseXp: 137, evYield: { spAttack: 2 }, moves: [BLIZZARD, PSYCHIC, TAIL_WHIP, SING] },
  125: { id: 125, hp: 65, attack: 83, defense: 57, spAttack: 95, spDefense: 85, speed: 105, baseXp: 156, evYield: { spAttack: 2 }, moves: [THUNDERBOLT, THUNDER, TAIL_WHIP, THUNDER_SHOCK] },
  126: { id: 126, hp: 65, attack: 95, defense: 57, spAttack: 100, spDefense: 85, speed: 93, baseXp: 167, evYield: { spAttack: 2 }, moves: [FLAMETHROWER, EMBER, TAIL_WHIP, FIRE_BLAST] },
  127: { id: 127, hp: 65, attack: 125, defense: 100, spAttack: 55, spDefense: 70, speed: 85, baseXp: 200, evYield: { attack: 2 }, moves: [TAIL_WHIP, X_SCISSOR, SCRATCH, GROWL] },
  128: { id: 128, hp: 75, attack: 100, defense: 95, spAttack: 40, spDefense: 70, speed: 110, baseXp: 211, evYield: { attack: 2, speed: 1 }, moves: [TAIL_WHIP, TACKLE, GROWL, BODY_SLAM] },
  129: { id: 129, hp: 20, attack: 10, defense: 55, spAttack: 15, spDefense: 20, speed: 80, baseXp: 40, evYield: { speed: 1 }, moves: [TACKLE, TAIL_WHIP, TACKLE, TAIL_WHIP] },
  130: { id: 130, hp: 95, attack: 125, defense: 79, spAttack: 60, spDefense: 100, speed: 81, baseXp: 189, evYield: { attack: 2, spDefense: 1 }, moves: [TAIL_WHIP, BITE, HYDRO_PUMP, AERIAL_ACE] },
  131: { id: 131, hp: 130, attack: 85, defense: 80, spAttack: 85, spDefense: 95, speed: 60, baseXp: 187, evYield: { hp: 2 }, moves: [SURF, BLIZZARD, TAIL_WHIP, ICE_BEAM] },
  132: { id: 132, hp: 48, attack: 48, defense: 48, spAttack: 48, spDefense: 48, speed: 48, baseXp: 61, evYield: { hp: 1 }, moves: [TRANSFORM, TACKLE, TAIL_WHIP, TRANSFORM] },
  133: { id: 133, hp: 55, attack: 55, defense: 50, spAttack: 45, spDefense: 65, speed: 55, baseXp: 65, evYield: { hp: 1 }, moves: [TAIL_WHIP, BITE, GROWL, SCRATCH] },
  134: { id: 134, hp: 130, attack: 65, defense: 60, spAttack: 110, spDefense: 95, speed: 65, baseXp: 184, evYield: { hp: 2, spAttack: 1 }, moves: [HYDRO_PUMP, SURF, TAIL_WHIP, GROWL] },
  135: { id: 135, hp: 65, attack: 65, defense: 60, spAttack: 110, spDefense: 95, speed: 130, baseXp: 184, evYield: { speed: 2, spAttack: 1 }, moves: [THUNDERBOLT, THUNDER, TAIL_WHIP, THUNDER_SHOCK] },
  136: { id: 136, hp: 65, attack: 130, defense: 60, spAttack: 95, spDefense: 110, speed: 65, baseXp: 184, evYield: { attack: 2, spDefense: 1 }, moves: [FLAMETHROWER, EMBER, TAIL_WHIP, FIRE_BLAST] },
  137: { id: 137, hp: 65, attack: 60, defense: 70, spAttack: 85, spDefense: 75, speed: 40, baseXp: 130, evYield: { spAttack: 1 }, moves: [TAIL_WHIP, PSYBEAM, GROWL, SWIFT] },
  138: { id: 138, hp: 35, attack: 40, defense: 100, spAttack: 90, spDefense: 55, speed: 35, baseXp: 120, evYield: { defense: 1 }, moves: [TAIL_WHIP, SURF, GROWL, HYDRO_PUMP] },
  139: { id: 139, hp: 70, attack: 60, defense: 125, spAttack: 115, spDefense: 70, speed: 55, baseXp: 199, evYield: { defense: 2, spAttack: 1 }, moves: [HYDRO_PUMP, SURF, TAIL_WHIP, GROWL] },
  140: { id: 140, hp: 30, attack: 80, defense: 90, spAttack: 55, spDefense: 45, speed: 55, baseXp: 119, evYield: { defense: 1 }, moves: [TAIL_WHIP, WATER_GUN, SCRATCH, GROWL] },
  141: { id: 141, hp: 60, attack: 115, defense: 105, spAttack: 65, spDefense: 70, speed: 80, baseXp: 201, evYield: { attack: 2, defense: 1 }, moves: [SCRATCH, TAIL_WHIP, CUT, HYDRO_PUMP] },
  142: { id: 142, hp: 80, attack: 105, defense: 65, spAttack: 60, spDefense: 75, speed: 130, baseXp: 202, evYield: { speed: 2, attack: 1 }, moves: [TAIL_WHIP, AERIAL_ACE, ROCK_THROW, BITE] },
  143: { id: 143, hp: 160, attack: 110, defense: 65, spAttack: 65, spDefense: 110, speed: 30, baseXp: 189, evYield: { hp: 2 }, moves: [TAIL_WHIP, EARTHQUAKE, SING, BITE] },
  144: { id: 144, hp: 90, attack: 85, defense: 100, spAttack: 95, spDefense: 125, speed: 85, baseXp: 215, evYield: { spDefense: 3 }, moves: [BLIZZARD, TAIL_WHIP, AERIAL_ACE, ICE_BEAM] },
  145: { id: 145, hp: 90, attack: 90, defense: 85, spAttack: 125, spDefense: 90, speed: 100, baseXp: 216, evYield: { spAttack: 3 }, moves: [THUNDER, THUNDERBOLT, TAIL_WHIP, AERIAL_ACE] },
  146: { id: 146, hp: 90, attack: 100, defense: 90, spAttack: 125, spDefense: 85, speed: 90, baseXp: 215, evYield: { spAttack: 3 }, moves: [FLAMETHROWER, TAIL_WHIP, AERIAL_ACE, FIRE_BLAST] },
  147: { id: 147, hp: 41, attack: 64, defense: 45, spAttack: 50, spDefense: 50, speed: 50, baseXp: 67, evYield: { attack: 1 }, moves: [TAIL_WHIP, DRAGON_RAGE, GROWL, TACKLE] },
  148: { id: 148, hp: 61, attack: 84, defense: 65, spAttack: 70, spDefense: 70, speed: 70, baseXp: 144, evYield: { attack: 2 }, moves: [TAIL_WHIP, DRAGON_RAGE, GROWL, TACKLE] },
  149: { id: 149, hp: 91, attack: 134, defense: 95, spAttack: 100, spDefense: 100, speed: 80, baseXp: 218, evYield: { attack: 3 }, moves: [TAIL_WHIP, DRAGON_RAGE, AERIAL_ACE, EARTHQUAKE] },
  150: { id: 150, hp: 106, attack: 110, defense: 90, spAttack: 154, spDefense: 90, speed: 130, baseXp: 220, evYield: { spAttack: 3 }, moves: [PSYCHIC, TAIL_WHIP, PSYBEAM, SWIFT] },
  151: { id: 151, hp: 100, attack: 100, defense: 100, spAttack: 100, spDefense: 100, speed: 100, baseXp: 64, evYield: { hp: 3 }, moves: [PSYCHIC, SWIFT, TAIL_WHIP, METRONOME] },
};
