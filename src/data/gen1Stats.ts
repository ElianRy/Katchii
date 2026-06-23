export type MoveCategory = 'physical' | 'special' | 'status';
export type StatusEffect = 'burn' | 'poison' | 'paralysis' | 'sleep' | 'freeze';
export type AnimationType = 'fire' | 'water' | 'electric' | 'grass' | 'psychic' | 'ice' | 'fighting' | 'poison' | 'ground' | 'flying' | 'bug' | 'rock' | 'ghost' | 'dragon' | 'normal' | 'dark' | 'steel';

export interface StatBoost {
  stat: 'attack' | 'defense' | 'spAttack' | 'spDefense' | 'speed' | 'evasion' | 'accuracy';
  target: 'self' | 'foe';
  stages: number;
}

export interface Move {
  name: string;
  type: string;
  category: MoveCategory;
  power: number;
  accuracy: number;
  pp: number;
  description: string;
  effect?: { type: StatusEffect; chance: number };
  recoil?: number;
  multiHit?: boolean;
  highCrit?: boolean;
  statBoost?: StatBoost;
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

// --- Basic moves ---
const TACKLE: Move = { name: 'Charge', type: 'normal', category: 'physical', power: 35, accuracy: 95, pp: 35, description: 'Attaque de base sans effet.' };
const GROWL: Move = { name: 'Rugissement', type: 'normal', category: 'status', power: 0, accuracy: 100, pp: 40, description: "Baisse l'Attaque adverse d'un cran.", statBoost: { stat: 'attack', target: 'foe', stages: -1 } };
const SCRATCH: Move = { name: 'Griffe', type: 'normal', category: 'physical', power: 40, accuracy: 100, pp: 35, description: 'Griffe basique sans effet.' };
const TAIL_WHIP: Move = { name: 'Jackpot', type: 'normal', category: 'status', power: 0, accuracy: 100, pp: 30, description: 'Baisse la Défense adverse d\'un cran.', statBoost: { stat: 'defense', target: 'foe', stages: -1 } };
const BITE: Move = { name: 'Morsure', type: 'dark', category: 'physical', power: 60, accuracy: 100, pp: 25, description: 'Morsure. 30% d\'intimidation.' };
const EMBER: Move = { name: 'Flammèche', type: 'fire', category: 'special', power: 40, accuracy: 100, pp: 25, description: 'Flamme. 10% de brûlure.', effect: { type: 'burn', chance: 10 } };
const FLAMETHROWER: Move = { name: 'Lance-Flammes', type: 'fire', category: 'special', power: 95, accuracy: 100, pp: 15, description: 'Flamme puissante. 10% brûlure.', effect: { type: 'burn', chance: 10 } };
const FIRE_BLAST: Move = { name: 'Déflagration', type: 'fire', category: 'special', power: 110, accuracy: 85, pp: 5, description: 'Souffle ardent. 10% brûlure.', effect: { type: 'burn', chance: 10 } };
const WATER_GUN: Move = { name: 'Pistolet à O', type: 'water', category: 'special', power: 40, accuracy: 100, pp: 25, description: "Jet d'eau sans effet." };
const SURF: Move = { name: 'Surf', type: 'water', category: 'special', power: 95, accuracy: 100, pp: 15, description: 'Vague déferlante sans effet.' };
const HYDRO_PUMP: Move = { name: 'Hydrocanon', type: 'water', category: 'special', power: 110, accuracy: 80, pp: 5, description: 'Hydrocanon puissant, précision faible.' };
const RAZOR_LEAF: Move = { name: 'Tranche', type: 'grass', category: 'physical', power: 55, accuracy: 95, pp: 25, description: 'Feuilles tranchantes. Crit. élevé.', highCrit: true };
const SOLAR_BEAM: Move = { name: 'Lance-Soleil', type: 'grass', category: 'special', power: 120, accuracy: 100, pp: 10, description: 'Charge 1 tour, frappe le 2e.' };
const THUNDER: Move = { name: 'Fatal-Foudre', type: 'electric', category: 'special', power: 120, accuracy: 50, pp: 5, description: 'Éclair massif. 30% paralysie.', effect: { type: 'paralysis', chance: 100 } };
const THUNDERBOLT: Move = { name: 'Tonnerre', type: 'electric', category: 'special', power: 95, accuracy: 100, pp: 15, description: 'Foudre. 10% de paralysie.', effect: { type: 'paralysis', chance: 10 } };
const THUNDER_SHOCK: Move = { name: 'Éclair', type: 'electric', category: 'special', power: 40, accuracy: 100, pp: 30, description: 'Décharge. 10% paralysie.', effect: { type: 'paralysis', chance: 10 } };
const PSYCHIC: Move = { name: 'Psyko', type: 'psychic', category: 'special', power: 90, accuracy: 100, pp: 10, description: 'Attaque psy. Peut baisser Déf. Spé.' };
const PSYBEAM: Move = { name: 'Rafale Psy', type: 'psychic', category: 'special', power: 65, accuracy: 100, pp: 20, description: 'Rayon psy.' };
const BLIZZARD: Move = { name: 'Blizzard', type: 'ice', category: 'special', power: 110, accuracy: 70, pp: 5, description: 'Blizzard. 10% de gel.', effect: { type: 'freeze', chance: 10 } };
const ICE_BEAM: Move = { name: 'Laser Glace', type: 'ice', category: 'special', power: 95, accuracy: 100, pp: 10, description: 'Rayon glace. 10% de gel.', effect: { type: 'freeze', chance: 10 } };
const EARTHQUAKE: Move = { name: 'Séisme', type: 'ground', category: 'physical', power: 100, accuracy: 100, pp: 10, description: 'Séisme sans faille.' };
const ROCK_THROW: Move = { name: 'Éclate-Roc', type: 'rock', category: 'physical', power: 50, accuracy: 90, pp: 15, description: 'Lancer de rocher.' };
const AERIAL_ACE: Move = { name: 'Tranche-Air', type: 'flying', category: 'physical', power: 60, accuracy: 100, pp: 20, description: 'Tranche-air infaillible.' };
const WING_ATTACK: Move = { name: "Aile d'Acier", type: 'flying', category: 'physical', power: 60, accuracy: 100, pp: 35, description: "Attaque d'aile." };
const PECK: Move = { name: 'Bec Vrille', type: 'flying', category: 'physical', power: 35, accuracy: 100, pp: 35, description: 'Coup de bec basique.' };
const POISON_STING: Move = { name: 'Dard-Venin', type: 'poison', category: 'physical', power: 15, accuracy: 100, pp: 35, description: 'Dard. 30% de poison.', effect: { type: 'poison', chance: 30 } };
const ACID: Move = { name: 'Acide', type: 'poison', category: 'special', power: 40, accuracy: 100, pp: 30, description: 'Acide. Peut baisser Déf. Spé.' };
const SMOG: Move = { name: 'Smog', type: 'poison', category: 'special', power: 20, accuracy: 70, pp: 20, description: 'Smog. 40% de poison.', effect: { type: 'poison', chance: 40 } };
const NIGHT_SHADE: Move = { name: 'Ombre Nuit', type: 'ghost', category: 'physical', power: 70, accuracy: 100, pp: 15, description: 'Dommages égaux au niveau.' };
const DRAGON_RAGE: Move = { name: 'Colère', type: 'dragon', category: 'special', power: 80, accuracy: 100, pp: 10, description: 'Rage draconique.' };
const CLOSE_COMBAT: Move = { name: 'Close Combat', type: 'fighting', category: 'physical', power: 120, accuracy: 100, pp: 5, description: 'Combat. Baisse Déf. et Déf. Spé.' };
const KARATE_CHOP: Move = { name: 'Poing Karaté', type: 'fighting', category: 'physical', power: 50, accuracy: 100, pp: 25, description: 'Coup à taux de critique élevé.', highCrit: true };
export const LOW_KICK: Move ={ name: 'Balayage', type: 'fighting', category: 'physical', power: 65, accuracy: 100, pp: 20, description: 'Coup de pied bas.' };
const X_SCISSOR: Move = { name: 'X-Ciseau', type: 'bug', category: 'physical', power: 80, accuracy: 100, pp: 15, description: 'Cisaillement en croix.' };
export const CUT: Move ={ name: 'Coupe', type: 'normal', category: 'physical', power: 50, accuracy: 95, pp: 30, description: 'Coupe basique.' };
const SWIFT: Move = { name: 'Météores', type: 'normal', category: 'special', power: 60, accuracy: 100, pp: 20, description: 'Météores infaillibles.' };
const BODY_SLAM: Move = { name: 'Plaquage', type: 'normal', category: 'physical', power: 85, accuracy: 100, pp: 15, description: 'Plaquage. 30% de paralysie.', effect: { type: 'paralysis', chance: 30 } };
const HYPER_FANG: Move = { name: 'Hyper Croc', type: 'normal', category: 'physical', power: 80, accuracy: 90, pp: 15, description: 'Morsure féroce. 10% recul.' };
const WRAP: Move = { name: 'Ligotage', type: 'normal', category: 'physical', power: 15, accuracy: 90, pp: 20, description: 'Enroulement 2-5 tours.' };
export const POUND: Move ={ name: 'Frappe', type: 'normal', category: 'physical', power: 40, accuracy: 100, pp: 35, description: 'Attaque de base.' };
const SING: Move = { name: 'Berceuse', type: 'normal', category: 'status', power: 0, accuracy: 55, pp: 15, description: 'Mélodie soporifique (précision 55%).', effect: { type: 'sleep', chance: 100 } };
const HYPNOSIS: Move = { name: 'Hypnose', type: 'psychic', category: 'status', power: 0, accuracy: 60, pp: 20, description: 'Endort l\'adversaire (précision 60%).', effect: { type: 'sleep', chance: 100 } };
const SLEEP_POWDER: Move = { name: 'Poudre Dodo', type: 'grass', category: 'status', power: 0, accuracy: 75, pp: 15, description: 'Poudre soporifique (précision 75%).', effect: { type: 'sleep', chance: 100 } };
const POISON_POWDER: Move = { name: 'Poudre Toxik', type: 'poison', category: 'status', power: 0, accuracy: 75, pp: 35, description: 'Empoisonne l\'adversaire.', effect: { type: 'poison', chance: 100 } };
export const LEECH_SEED: Move ={ name: 'Vampigraine', type: 'grass', category: 'status', power: 0, accuracy: 90, pp: 10, description: 'Draine les PV adverses chaque tour.' };
const TELEPORT: Move = { name: 'Téléport', type: 'psychic', category: 'status', power: 0, accuracy: 100, pp: 20, description: 'Fuite garantie du combat.' };
const HARDEN: Move = { name: 'Harden', type: 'normal', category: 'status', power: 0, accuracy: 100, pp: 30, description: 'Monte la Défense d\'un cran.', statBoost: { stat: 'defense', target: 'self', stages: 1 } };
const SUPERSONIC: Move = { name: 'Ultrason', type: 'normal', category: 'status', power: 0, accuracy: 55, pp: 20, description: 'Sons qui rendent confus.' };
const CONFUSE_RAY: Move = { name: 'Onde Folle', type: 'ghost', category: 'status', power: 0, accuracy: 100, pp: 10, description: 'Rend l\'adversaire confus.' };
const STRING_SHOT: Move = { name: 'Sécrétion', type: 'bug', category: 'status', power: 0, accuracy: 95, pp: 40, description: 'Baisse la Vitesse adverse.', statBoost: { stat: 'speed', target: 'foe', stages: -1 } };
const TRANSFORM: Move = { name: 'Métamorph', type: 'normal', category: 'status', power: 0, accuracy: 100, pp: 10, description: 'Copie les capacités adverses.' };
const AMNESIA: Move = { name: 'Amnésie', type: 'psychic', category: 'status', power: 0, accuracy: 100, pp: 20, description: 'Double la Défense Spéciale.', statBoost: { stat: 'spDefense', target: 'self', stages: 2 } };
const SONIC_BOOM: Move = { name: 'Ultrason', type: 'normal', category: 'special', power: 40, accuracy: 90, pp: 20, description: 'Onde sonique infaillible.' };
const SLAM: Move = { name: 'Mâchouille', type: 'normal', category: 'physical', power: 80, accuracy: 75, pp: 20, description: 'Coup violent mais peu précis.' };
const RECOVER: Move = { name: 'Soin', type: 'normal', category: 'status', power: 0, accuracy: 100, pp: 10, description: 'Restaure 50% des PV max.' };
const FIRE_PUNCH: Move = { name: 'Poing-Feu', type: 'fire', category: 'physical', power: 75, accuracy: 100, pp: 15, description: 'Poing enflammé. 10% brûlure.', effect: { type: 'burn', chance: 10 } };
export const STOMP: Move ={ name: 'Piétinage', type: 'normal', category: 'physical', power: 65, accuracy: 100, pp: 20, description: 'Piétinage. Peut faire tressaillir.' };
const DOUBLE_KICK: Move = { name: 'Double Pied', type: 'fighting', category: 'physical', power: 30, accuracy: 100, pp: 30, description: 'Frappe exactement 2 fois de suite.' };
const LEER: Move = { name: "Groz'Yeux", type: 'normal', category: 'status', power: 0, accuracy: 100, pp: 30, description: 'Baisse la Défense adverse d\'un cran.', statBoost: { stat: 'defense', target: 'foe', stages: -1 } };
const FURY_ATTACK: Move = { name: 'Frénésie', type: 'normal', category: 'physical', power: 15, accuracy: 85, pp: 20, description: 'Attaque en rafale 2 à 5 fois.', multiHit: true };
const PIN_MISSILE: Move = { name: 'Dard-Missile', type: 'bug', category: 'physical', power: 14, accuracy: 85, pp: 20, description: 'Missiles épineux 2 à 5 fois.', multiHit: true };
const TOXIC: Move = { name: 'Détérioration', type: 'poison', category: 'status', power: 0, accuracy: 90, pp: 10, description: 'Empoisonnement grave.', effect: { type: 'poison', chance: 100 } };
const METRONOME: Move = { name: 'Copie', type: 'normal', category: 'special', power: 55, accuracy: 100, pp: 15, description: 'Utilise une capacité aléatoire.' };

// --- Stat boost moves ---
const SWORDS_DANCE: Move = { name: 'Danse Lames', type: 'normal', category: 'status', power: 0, accuracy: 100, pp: 20, description: "Double l'Attaque du lanceur.", statBoost: { stat: 'attack', target: 'self', stages: 2 } };
const NASTY_PLOT: Move = { name: 'Complots', type: 'dark', category: 'status', power: 0, accuracy: 100, pp: 20, description: "Double l'Attaque Spéciale du lanceur.", statBoost: { stat: 'spAttack', target: 'self', stages: 2 } };
const AGILITY: Move = { name: 'Agilité', type: 'psychic', category: 'status', power: 0, accuracy: 100, pp: 30, description: 'Double la Vitesse du lanceur.', statBoost: { stat: 'speed', target: 'self', stages: 2 } };
const BARRIER: Move = { name: 'Barrier', type: 'psychic', category: 'status', power: 0, accuracy: 100, pp: 30, description: 'Double la Défense du lanceur.', statBoost: { stat: 'defense', target: 'self', stages: 2 } };
const CALM_MIND: Move = { name: 'Plénitude', type: 'psychic', category: 'status', power: 0, accuracy: 100, pp: 20, description: 'Monte l\'Att. Spé. et Déf. Spé. d\'un cran.', statBoost: { stat: 'spAttack', target: 'self', stages: 1 } };
const SHARPEN: Move = { name: 'Acuité', type: 'normal', category: 'status', power: 0, accuracy: 100, pp: 30, description: "Monte l'Attaque du lanceur d'un cran.", statBoost: { stat: 'attack', target: 'self', stages: 1 } };
const GROWTH: Move = { name: 'Croissance', type: 'normal', category: 'status', power: 0, accuracy: 100, pp: 40, description: "Monte l'Attaque Spéciale d'un cran.", statBoost: { stat: 'spAttack', target: 'self', stages: 1 } };
const WITHDRAW: Move = { name: 'Jackpot', type: 'water', category: 'status', power: 0, accuracy: 100, pp: 40, description: 'Monte la Défense du lanceur d\'un cran.', statBoost: { stat: 'defense', target: 'self', stages: 1 } };
const SCREECH: Move = { name: 'Cri', type: 'normal', category: 'status', power: 0, accuracy: 85, pp: 40, description: 'Baisse fortement la Défense adverse.', statBoost: { stat: 'defense', target: 'foe', stages: -2 } };

// --- High crit moves ---
const SLASH: Move = { name: 'Tranche', type: 'normal', category: 'physical', power: 70, accuracy: 100, pp: 20, description: 'Attaque à taux de critique élevé.', highCrit: true };
const CRABHAMMER: Move = { name: 'Crabe Marteau', type: 'water', category: 'physical', power: 100, accuracy: 90, pp: 10, description: 'Pince puissante, crit. élevé.', highCrit: true };
export const NIGHT_SLASH: Move ={ name: 'Tranche Nuit', type: 'dark', category: 'physical', power: 70, accuracy: 100, pp: 15, description: 'Attaque sombre à crit. élevé.', highCrit: true };

// --- Multi-hit moves ---
const FURY_SWIPES: Move = { name: 'Griffes', type: 'normal', category: 'physical', power: 18, accuracy: 80, pp: 15, description: 'Griffe 2 à 5 fois d\'affilée.', multiHit: true };
const DOUBLE_SLAP: Move = { name: 'Gifle', type: 'normal', category: 'physical', power: 15, accuracy: 85, pp: 10, description: 'Gifle 2 à 5 fois d\'affilée.', multiHit: true };
const SPIKE_CANNON: Move = { name: 'Canon Pique', type: 'normal', category: 'physical', power: 20, accuracy: 100, pp: 15, description: 'Lance des piques 2 à 5 fois.', multiHit: true };
const COMET_PUNCH: Move = { name: 'Poing Météore', type: 'normal', category: 'physical', power: 18, accuracy: 85, pp: 15, description: 'Poing météore 2 à 5 fois.', multiHit: true };
export const ROCK_BLAST: Move ={ name: 'Éclats Roc', type: 'rock', category: 'physical', power: 25, accuracy: 90, pp: 10, description: 'Rochers 2 à 5 fois d\'affilée.', multiHit: true };

export const GEN1_STATS: Record<number, PokemonStatData> = {
  1: { id: 1, hp: 45, attack: 49, defense: 49, spAttack: 65, spDefense: 65, speed: 45, baseXp: 64, evYield: { spAttack: 1 }, moves: [RAZOR_LEAF, POISON_STING, GROWTH, SLEEP_POWDER] },
  2: { id: 2, hp: 60, attack: 62, defense: 63, spAttack: 80, spDefense: 80, speed: 60, baseXp: 141, evYield: { spAttack: 1, spDefense: 1 }, moves: [RAZOR_LEAF, POISON_POWDER, GROWTH, SOLAR_BEAM] },
  3: { id: 3, hp: 80, attack: 82, defense: 83, spAttack: 100, spDefense: 100, speed: 80, baseXp: 208, evYield: { spAttack: 2, spDefense: 1 }, moves: [SOLAR_BEAM, RAZOR_LEAF, NASTY_PLOT, SLEEP_POWDER] },
  4: { id: 4, hp: 39, attack: 52, defense: 43, spAttack: 60, spDefense: 50, speed: 65, baseXp: 62, evYield: { speed: 1 }, moves: [EMBER, SCRATCH, GROWL, SLASH] },
  5: { id: 5, hp: 58, attack: 64, defense: 58, spAttack: 80, spDefense: 65, speed: 80, baseXp: 142, evYield: { speed: 1, spAttack: 1 }, moves: [FLAMETHROWER, SLASH, SWORDS_DANCE, EMBER] },
  6: { id: 6, hp: 78, attack: 84, defense: 78, spAttack: 109, spDefense: 85, speed: 100, baseXp: 209, evYield: { spAttack: 3 }, moves: [FLAMETHROWER, AERIAL_ACE, SWORDS_DANCE, SLASH] },
  7: { id: 7, hp: 44, attack: 48, defense: 65, spAttack: 50, spDefense: 64, speed: 43, baseXp: 63, evYield: { defense: 1 }, moves: [WATER_GUN, BITE, WITHDRAW, TACKLE] },
  8: { id: 8, hp: 59, attack: 63, defense: 80, spAttack: 65, spDefense: 80, speed: 58, baseXp: 142, evYield: { defense: 1, spDefense: 1 }, moves: [SURF, BITE, WITHDRAW, ICE_BEAM] },
  9: { id: 9, hp: 79, attack: 83, defense: 100, spAttack: 85, spDefense: 105, speed: 78, baseXp: 210, evYield: { defense: 3 }, moves: [HYDRO_PUMP, SURF, WITHDRAW, ICE_BEAM] },
  10: { id: 10, hp: 45, attack: 30, defense: 35, spAttack: 20, spDefense: 20, speed: 45, baseXp: 39, evYield: { hp: 1 }, moves: [TACKLE, GROWL, TACKLE, STRING_SHOT] },
  11: { id: 11, hp: 50, attack: 20, defense: 55, spAttack: 25, spDefense: 25, speed: 30, baseXp: 72, evYield: { defense: 1 }, moves: [HARDEN, HARDEN, TACKLE, HARDEN] },
  12: { id: 12, hp: 60, attack: 45, defense: 50, spAttack: 90, spDefense: 80, speed: 70, baseXp: 178, evYield: { spAttack: 2, spDefense: 1 }, moves: [PSYBEAM, SLEEP_POWDER, NASTY_PLOT, POISON_POWDER] },
  13: { id: 13, hp: 40, attack: 35, defense: 30, spAttack: 20, spDefense: 20, speed: 50, baseXp: 39, evYield: { speed: 1 }, moves: [POISON_STING, TACKLE, GROWL, PIN_MISSILE] },
  14: { id: 14, hp: 45, attack: 25, defense: 50, spAttack: 25, spDefense: 25, speed: 35, baseXp: 72, evYield: { defense: 1 }, moves: [HARDEN, HARDEN, TACKLE, HARDEN] },
  15: { id: 15, hp: 65, attack: 90, defense: 40, spAttack: 45, spDefense: 80, speed: 75, baseXp: 178, evYield: { attack: 2, spDefense: 1 }, moves: [PIN_MISSILE, POISON_STING, SWORDS_DANCE, X_SCISSOR] },
  16: { id: 16, hp: 40, attack: 45, defense: 40, spAttack: 35, spDefense: 35, speed: 56, baseXp: 50, evYield: { speed: 1 }, moves: [PECK, TACKLE, GROWL, WING_ATTACK] },
  17: { id: 17, hp: 63, attack: 60, defense: 55, spAttack: 50, spDefense: 50, speed: 71, baseXp: 122, evYield: { speed: 1, attack: 1 }, moves: [AERIAL_ACE, WING_ATTACK, AGILITY, PECK] },
  18: { id: 18, hp: 83, attack: 80, defense: 75, spAttack: 70, spDefense: 70, speed: 101, baseXp: 172, evYield: { speed: 3 }, moves: [AERIAL_ACE, WING_ATTACK, AGILITY, SLASH] },
  19: { id: 19, hp: 30, attack: 56, defense: 35, spAttack: 25, spDefense: 35, speed: 72, baseXp: 51, evYield: { speed: 1 }, moves: [BITE, FURY_SWIPES, GROWL, TAIL_WHIP] },
  20: { id: 20, hp: 55, attack: 81, defense: 60, spAttack: 50, spDefense: 70, speed: 97, baseXp: 145, evYield: { speed: 2, attack: 1 }, moves: [HYPER_FANG, FURY_SWIPES, SWORDS_DANCE, SLASH] },
  21: { id: 21, hp: 40, attack: 60, defense: 30, spAttack: 31, spDefense: 31, speed: 70, baseXp: 52, evYield: { speed: 1 }, moves: [PECK, FURY_ATTACK, LEER, AERIAL_ACE] },
  22: { id: 22, hp: 65, attack: 90, defense: 65, spAttack: 61, spDefense: 61, speed: 100, baseXp: 155, evYield: { speed: 1, attack: 2 }, moves: [AERIAL_ACE, FURY_ATTACK, AGILITY, SLASH] },
  23: { id: 23, hp: 35, attack: 60, defense: 44, spAttack: 40, spDefense: 54, speed: 55, baseXp: 58, evYield: { attack: 1 }, moves: [POISON_STING, WRAP, SCREECH, BITE] },
  24: { id: 24, hp: 60, attack: 95, defense: 69, spAttack: 65, spDefense: 79, speed: 80, baseXp: 153, evYield: { attack: 2, spDefense: 1 }, moves: [BITE, POISON_STING, SCREECH, WRAP] },
  25: { id: 25, hp: 35, attack: 55, defense: 40, spAttack: 50, spDefense: 50, speed: 90, baseXp: 105, evYield: { speed: 2 }, moves: [THUNDERBOLT, THUNDER_SHOCK, AGILITY, DOUBLE_SLAP] },
  26: { id: 26, hp: 60, attack: 90, defense: 55, spAttack: 90, spDefense: 80, speed: 110, baseXp: 218, evYield: { speed: 3 }, moves: [THUNDERBOLT, THUNDER, AGILITY, DOUBLE_SLAP] },
  27: { id: 27, hp: 50, attack: 75, defense: 85, spAttack: 20, spDefense: 30, speed: 40, baseXp: 93, evYield: { defense: 1 }, moves: [SLASH, SCRATCH, SWORDS_DANCE, FURY_SWIPES] },
  28: { id: 28, hp: 75, attack: 100, defense: 110, spAttack: 45, spDefense: 55, speed: 65, baseXp: 163, evYield: { defense: 2, attack: 1 }, moves: [SLASH, EARTHQUAKE, SWORDS_DANCE, FURY_SWIPES] },
  29: { id: 29, hp: 55, attack: 47, defense: 52, spAttack: 40, spDefense: 40, speed: 41, baseXp: 55, evYield: { hp: 1 }, moves: [POISON_STING, DOUBLE_KICK, GROWL, TACKLE] },
  30: { id: 30, hp: 70, attack: 62, defense: 67, spAttack: 55, spDefense: 55, speed: 56, baseXp: 128, evYield: { hp: 1, defense: 1 }, moves: [POISON_STING, DOUBLE_KICK, GROWL, BITE] },
  31: { id: 31, hp: 90, attack: 92, defense: 87, spAttack: 75, spDefense: 85, speed: 76, baseXp: 193, evYield: { hp: 3 }, moves: [EARTHQUAKE, POISON_STING, SCREECH, BODY_SLAM] },
  32: { id: 32, hp: 46, attack: 57, defense: 40, spAttack: 40, spDefense: 40, speed: 50, baseXp: 55, evYield: { attack: 1 }, moves: [POISON_STING, DOUBLE_KICK, LEER, TACKLE] },
  33: { id: 33, hp: 61, attack: 72, defense: 57, spAttack: 55, spDefense: 55, speed: 65, baseXp: 128, evYield: { attack: 1, spAttack: 1 }, moves: [POISON_STING, DOUBLE_KICK, LEER, SLASH] },
  34: { id: 34, hp: 81, attack: 102, defense: 77, spAttack: 85, spDefense: 75, speed: 85, baseXp: 194, evYield: { attack: 3 }, moves: [EARTHQUAKE, POISON_STING, SCREECH, SLASH] },
  35: { id: 35, hp: 70, attack: 45, defense: 48, spAttack: 60, spDefense: 65, speed: 35, baseXp: 68, evYield: { hp: 2 }, moves: [METRONOME, SING, CALM_MIND, BODY_SLAM] },
  36: { id: 36, hp: 95, attack: 70, defense: 73, spAttack: 95, spDefense: 90, speed: 60, baseXp: 129, evYield: { hp: 3 }, moves: [SWIFT, SING, CALM_MIND, BODY_SLAM] },
  37: { id: 37, hp: 38, attack: 41, defense: 40, spAttack: 50, spDefense: 65, speed: 65, baseXp: 60, evYield: { spDefense: 1 }, moves: [EMBER, TAIL_WHIP, NASTY_PLOT, SLASH] },
  38: { id: 38, hp: 73, attack: 76, defense: 75, spAttack: 81, spDefense: 100, speed: 100, baseXp: 177, evYield: { spDefense: 3 }, moves: [FLAMETHROWER, NASTY_PLOT, SLASH, FIRE_BLAST] },
  39: { id: 39, hp: 115, attack: 45, defense: 20, spAttack: 45, spDefense: 25, speed: 20, baseXp: 68, evYield: { hp: 2 }, moves: [SING, BODY_SLAM, GROWL, DOUBLE_SLAP] },
  40: { id: 40, hp: 140, attack: 70, defense: 45, spAttack: 85, spDefense: 50, speed: 45, baseXp: 109, evYield: { hp: 3 }, moves: [SING, BODY_SLAM, CALM_MIND, DOUBLE_SLAP] },
  41: { id: 41, hp: 40, attack: 45, defense: 35, spAttack: 30, spDefense: 40, speed: 55, baseXp: 49, evYield: { speed: 1 }, moves: [BITE, SUPERSONIC, WING_ATTACK, SCREECH] },
  42: { id: 42, hp: 75, attack: 80, defense: 70, spAttack: 65, spDefense: 75, speed: 90, baseXp: 159, evYield: { speed: 2, attack: 1 }, moves: [BITE, WING_ATTACK, SCREECH, AERIAL_ACE] },
  43: { id: 43, hp: 45, attack: 50, defense: 55, spAttack: 75, spDefense: 65, speed: 30, baseXp: 64, evYield: { spAttack: 1 }, moves: [ACID, TOXIC, GROWTH, SLEEP_POWDER] },
  44: { id: 44, hp: 60, attack: 65, defense: 70, spAttack: 85, spDefense: 75, speed: 40, baseXp: 138, evYield: { spAttack: 2 }, moves: [ACID, TOXIC, GROWTH, SLEEP_POWDER] },
  45: { id: 45, hp: 75, attack: 80, defense: 85, spAttack: 110, spDefense: 90, speed: 50, baseXp: 216, evYield: { spAttack: 3 }, moves: [SOLAR_BEAM, ACID, NASTY_PLOT, SLEEP_POWDER] },
  46: { id: 46, hp: 35, attack: 70, defense: 55, spAttack: 45, spDefense: 55, speed: 25, baseXp: 57, evYield: { attack: 1 }, moves: [SLASH, SLEEP_POWDER, SWORDS_DANCE, X_SCISSOR] },
  47: { id: 47, hp: 60, attack: 95, defense: 80, spAttack: 60, spDefense: 80, speed: 30, baseXp: 142, evYield: { attack: 2, defense: 1 }, moves: [X_SCISSOR, SLASH, SWORDS_DANCE, SLEEP_POWDER] },
  48: { id: 48, hp: 60, attack: 55, defense: 50, spAttack: 40, spDefense: 55, speed: 45, baseXp: 61, evYield: { spDefense: 1 }, moves: [TACKLE, POISON_STING, HYPNOSIS, POISON_POWDER] },
  49: { id: 49, hp: 70, attack: 65, defense: 60, spAttack: 90, spDefense: 75, speed: 90, baseXp: 158, evYield: { spAttack: 2, spDefense: 1 }, moves: [PSYBEAM, POISON_POWDER, CALM_MIND, HYPNOSIS] },
  50: { id: 50, hp: 10, attack: 55, defense: 25, spAttack: 35, spDefense: 45, speed: 95, baseXp: 81, evYield: { speed: 1 }, moves: [SLASH, EARTHQUAKE, SCREECH, FURY_SWIPES] },
  51: { id: 51, hp: 35, attack: 100, defense: 50, spAttack: 50, spDefense: 70, speed: 120, baseXp: 153, evYield: { speed: 2, attack: 1 }, moves: [EARTHQUAKE, SLASH, SCREECH, FURY_SWIPES] },
  52: { id: 52, hp: 40, attack: 45, defense: 35, spAttack: 40, spDefense: 40, speed: 90, baseXp: 58, evYield: { speed: 1 }, moves: [SCRATCH, BITE, GROWL, FURY_SWIPES] },
  53: { id: 53, hp: 65, attack: 70, defense: 60, spAttack: 65, spDefense: 65, speed: 115, baseXp: 154, evYield: { speed: 2, attack: 1 }, moves: [SLASH, BITE, GROWL, FURY_SWIPES] },
  54: { id: 54, hp: 50, attack: 52, defense: 48, spAttack: 65, spDefense: 50, speed: 55, baseXp: 64, evYield: { spAttack: 1 }, moves: [PSYCHIC, WATER_GUN, CALM_MIND, RECOVER] },
  55: { id: 55, hp: 80, attack: 82, defense: 78, spAttack: 95, spDefense: 80, speed: 85, baseXp: 175, evYield: { spAttack: 2, attack: 1 }, moves: [PSYCHIC, HYDRO_PUMP, CALM_MIND, ICE_BEAM] },
  56: { id: 56, hp: 40, attack: 80, defense: 35, spAttack: 35, spDefense: 45, speed: 70, baseXp: 61, evYield: { attack: 1 }, moves: [KARATE_CHOP, FURY_SWIPES, SCREECH, SCRATCH] },
  57: { id: 57, hp: 65, attack: 105, defense: 60, spAttack: 60, spDefense: 70, speed: 95, baseXp: 159, evYield: { attack: 2, speed: 1 }, moves: [CLOSE_COMBAT, KARATE_CHOP, SCREECH, FURY_SWIPES] },
  58: { id: 58, hp: 55, attack: 70, defense: 45, spAttack: 70, spDefense: 50, speed: 60, baseXp: 91, evYield: { attack: 1 }, moves: [EMBER, BITE, LEER, SLASH] },
  59: { id: 59, hp: 90, attack: 110, defense: 80, spAttack: 100, spDefense: 80, speed: 95, baseXp: 194, evYield: { attack: 2, spAttack: 1 }, moves: [FLAMETHROWER, BITE, NASTY_PLOT, SLASH] },
  60: { id: 60, hp: 40, attack: 50, defense: 40, spAttack: 40, spDefense: 40, speed: 90, baseXp: 60, evYield: { speed: 1 }, moves: [WATER_GUN, GROWL, HYPNOSIS, TACKLE] },
  61: { id: 61, hp: 65, attack: 65, defense: 65, spAttack: 50, spDefense: 50, speed: 90, baseXp: 135, evYield: { speed: 2 }, moves: [SURF, HYPNOSIS, AGILITY, BODY_SLAM] },
  62: { id: 62, hp: 90, attack: 95, defense: 95, spAttack: 70, spDefense: 90, speed: 70, baseXp: 185, evYield: { defense: 3 }, moves: [HYDRO_PUMP, CLOSE_COMBAT, AGILITY, BODY_SLAM] },
  63: { id: 63, hp: 25, attack: 20, defense: 15, spAttack: 105, spDefense: 55, speed: 90, baseXp: 62, evYield: { spAttack: 1 }, moves: [PSYCHIC, TELEPORT, CALM_MIND, PSYBEAM] },
  64: { id: 64, hp: 40, attack: 35, defense: 30, spAttack: 120, spDefense: 70, speed: 105, baseXp: 140, evYield: { spAttack: 2 }, moves: [PSYCHIC, PSYBEAM, CALM_MIND, RECOVER] },
  65: { id: 65, hp: 55, attack: 50, defense: 45, spAttack: 135, spDefense: 95, speed: 120, baseXp: 186, evYield: { spAttack: 3 }, moves: [PSYCHIC, PSYBEAM, CALM_MIND, RECOVER] },
  66: { id: 66, hp: 70, attack: 80, defense: 50, spAttack: 35, spDefense: 35, speed: 35, baseXp: 61, evYield: { attack: 1 }, moves: [KARATE_CHOP, LEER, SHARPEN, FURY_SWIPES] },
  67: { id: 67, hp: 80, attack: 100, defense: 70, spAttack: 50, spDefense: 60, speed: 45, baseXp: 142, evYield: { attack: 2 }, moves: [KARATE_CHOP, LEER, SWORDS_DANCE, FURY_SWIPES] },
  68: { id: 68, hp: 90, attack: 130, defense: 80, spAttack: 65, spDefense: 85, speed: 55, baseXp: 193, evYield: { attack: 3 }, moves: [CLOSE_COMBAT, KARATE_CHOP, SWORDS_DANCE, FURY_SWIPES] },
  69: { id: 69, hp: 50, attack: 75, defense: 35, spAttack: 70, spDefense: 30, speed: 40, baseXp: 60, evYield: { attack: 1 }, moves: [ACID, GROWTH, SLASH, SLEEP_POWDER] },
  70: { id: 70, hp: 65, attack: 90, defense: 50, spAttack: 85, spDefense: 45, speed: 55, baseXp: 137, evYield: { attack: 2 }, moves: [ACID, NASTY_PLOT, SLASH, SLEEP_POWDER] },
  71: { id: 71, hp: 80, attack: 105, defense: 65, spAttack: 100, spDefense: 60, speed: 70, baseXp: 191, evYield: { attack: 3 }, moves: [SOLAR_BEAM, ACID, NASTY_PLOT, SLASH] },
  72: { id: 72, hp: 40, attack: 40, defense: 35, spAttack: 50, spDefense: 100, speed: 70, baseXp: 67, evYield: { spDefense: 1 }, moves: [ACID, WATER_GUN, SCREECH, POISON_STING] },
  73: { id: 73, hp: 80, attack: 70, defense: 65, spAttack: 80, spDefense: 120, speed: 100, baseXp: 180, evYield: { spDefense: 2, speed: 1 }, moves: [HYDRO_PUMP, ACID, SCREECH, SURF] },
  74: { id: 74, hp: 40, attack: 80, defense: 100, spAttack: 30, spDefense: 30, speed: 20, baseXp: 73, evYield: { defense: 1 }, moves: [ROCK_THROW, EARTHQUAKE, SCREECH, SLASH] },
  75: { id: 75, hp: 55, attack: 95, defense: 115, spAttack: 45, spDefense: 45, speed: 35, baseXp: 134, evYield: { defense: 2 }, moves: [EARTHQUAKE, ROCK_THROW, SCREECH, SLASH] },
  76: { id: 76, hp: 80, attack: 120, defense: 130, spAttack: 55, spDefense: 65, speed: 45, baseXp: 177, evYield: { defense: 3 }, moves: [EARTHQUAKE, ROCK_THROW, SCREECH, SLASH] },
  77: { id: 77, hp: 50, attack: 85, defense: 55, spAttack: 65, spDefense: 65, speed: 90, baseXp: 82, evYield: { speed: 1 }, moves: [EMBER, AGILITY, SLASH, GROWL] },
  78: { id: 78, hp: 65, attack: 100, defense: 70, spAttack: 80, spDefense: 80, speed: 105, baseXp: 175, evYield: { speed: 2, attack: 1 }, moves: [FLAMETHROWER, AGILITY, SLASH, FIRE_BLAST] },
  79: { id: 79, hp: 90, attack: 65, defense: 65, spAttack: 40, spDefense: 40, speed: 15, baseXp: 99, evYield: { hp: 1 }, moves: [WATER_GUN, AMNESIA, HYPNOSIS, TACKLE] },
  80: { id: 80, hp: 95, attack: 75, defense: 110, spAttack: 100, spDefense: 80, speed: 30, baseXp: 164, evYield: { defense: 2, spAttack: 1 }, moves: [PSYCHIC, SURF, AMNESIA, CALM_MIND] },
  81: { id: 81, hp: 25, attack: 35, defense: 70, spAttack: 95, spDefense: 55, speed: 45, baseXp: 89, evYield: { spAttack: 1 }, moves: [THUNDERBOLT, THUNDER_SHOCK, SCREECH, SONIC_BOOM] },
  82: { id: 82, hp: 50, attack: 60, defense: 95, spAttack: 120, spDefense: 70, speed: 70, baseXp: 161, evYield: { spAttack: 2, defense: 1 }, moves: [THUNDERBOLT, THUNDER, SCREECH, SPIKE_CANNON] },
  83: { id: 83, hp: 52, attack: 90, defense: 55, spAttack: 58, spDefense: 62, speed: 60, baseXp: 94, evYield: { attack: 1 }, moves: [SLASH, AERIAL_ACE, SWORDS_DANCE, PECK] },
  84: { id: 84, hp: 35, attack: 85, defense: 45, spAttack: 35, spDefense: 35, speed: 75, baseXp: 62, evYield: { attack: 1 }, moves: [PECK, FURY_ATTACK, AGILITY, GROWL] },
  85: { id: 85, hp: 60, attack: 110, defense: 70, spAttack: 60, spDefense: 60, speed: 110, baseXp: 165, evYield: { attack: 2, speed: 1 }, moves: [AERIAL_ACE, FURY_ATTACK, AGILITY, SLASH] },
  86: { id: 86, hp: 65, attack: 45, defense: 55, spAttack: 45, spDefense: 70, speed: 45, baseXp: 65, evYield: { spDefense: 1 }, moves: [SURF, ICE_BEAM, GROWL, TACKLE] },
  87: { id: 87, hp: 90, attack: 70, defense: 80, spAttack: 70, spDefense: 95, speed: 70, baseXp: 166, evYield: { spDefense: 2, hp: 1 }, moves: [SURF, ICE_BEAM, AGILITY, BLIZZARD] },
  88: { id: 88, hp: 80, attack: 80, defense: 50, spAttack: 40, spDefense: 50, speed: 25, baseXp: 90, evYield: { hp: 1 }, moves: [ACID, TOXIC, SCREECH, SMOG] },
  89: { id: 89, hp: 105, attack: 105, defense: 75, spAttack: 65, spDefense: 100, speed: 50, baseXp: 157, evYield: { hp: 2, attack: 1 }, moves: [ACID, TOXIC, SCREECH, SMOG] },
  90: { id: 90, hp: 30, attack: 65, defense: 100, spAttack: 45, spDefense: 25, speed: 40, baseXp: 61, evYield: { defense: 1 }, moves: [WATER_GUN, WITHDRAW, TACKLE, LEER] },
  91: { id: 91, hp: 50, attack: 95, defense: 180, spAttack: 85, spDefense: 45, speed: 70, baseXp: 184, evYield: { defense: 3 }, moves: [HYDRO_PUMP, BLIZZARD, WITHDRAW, SPIKE_CANNON] },
  92: { id: 92, hp: 30, attack: 35, defense: 30, spAttack: 100, spDefense: 35, speed: 80, baseXp: 62, evYield: { spAttack: 1 }, moves: [NIGHT_SHADE, HYPNOSIS, CONFUSE_RAY, TOXIC] },
  93: { id: 93, hp: 45, attack: 50, defense: 45, spAttack: 115, spDefense: 55, speed: 95, baseXp: 142, evYield: { spAttack: 2 }, moves: [NIGHT_SHADE, HYPNOSIS, CONFUSE_RAY, TOXIC] },
  94: { id: 94, hp: 60, attack: 65, defense: 60, spAttack: 130, spDefense: 75, speed: 110, baseXp: 190, evYield: { spAttack: 3 }, moves: [NIGHT_SHADE, HYPNOSIS, NASTY_PLOT, TOXIC] },
  95: { id: 95, hp: 35, attack: 45, defense: 160, spAttack: 30, spDefense: 45, speed: 70, baseXp: 108, evYield: { defense: 1 }, moves: [EARTHQUAKE, ROCK_THROW, SCREECH, SLASH] },
  96: { id: 96, hp: 60, attack: 48, defense: 45, spAttack: 43, spDefense: 90, speed: 42, baseXp: 102, evYield: { spDefense: 1 }, moves: [PSYCHIC, HYPNOSIS, CALM_MIND, PSYBEAM] },
  97: { id: 97, hp: 85, attack: 73, defense: 70, spAttack: 73, spDefense: 115, speed: 67, baseXp: 165, evYield: { spDefense: 2, hp: 1 }, moves: [PSYCHIC, HYPNOSIS, CALM_MIND, BODY_SLAM] },
  98: { id: 98, hp: 30, attack: 105, defense: 90, spAttack: 25, spDefense: 25, speed: 50, baseXp: 65, evYield: { attack: 1 }, moves: [SLASH, CRABHAMMER, SCREECH, LEER] },
  99: { id: 99, hp: 55, attack: 130, defense: 115, spAttack: 50, spDefense: 50, speed: 75, baseXp: 166, evYield: { attack: 2, defense: 1 }, moves: [CRABHAMMER, SLASH, SCREECH, SPIKE_CANNON] },
  100: { id: 100, hp: 40, attack: 30, defense: 50, spAttack: 55, spDefense: 55, speed: 100, baseXp: 66, evYield: { speed: 1 }, moves: [THUNDERBOLT, THUNDER_SHOCK, SCREECH, SONIC_BOOM] },
  101: { id: 101, hp: 60, attack: 50, defense: 70, spAttack: 80, spDefense: 80, speed: 140, baseXp: 168, evYield: { speed: 2, spAttack: 1 }, moves: [THUNDERBOLT, THUNDER, AGILITY, SONIC_BOOM] },
  102: { id: 102, hp: 60, attack: 40, defense: 80, spAttack: 60, spDefense: 45, speed: 40, baseXp: 65, evYield: { defense: 1 }, moves: [PSYBEAM, HYPNOSIS, GROWTH, SLEEP_POWDER] },
  103: { id: 103, hp: 95, attack: 95, defense: 85, spAttack: 125, spDefense: 75, speed: 55, baseXp: 182, evYield: { spAttack: 2, hp: 1 }, moves: [SOLAR_BEAM, PSYCHIC, NASTY_PLOT, HYPNOSIS] },
  104: { id: 104, hp: 50, attack: 50, defense: 95, spAttack: 40, spDefense: 50, speed: 35, baseXp: 74, evYield: { defense: 1 }, moves: [EARTHQUAKE, SLASH, SCREECH, LEER] },
  105: { id: 105, hp: 60, attack: 80, defense: 110, spAttack: 50, spDefense: 80, speed: 45, baseXp: 149, evYield: { defense: 2 }, moves: [EARTHQUAKE, SLASH, SCREECH, SWORDS_DANCE] },
  106: { id: 106, hp: 50, attack: 120, defense: 53, spAttack: 35, spDefense: 110, speed: 87, baseXp: 139, evYield: { attack: 2 }, moves: [CLOSE_COMBAT, DOUBLE_KICK, AGILITY, LEER] },
  107: { id: 107, hp: 50, attack: 105, defense: 79, spAttack: 35, spDefense: 110, speed: 76, baseXp: 140, evYield: { attack: 1, spDefense: 1 }, moves: [FIRE_PUNCH, KARATE_CHOP, AGILITY, COMET_PUNCH] },
  108: { id: 108, hp: 90, attack: 55, defense: 75, spAttack: 60, spDefense: 75, speed: 30, baseXp: 127, evYield: { hp: 2 }, moves: [BODY_SLAM, SLASH, GROWL, LEER] },
  109: { id: 109, hp: 40, attack: 65, defense: 95, spAttack: 60, spDefense: 45, speed: 35, baseXp: 114, evYield: { defense: 1 }, moves: [SMOG, TOXIC, SCREECH, ACID] },
  110: { id: 110, hp: 65, attack: 90, defense: 120, spAttack: 85, spDefense: 70, speed: 60, baseXp: 173, evYield: { defense: 2, attack: 1 }, moves: [SMOG, TOXIC, SCREECH, ACID] },
  111: { id: 111, hp: 80, attack: 85, defense: 95, spAttack: 30, spDefense: 30, speed: 25, baseXp: 135, evYield: { defense: 1 }, moves: [EARTHQUAKE, ROCK_THROW, LEER, FURY_ATTACK] },
  112: { id: 112, hp: 105, attack: 130, defense: 120, spAttack: 45, spDefense: 45, speed: 40, baseXp: 204, evYield: { attack: 2, defense: 1 }, moves: [EARTHQUAKE, ROCK_THROW, SCREECH, SLASH] },
  113: { id: 113, hp: 250, attack: 5, defense: 5, spAttack: 35, spDefense: 105, speed: 50, baseXp: 255, evYield: { hp: 2 }, moves: [SING, BODY_SLAM, CALM_MIND, RECOVER] },
  114: { id: 114, hp: 65, attack: 55, defense: 115, spAttack: 100, spDefense: 40, speed: 60, baseXp: 166, evYield: { defense: 1 }, moves: [SOLAR_BEAM, GROWTH, SLASH, SLEEP_POWDER] },
  115: { id: 115, hp: 105, attack: 95, defense: 80, spAttack: 40, spDefense: 80, speed: 90, baseXp: 172, evYield: { hp: 2 }, moves: [BODY_SLAM, COMET_PUNCH, LEER, SLASH] },
  116: { id: 116, hp: 30, attack: 40, defense: 70, spAttack: 70, spDefense: 25, speed: 60, baseXp: 59, evYield: { spAttack: 1 }, moves: [WATER_GUN, AGILITY, SCREECH, TACKLE] },
  117: { id: 117, hp: 55, attack: 65, defense: 95, spAttack: 95, spDefense: 45, speed: 85, baseXp: 154, evYield: { spAttack: 2 }, moves: [HYDRO_PUMP, AGILITY, SCREECH, SPIKE_CANNON] },
  118: { id: 118, hp: 45, attack: 67, defense: 60, spAttack: 35, spDefense: 50, speed: 63, baseXp: 64, evYield: { attack: 1 }, moves: [PECK, FURY_ATTACK, AGILITY, SLASH] },
  119: { id: 119, hp: 80, attack: 92, defense: 65, spAttack: 65, spDefense: 80, speed: 68, baseXp: 158, evYield: { attack: 2 }, moves: [PECK, FURY_ATTACK, AGILITY, SLASH] },
  120: { id: 120, hp: 30, attack: 45, defense: 55, spAttack: 70, spDefense: 55, speed: 85, baseXp: 68, evYield: { speed: 1 }, moves: [SWIFT, WATER_GUN, AGILITY, RECOVER] },
  121: { id: 121, hp: 60, attack: 75, defense: 85, spAttack: 100, spDefense: 85, speed: 115, baseXp: 182, evYield: { spAttack: 1, speed: 2 }, moves: [PSYCHIC, HYDRO_PUMP, AGILITY, RECOVER] },
  122: { id: 122, hp: 40, attack: 45, defense: 65, spAttack: 100, spDefense: 120, speed: 90, baseXp: 136, evYield: { spDefense: 2 }, moves: [PSYCHIC, PSYBEAM, CALM_MIND, BARRIER] },
  123: { id: 123, hp: 70, attack: 110, defense: 80, spAttack: 55, spDefense: 80, speed: 105, baseXp: 187, evYield: { attack: 2 }, moves: [SLASH, X_SCISSOR, SWORDS_DANCE, AERIAL_ACE] },
  124: { id: 124, hp: 65, attack: 50, defense: 35, spAttack: 115, spDefense: 95, speed: 95, baseXp: 137, evYield: { spAttack: 2 }, moves: [BLIZZARD, PSYCHIC, NASTY_PLOT, HYPNOSIS] },
  125: { id: 125, hp: 65, attack: 83, defense: 57, spAttack: 95, spDefense: 85, speed: 105, baseXp: 156, evYield: { spAttack: 2 }, moves: [THUNDERBOLT, THUNDER, AGILITY, DOUBLE_KICK] },
  126: { id: 126, hp: 65, attack: 95, defense: 57, spAttack: 100, spDefense: 85, speed: 93, baseXp: 167, evYield: { spAttack: 2 }, moves: [FLAMETHROWER, FIRE_PUNCH, NASTY_PLOT, SLASH] },
  127: { id: 127, hp: 65, attack: 125, defense: 100, spAttack: 55, spDefense: 70, speed: 85, baseXp: 200, evYield: { attack: 2 }, moves: [X_SCISSOR, SLASH, SWORDS_DANCE, FURY_SWIPES] },
  128: { id: 128, hp: 75, attack: 100, defense: 95, spAttack: 40, spDefense: 70, speed: 110, baseXp: 211, evYield: { attack: 2, speed: 1 }, moves: [BODY_SLAM, SLASH, LEER, FURY_SWIPES] },
  129: { id: 129, hp: 20, attack: 10, defense: 55, spAttack: 15, spDefense: 20, speed: 80, baseXp: 40, evYield: { speed: 1 }, moves: [TACKLE, GROWL, TACKLE, TACKLE] },
  130: { id: 130, hp: 95, attack: 125, defense: 79, spAttack: 60, spDefense: 100, speed: 81, baseXp: 189, evYield: { attack: 2, spDefense: 1 }, moves: [HYDRO_PUMP, BITE, LEER, AERIAL_ACE] },
  131: { id: 131, hp: 130, attack: 85, defense: 80, spAttack: 85, spDefense: 95, speed: 60, baseXp: 187, evYield: { hp: 2 }, moves: [SURF, ICE_BEAM, BODY_SLAM, CONFUSE_RAY] },
  132: { id: 132, hp: 48, attack: 48, defense: 48, spAttack: 48, spDefense: 48, speed: 48, baseXp: 61, evYield: { hp: 1 }, moves: [TRANSFORM, TACKLE, TACKLE, TACKLE] },
  133: { id: 133, hp: 55, attack: 55, defense: 50, spAttack: 45, spDefense: 65, speed: 55, baseXp: 65, evYield: { hp: 1 }, moves: [BITE, TACKLE, GROWL, SWIFT] },
  134: { id: 134, hp: 130, attack: 65, defense: 60, spAttack: 110, spDefense: 95, speed: 65, baseXp: 184, evYield: { hp: 2, spAttack: 1 }, moves: [HYDRO_PUMP, SURF, BARRIER, AGILITY] },
  135: { id: 135, hp: 65, attack: 65, defense: 60, spAttack: 110, spDefense: 95, speed: 130, baseXp: 184, evYield: { speed: 2, spAttack: 1 }, moves: [THUNDERBOLT, THUNDER, AGILITY, DOUBLE_KICK] },
  136: { id: 136, hp: 65, attack: 130, defense: 60, spAttack: 95, spDefense: 110, speed: 65, baseXp: 184, evYield: { attack: 2, spDefense: 1 }, moves: [FLAMETHROWER, FIRE_PUNCH, SWORDS_DANCE, SLASH] },
  137: { id: 137, hp: 65, attack: 60, defense: 70, spAttack: 85, spDefense: 75, speed: 40, baseXp: 130, evYield: { spAttack: 1 }, moves: [PSYBEAM, SWIFT, SHARPEN, AGILITY] },
  138: { id: 138, hp: 35, attack: 40, defense: 100, spAttack: 90, spDefense: 55, speed: 35, baseXp: 120, evYield: { defense: 1 }, moves: [WATER_GUN, WITHDRAW, ROCK_THROW, SPIKE_CANNON] },
  139: { id: 139, hp: 70, attack: 60, defense: 125, spAttack: 115, spDefense: 70, speed: 55, baseXp: 199, evYield: { defense: 2, spAttack: 1 }, moves: [HYDRO_PUMP, WATER_GUN, WITHDRAW, SPIKE_CANNON] },
  140: { id: 140, hp: 30, attack: 80, defense: 90, spAttack: 55, spDefense: 45, speed: 55, baseXp: 119, evYield: { defense: 1 }, moves: [SLASH, ROCK_THROW, WITHDRAW, FURY_SWIPES] },
  141: { id: 141, hp: 60, attack: 115, defense: 105, spAttack: 65, spDefense: 70, speed: 80, baseXp: 201, evYield: { attack: 2, defense: 1 }, moves: [SLASH, CRABHAMMER, SWORDS_DANCE, FURY_SWIPES] },
  142: { id: 142, hp: 80, attack: 105, defense: 65, spAttack: 60, spDefense: 75, speed: 130, baseXp: 202, evYield: { speed: 2, attack: 1 }, moves: [AERIAL_ACE, ROCK_THROW, AGILITY, SLASH] },
  143: { id: 143, hp: 160, attack: 110, defense: 65, spAttack: 65, spDefense: 110, speed: 30, baseXp: 189, evYield: { hp: 2 }, moves: [BODY_SLAM, EARTHQUAKE, AMNESIA, SLASH] },
  144: { id: 144, hp: 90, attack: 85, defense: 100, spAttack: 95, spDefense: 125, speed: 85, baseXp: 215, evYield: { spDefense: 3 }, moves: [BLIZZARD, ICE_BEAM, BARRIER, AERIAL_ACE] },
  145: { id: 145, hp: 90, attack: 90, defense: 85, spAttack: 125, spDefense: 90, speed: 100, baseXp: 216, evYield: { spAttack: 3 }, moves: [THUNDER, THUNDERBOLT, AGILITY, AERIAL_ACE] },
  146: { id: 146, hp: 90, attack: 100, defense: 90, spAttack: 125, spDefense: 85, speed: 90, baseXp: 215, evYield: { spAttack: 3 }, moves: [FLAMETHROWER, FIRE_BLAST, NASTY_PLOT, AERIAL_ACE] },
  147: { id: 147, hp: 41, attack: 64, defense: 45, spAttack: 50, spDefense: 50, speed: 50, baseXp: 67, evYield: { attack: 1 }, moves: [DRAGON_RAGE, AGILITY, SLAM, WRAP] },
  148: { id: 148, hp: 61, attack: 84, defense: 65, spAttack: 70, spDefense: 70, speed: 70, baseXp: 144, evYield: { attack: 2 }, moves: [DRAGON_RAGE, AGILITY, SLAM, BODY_SLAM] },
  149: { id: 149, hp: 91, attack: 134, defense: 95, spAttack: 100, spDefense: 100, speed: 80, baseXp: 218, evYield: { attack: 3 }, moves: [DRAGON_RAGE, AERIAL_ACE, AGILITY, SLASH] },
  150: { id: 150, hp: 106, attack: 110, defense: 90, spAttack: 154, spDefense: 90, speed: 130, baseXp: 220, evYield: { spAttack: 3 }, moves: [PSYCHIC, NASTY_PLOT, RECOVER, BARRIER] },
  151: { id: 151, hp: 100, attack: 100, defense: 100, spAttack: 100, spDefense: 100, speed: 100, baseXp: 64, evYield: { hp: 3 }, moves: [PSYCHIC, NASTY_PLOT, CALM_MIND, TRANSFORM] },
  // Gen 2-4 (équipes PVP de prêt)
  196: { id: 196, hp: 65,  attack: 65,  defense: 60,  spAttack: 130, spDefense: 95,  speed: 110, baseXp: 184, evYield: { spAttack: 2, speed: 1 }, moves: [PSYCHIC, CALM_MIND, RECOVER, AGILITY] },
  229: { id: 229, hp: 75,  attack: 90,  defense: 50,  spAttack: 110, spDefense: 80,  speed: 95,  baseXp: 175, evYield: { spAttack: 2, attack: 1 }, moves: [FLAMETHROWER, NASTY_PLOT, BITE, SLASH] },
  260: { id: 260, hp: 100, attack: 110, defense: 90,  spAttack: 85,  spDefense: 90,  speed: 60,  baseXp: 188, evYield: { hp: 1, attack: 2 }, moves: [SURF, EARTHQUAKE, ICE_BEAM, BODY_SLAM] },
  350: { id: 350, hp: 95,  attack: 60,  defense: 79,  spAttack: 100, spDefense: 125, speed: 81,  baseXp: 189, evYield: { spDefense: 2, spAttack: 1 }, moves: [SURF, ICE_BEAM, RECOVER, TOXIC] },
  445: { id: 445, hp: 108, attack: 130, defense: 95,  spAttack: 80,  spDefense: 85,  speed: 102, baseXp: 220, evYield: { attack: 3 }, moves: [EARTHQUAKE, DRAGON_RAGE, SLASH, AGILITY] },
  448: { id: 448, hp: 70,  attack: 110, defense: 70,  spAttack: 115, spDefense: 70,  speed: 90,  baseXp: 220, evYield: { attack: 2, spAttack: 1 }, moves: [CLOSE_COMBAT, PSYCHIC, NASTY_PLOT, AGILITY] },
  466: { id: 466, hp: 75,  attack: 123, defense: 67,  spAttack: 95,  spDefense: 85,  speed: 95,  baseXp: 206, evYield: { attack: 3 }, moves: [THUNDERBOLT, FIRE_PUNCH, ICE_BEAM, CLOSE_COMBAT] },
  467: { id: 467, hp: 75,  attack: 95,  defense: 67,  spAttack: 125, spDefense: 95,  speed: 83,  baseXp: 206, evYield: { spAttack: 3 }, moves: [FLAMETHROWER, PSYCHIC, THUNDERBOLT, NASTY_PLOT] },
  468: { id: 468, hp: 85,  attack: 50,  defense: 95,  spAttack: 120, spDefense: 115, speed: 80,  baseXp: 220, evYield: { spAttack: 2, spDefense: 1 }, moves: [AERIAL_ACE, THUNDERBOLT, NASTY_PLOT, BODY_SLAM] },
  470: { id: 470, hp: 65,  attack: 110, defense: 130, spAttack: 60,  spDefense: 65,  speed: 95,  baseXp: 184, evYield: { defense: 2, attack: 1 }, moves: [RAZOR_LEAF, SLASH, SWORDS_DANCE, X_SCISSOR] },
  473: { id: 473, hp: 110, attack: 130, defense: 80,  spAttack: 70,  spDefense: 60,  speed: 80,  baseXp: 200, evYield: { attack: 3 }, moves: [ICE_BEAM, EARTHQUAKE, BITE, SLASH] },
};
