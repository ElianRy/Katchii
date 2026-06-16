export interface Move {
  id: string;
  name: string;
  type: 'normal'|'fire'|'water'|'grass'|'electric'|'ice'|'fighting'|'poison'|'ground'|'flying'|'psychic'|'bug'|'rock'|'ghost'|'dragon'|'dark'|'steel';
  category: 'physical' | 'special' | 'status';
  power: number;
  accuracy: number;
  pp: number;
  priority: number;
  description: string;
  multiHit?: boolean;
  highCrit?: boolean;
  statBoost?: { stat: 'attack'|'defense'|'spAttack'|'spDefense'|'speed'; target: 'self'|'foe'; stages: number; chance?: number };
  effect?: { type: 'burn'|'poison'|'toxic'|'paralysis'|'sleep'|'freeze'; chance: number };
  recoil?: number;
  alwaysHit?: boolean;
  draining?: number;
}

export const MOVES: Record<string, Move> = {
  // Normal type
  'tackle': { id: 'tackle', name: 'Charge', type: 'normal', category: 'physical', power: 35, accuracy: 95, pp: 35, priority: 0, description: 'Attaque l\'adversaire avec le corps.' },
  'scratch': { id: 'scratch', name: 'Griffe', type: 'normal', category: 'physical', power: 40, accuracy: 100, pp: 35, priority: 0, description: 'Griffe l\'adversaire.' },
  'pound': { id: 'pound', name: 'Gnognotte', type: 'normal', category: 'physical', power: 40, accuracy: 100, pp: 35, priority: 0, description: 'Frappe l\'adversaire.' },
  'growl': { id: 'growl', name: 'Rugissement', type: 'normal', category: 'status', power: 0, accuracy: 100, pp: 40, priority: 0, description: 'Réduit l\'Attaque adverse.', statBoost: { stat: 'attack', target: 'foe', stages: -1 } },
  'tail-whip': { id: 'tail-whip', name: 'Mimi-Queue', type: 'normal', category: 'status', power: 0, accuracy: 100, pp: 30, priority: 0, description: 'Réduit la Défense adverse.', statBoost: { stat: 'defense', target: 'foe', stages: -1 } },
  'leer': { id: 'leer', name: 'Regard Noir', type: 'normal', category: 'status', power: 0, accuracy: 100, pp: 30, priority: 0, description: 'Réduit la Défense adverse.', statBoost: { stat: 'defense', target: 'foe', stages: -1 } },
  'screech': { id: 'screech', name: 'Cri Acide', type: 'normal', category: 'status', power: 0, accuracy: 85, pp: 40, priority: 0, description: 'Réduit fortement la Défense adverse.', statBoost: { stat: 'defense', target: 'foe', stages: -2 } },
  'quick-attack': { id: 'quick-attack', name: 'Vive-Attaque', type: 'normal', category: 'physical', power: 40, accuracy: 100, pp: 30, priority: 1, description: 'Attaque en premier.' },
  'slash': { id: 'slash', name: 'Tranche', type: 'normal', category: 'physical', power: 70, accuracy: 100, pp: 20, priority: 0, description: 'Taux de coup critique élevé.', highCrit: true },
  'cut': { id: 'cut', name: 'Coupe', type: 'normal', category: 'physical', power: 50, accuracy: 95, pp: 30, priority: 0, description: 'Tranche l\'adversaire.' },
  'strength': { id: 'strength', name: 'Force', type: 'normal', category: 'physical', power: 80, accuracy: 100, pp: 15, priority: 0, description: 'Attaque puissante.' },
  'hyper-beam': { id: 'hyper-beam', name: 'Ultralaser', type: 'normal', category: 'special', power: 150, accuracy: 90, pp: 5, priority: 0, description: 'Attaque puissante nécessitant un tour de recharge.' },
  'body-slam': { id: 'body-slam', name: 'Jackpot', type: 'normal', category: 'physical', power: 85, accuracy: 100, pp: 15, priority: 0, description: 'Peut paralyser l\'adversaire.', effect: { type: 'paralysis', chance: 30 } },
  'double-edge': { id: 'double-edge', name: 'Damoclès', type: 'normal', category: 'physical', power: 120, accuracy: 100, pp: 15, priority: 0, description: 'Attaque puissante mais inflige des dégâts de recul.', recoil: 0.33 },
  'take-down': { id: 'take-down', name: 'Bélier', type: 'normal', category: 'physical', power: 90, accuracy: 85, pp: 20, priority: 0, description: 'Attaque avec recul.', recoil: 0.25 },
  'double-slap': { id: 'double-slap', name: 'Torgnoles', type: 'normal', category: 'physical', power: 15, accuracy: 85, pp: 10, priority: 0, description: 'Frappe 2 à 5 fois de suite.', multiHit: true },
  'fury-swipes': { id: 'fury-swipes', name: 'Combo-Griffe', type: 'normal', category: 'physical', power: 18, accuracy: 80, pp: 15, priority: 0, description: 'Griffe 2 à 5 fois de suite.', multiHit: true },
  'pay-day': { id: 'pay-day', name: 'Jackpot', type: 'normal', category: 'physical', power: 40, accuracy: 100, pp: 20, priority: 0, description: 'Envoie des pièces en attaquant.' },
  'fake-out': { id: 'fake-out', name: 'Faux-Semblant', type: 'normal', category: 'physical', power: 40, accuracy: 100, pp: 10, priority: 3, description: 'Attaque en premier et fait sursauter.' },
  'supersonic': { id: 'supersonic', name: 'Ultrason', type: 'normal', category: 'status', power: 0, accuracy: 55, pp: 20, priority: 0, description: 'Inflige confusion à l\'adversaire.' },
  'disable': { id: 'disable', name: 'Entrave', type: 'normal', category: 'status', power: 0, accuracy: 100, pp: 20, priority: 0, description: 'Empêche une capacité adverse d\'être utilisée.' },
  'minimize': { id: 'minimize', name: 'Miniminus', type: 'normal', category: 'status', power: 0, accuracy: 0, pp: 20, priority: 0, description: 'Augmente l\'esquive.', statBoost: { stat: 'defense', target: 'self', stages: 2 } },
  'defense-curl': { id: 'defense-curl', name: 'Armure+', type: 'normal', category: 'status', power: 0, accuracy: 0, pp: 40, priority: 0, description: 'Augmente la Défense.', statBoost: { stat: 'defense', target: 'self', stages: 1 } },
  'harden': { id: 'harden', name: 'Armure', type: 'normal', category: 'status', power: 0, accuracy: 0, pp: 30, priority: 0, description: 'Augmente la Défense.', statBoost: { stat: 'defense', target: 'self', stages: 1 } },
  'sharpen': { id: 'sharpen', name: 'Affûtage', type: 'normal', category: 'status', power: 0, accuracy: 0, pp: 30, priority: 0, description: 'Augmente l\'Attaque.', statBoost: { stat: 'attack', target: 'self', stages: 1 } },
  'splash': { id: 'splash', name: 'Trempette', type: 'normal', category: 'status', power: 0, accuracy: 0, pp: 40, priority: 0, description: 'Aucun effet.' },
  'bide': { id: 'bide', name: 'Patience', type: 'normal', category: 'physical', power: 0, accuracy: 0, pp: 10, priority: 0, description: 'Accumule des dégâts puis riposte.' },
  'metronome': { id: 'metronome', name: 'Métronome', type: 'normal', category: 'status', power: 0, accuracy: 0, pp: 10, priority: 0, description: 'Utilise une capacité au hasard.' },

  // Fire type
  'ember': { id: 'ember', name: 'Flammèche', type: 'fire', category: 'special', power: 40, accuracy: 100, pp: 25, priority: 0, description: 'Peut brûler l\'adversaire.', effect: { type: 'burn', chance: 10 } },
  'flamethrower': { id: 'flamethrower', name: 'Lance-Flammes', type: 'fire', category: 'special', power: 90, accuracy: 100, pp: 15, priority: 0, description: 'Peut brûler l\'adversaire.', effect: { type: 'burn', chance: 10 } },
  'fire-blast': { id: 'fire-blast', name: 'Déflagration', type: 'fire', category: 'special', power: 110, accuracy: 85, pp: 5, priority: 0, description: 'Peut brûler l\'adversaire.', effect: { type: 'burn', chance: 10 } },
  'fire-spin': { id: 'fire-spin', name: 'Tourbifeu', type: 'fire', category: 'special', power: 35, accuracy: 85, pp: 15, priority: 0, description: 'Piège l\'adversaire 2 à 5 tours dans un tourbillon de feu.' },
  'flame-wheel': { id: 'flame-wheel', name: 'Roue de Feu', type: 'fire', category: 'physical', power: 60, accuracy: 100, pp: 25, priority: 0, description: 'Peut brûler l\'adversaire.', effect: { type: 'burn', chance: 10 } },
  'flare-blitz': { id: 'flare-blitz', name: 'Blizzard de Feu', type: 'fire', category: 'physical', power: 120, accuracy: 100, pp: 15, priority: 0, description: 'Peut brûler. Inflige des dégâts de recul.', effect: { type: 'burn', chance: 10 }, recoil: 0.33 },

  // Water type
  'water-gun': { id: 'water-gun', name: 'Pistolet à O', type: 'water', category: 'special', power: 40, accuracy: 100, pp: 25, priority: 0, description: 'Projette un jet d\'eau sur l\'adversaire.' },
  'surf': { id: 'surf', name: 'Surf', type: 'water', category: 'special', power: 90, accuracy: 100, pp: 15, priority: 0, description: 'Attaque avec une grande vague.' },
  'hydro-pump': { id: 'hydro-pump', name: 'Hydrocanon', type: 'water', category: 'special', power: 110, accuracy: 80, pp: 5, priority: 0, description: 'Projette un puissant jet d\'eau.' },
  'bubble': { id: 'bubble', name: 'Bulles d\'O', type: 'water', category: 'special', power: 40, accuracy: 100, pp: 30, priority: 0, description: 'Peut réduire la Vitesse adverse.', statBoost: { stat: 'speed', target: 'foe', stages: -1, chance: 10 } },
  'bubble-beam': { id: 'bubble-beam', name: 'Pistolet à O+', type: 'water', category: 'special', power: 65, accuracy: 100, pp: 20, priority: 0, description: 'Peut réduire la Vitesse adverse.', statBoost: { stat: 'speed', target: 'foe', stages: -1, chance: 10 } },
  'withdraw': { id: 'withdraw', name: 'Abri', type: 'water', category: 'status', power: 0, accuracy: 0, pp: 40, priority: 0, description: 'Augmente la Défense.', statBoost: { stat: 'defense', target: 'self', stages: 1 } },
  'clamp': { id: 'clamp', name: 'Étreinte', type: 'water', category: 'physical', power: 35, accuracy: 85, pp: 15, priority: 0, description: 'Piège l\'adversaire plusieurs tours.' },
  'waterfall': { id: 'waterfall', name: 'Cascade', type: 'water', category: 'physical', power: 80, accuracy: 100, pp: 15, priority: 0, description: 'Attaque en montant une cascade.' },

  // Grass type
  'vine-whip': { id: 'vine-whip', name: 'Fouet Lianes', type: 'grass', category: 'physical', power: 45, accuracy: 100, pp: 25, priority: 0, description: 'Fouette l\'adversaire avec des lianes.' },
  'razor-leaf': { id: 'razor-leaf', name: 'Tranche-Feuille', type: 'grass', category: 'physical', power: 55, accuracy: 95, pp: 25, priority: 0, description: 'Taux de coup critique élevé.', highCrit: true },
  'solar-beam': { id: 'solar-beam', name: 'Laser Solaire', type: 'grass', category: 'special', power: 120, accuracy: 100, pp: 10, priority: 0, description: 'Charge 1 tour puis attaque.' },
  'petal-dance': { id: 'petal-dance', name: 'Pétacrash', type: 'grass', category: 'special', power: 120, accuracy: 100, pp: 10, priority: 0, description: 'Attaque 2 à 3 tours puis provoque la confusion.' },
  'spore': { id: 'spore', name: 'Spore', type: 'grass', category: 'status', power: 0, accuracy: 100, pp: 15, priority: 0, description: 'Endort infailliblement l\'adversaire.', effect: { type: 'sleep', chance: 100 } },
  'sleep-powder': { id: 'sleep-powder', name: 'Poudre Dodo', type: 'grass', category: 'status', power: 0, accuracy: 75, pp: 15, priority: 0, description: 'Endort l\'adversaire.', effect: { type: 'sleep', chance: 100 } },
  'stun-spore': { id: 'stun-spore', name: 'Poudre Paralysante', type: 'grass', category: 'status', power: 0, accuracy: 75, pp: 30, priority: 0, description: 'Paralyse l\'adversaire.', effect: { type: 'paralysis', chance: 100 } },
  'poison-powder': { id: 'poison-powder', name: 'Poudre Toxik', type: 'grass', category: 'status', power: 0, accuracy: 75, pp: 35, priority: 0, description: 'Empoisonne l\'adversaire.', effect: { type: 'poison', chance: 100 } },
  'leech-seed': { id: 'leech-seed', name: 'Vampigraine', type: 'grass', category: 'status', power: 0, accuracy: 90, pp: 10, priority: 0, description: 'Absorbe des PV chaque tour.' },
  'absorb': { id: 'absorb', name: 'Vampiplante', type: 'grass', category: 'special', power: 20, accuracy: 100, pp: 25, priority: 0, description: 'Absorbe les PV adverses.', draining: 0.5 },
  'mega-drain': { id: 'mega-drain', name: 'Méga-Sangsue', type: 'grass', category: 'special', power: 40, accuracy: 100, pp: 15, priority: 0, description: 'Absorbe les PV adverses.', draining: 0.5 },
  'giga-drain': { id: 'giga-drain', name: 'Giga-Sangsue', type: 'grass', category: 'special', power: 60, accuracy: 100, pp: 10, priority: 0, description: 'Absorbe les PV adverses.', draining: 0.5 },

  // Electric type
  'thunder-shock': { id: 'thunder-shock', name: 'Éclair', type: 'electric', category: 'special', power: 40, accuracy: 100, pp: 30, priority: 0, description: 'Peut paralyser l\'adversaire.', effect: { type: 'paralysis', chance: 10 } },
  'thunderbolt': { id: 'thunderbolt', name: 'Tonnerre', type: 'electric', category: 'special', power: 90, accuracy: 100, pp: 15, priority: 0, description: 'Peut paralyser l\'adversaire.', effect: { type: 'paralysis', chance: 10 } },
  'thunder': { id: 'thunder', name: 'Foudre', type: 'electric', category: 'special', power: 110, accuracy: 70, pp: 10, priority: 0, description: 'Peut paralyser l\'adversaire.', effect: { type: 'paralysis', chance: 30 } },
  'thunder-wave': { id: 'thunder-wave', name: 'Cage Éclair', type: 'electric', category: 'status', power: 0, accuracy: 90, pp: 20, priority: 0, description: 'Paralyse l\'adversaire.', effect: { type: 'paralysis', chance: 100 } },
  'spark': { id: 'spark', name: 'Étincelle', type: 'electric', category: 'physical', power: 65, accuracy: 100, pp: 20, priority: 0, description: 'Peut paralyser l\'adversaire.', effect: { type: 'paralysis', chance: 30 } },

  // Ice type
  'ice-beam': { id: 'ice-beam', name: 'Blizzard', type: 'ice', category: 'special', power: 90, accuracy: 100, pp: 10, priority: 0, description: 'Peut congeler l\'adversaire.', effect: { type: 'freeze', chance: 10 } },
  'blizzard': { id: 'blizzard', name: 'Blizzard+', type: 'ice', category: 'special', power: 110, accuracy: 70, pp: 5, priority: 0, description: 'Peut congeler l\'adversaire.', effect: { type: 'freeze', chance: 10 } },
  'ice-punch': { id: 'ice-punch', name: 'Poing Glace', type: 'ice', category: 'physical', power: 75, accuracy: 100, pp: 15, priority: 0, description: 'Peut congeler l\'adversaire.', effect: { type: 'freeze', chance: 10 } },
  'aurora-beam': { id: 'aurora-beam', name: 'Aurore', type: 'ice', category: 'special', power: 65, accuracy: 100, pp: 20, priority: 0, description: 'Peut réduire l\'Attaque adverse.', statBoost: { stat: 'attack', target: 'foe', stages: -1, chance: 10 } },

  // Fighting type
  'karate-chop': { id: 'karate-chop', name: 'Tranche-Karate', type: 'fighting', category: 'physical', power: 50, accuracy: 100, pp: 25, priority: 0, description: 'Taux de coup critique élevé.', highCrit: true },
  'low-kick': { id: 'low-kick', name: 'Balayette', type: 'fighting', category: 'physical', power: 50, accuracy: 90, pp: 20, priority: 0, description: 'Fait trébucher l\'adversaire.' },
  'submission': { id: 'submission', name: 'Soumission', type: 'fighting', category: 'physical', power: 80, accuracy: 80, pp: 20, priority: 0, description: 'Attaque avec recul.', recoil: 0.25 },
  'seismic-toss': { id: 'seismic-toss', name: 'Coud\'Judo', type: 'fighting', category: 'physical', power: 0, accuracy: 100, pp: 20, priority: 0, description: 'Inflige des dégâts égaux au niveau du lanceur.' },
  'mega-punch': { id: 'mega-punch', name: 'Méga-Poing', type: 'fighting', category: 'physical', power: 80, accuracy: 85, pp: 20, priority: 0, description: 'Poing très puissant.' },
  'brick-break': { id: 'brick-break', name: 'Poing Karaté', type: 'fighting', category: 'physical', power: 75, accuracy: 100, pp: 15, priority: 0, description: 'Brise les barrières adverses.' },
  'mach-punch': { id: 'mach-punch', name: 'Direct Mach', type: 'fighting', category: 'physical', power: 40, accuracy: 100, pp: 30, priority: 1, description: 'Attaque en premier.' },
  'sky-uppercut': { id: 'sky-uppercut', name: 'Direct Ciel', type: 'fighting', category: 'physical', power: 85, accuracy: 90, pp: 15, priority: 0, description: 'Uppercut vers le ciel.' },

  // Poison type
  'poison-sting': { id: 'poison-sting', name: 'Dard-Venin', type: 'poison', category: 'physical', power: 15, accuracy: 100, pp: 35, priority: 0, description: 'Peut empoisonner l\'adversaire.', effect: { type: 'poison', chance: 30 } },
  'sludge': { id: 'sludge', name: 'Gadoue', type: 'poison', category: 'special', power: 65, accuracy: 100, pp: 20, priority: 0, description: 'Peut empoisonner l\'adversaire.', effect: { type: 'poison', chance: 30 } },
  'sludge-bomb': { id: 'sludge-bomb', name: 'Bomb-Beurk', type: 'poison', category: 'special', power: 90, accuracy: 100, pp: 10, priority: 0, description: 'Peut empoisonner l\'adversaire.', effect: { type: 'poison', chance: 30 } },
  'toxic': { id: 'toxic', name: 'Toxik', type: 'poison', category: 'status', power: 0, accuracy: 90, pp: 10, priority: 0, description: 'Empoisonne gravement l\'adversaire.', effect: { type: 'toxic', chance: 100 } },
  'poison-gas': { id: 'poison-gas', name: 'Gaz Toxik', type: 'poison', category: 'status', power: 0, accuracy: 80, pp: 40, priority: 0, description: 'Empoisonne l\'adversaire.', effect: { type: 'poison', chance: 100 } },
  'acid': { id: 'acid', name: 'Acide', type: 'poison', category: 'special', power: 40, accuracy: 100, pp: 30, priority: 0, description: 'Peut réduire la Déf. Spé. adverse.', statBoost: { stat: 'spDefense', target: 'foe', stages: -1, chance: 10 } },

  // Ground type
  'earthquake': { id: 'earthquake', name: 'Séisme', type: 'ground', category: 'physical', power: 100, accuracy: 100, pp: 10, priority: 0, description: 'Puissante secousse sismique.' },
  'dig': { id: 'dig', name: 'Tunnel', type: 'ground', category: 'physical', power: 80, accuracy: 100, pp: 10, priority: 0, description: 'Creuse 1 tour puis attaque.' },
  'sand-attack': { id: 'sand-attack', name: 'Jet de Sable', type: 'ground', category: 'status', power: 0, accuracy: 100, pp: 15, priority: 0, description: 'Réduit la précision adverse.', statBoost: { stat: 'defense', target: 'foe', stages: -1 } },
  'magnitude': { id: 'magnitude', name: 'Magnitude', type: 'ground', category: 'physical', power: 70, accuracy: 100, pp: 30, priority: 0, description: 'Puissance variable.' },
  'mud-slap': { id: 'mud-slap', name: 'Jet de Boue', type: 'ground', category: 'special', power: 20, accuracy: 100, pp: 10, priority: 0, description: 'Réduit la précision adverse.', statBoost: { stat: 'spDefense', target: 'foe', stages: -1 } },

  // Flying type
  'gust': { id: 'gust', name: 'Tornade', type: 'flying', category: 'special', power: 40, accuracy: 100, pp: 35, priority: 0, description: 'Souffle violent.' },
  'wing-attack': { id: 'wing-attack', name: 'Cru-Aile', type: 'flying', category: 'physical', power: 60, accuracy: 100, pp: 35, priority: 0, description: 'Attaque avec les ailes.' },
  'fly': { id: 'fly', name: 'Vol', type: 'flying', category: 'physical', power: 90, accuracy: 95, pp: 15, priority: 0, description: 'Vole 1 tour puis attaque.' },
  'peck': { id: 'peck', name: 'Picpic', type: 'flying', category: 'physical', power: 35, accuracy: 100, pp: 35, priority: 0, description: 'Pique l\'adversaire avec le bec.' },
  'drill-peck': { id: 'drill-peck', name: 'Picodrille', type: 'flying', category: 'physical', power: 80, accuracy: 100, pp: 20, priority: 0, description: 'Pique en tournoyant.' },
  'aerial-ace': { id: 'aerial-ace', name: 'Tranche-Air', type: 'flying', category: 'physical', power: 60, accuracy: 0, pp: 20, priority: 0, description: 'Attaque toujours avec précision.', alwaysHit: true },
  'sky-attack': { id: 'sky-attack', name: 'Frappe Atlas', type: 'flying', category: 'physical', power: 140, accuracy: 90, pp: 5, priority: 0, description: 'Charge 1 tour puis frappe.' },

  // Psychic type
  'confusion': { id: 'confusion', name: 'Choc Mental', type: 'psychic', category: 'special', power: 50, accuracy: 100, pp: 25, priority: 0, description: 'Peut réduire la Déf. Spé. adverse.', statBoost: { stat: 'spDefense', target: 'foe', stages: -1, chance: 10 } },
  'psychic': { id: 'psychic', name: 'Psyko', type: 'psychic', category: 'special', power: 90, accuracy: 100, pp: 10, priority: 0, description: 'Peut réduire la Déf. Spé. adverse.', statBoost: { stat: 'spDefense', target: 'foe', stages: -1, chance: 10 } },
  'psybeam': { id: 'psybeam', name: 'Tunnel Psy', type: 'psychic', category: 'special', power: 65, accuracy: 100, pp: 20, priority: 0, description: 'Rayons psychiques.' },
  'hypnosis': { id: 'hypnosis', name: 'Hypnose', type: 'psychic', category: 'status', power: 0, accuracy: 60, pp: 20, priority: 0, description: 'Endort l\'adversaire.', effect: { type: 'sleep', chance: 100 } },
  'meditate': { id: 'meditate', name: 'Méditation', type: 'psychic', category: 'status', power: 0, accuracy: 0, pp: 40, priority: 0, description: 'Augmente l\'Attaque.', statBoost: { stat: 'attack', target: 'self', stages: 1 } },
  'calm-mind': { id: 'calm-mind', name: 'Plénitude', type: 'psychic', category: 'status', power: 0, accuracy: 0, pp: 20, priority: 0, description: 'Augmente l\'Att. Spé.', statBoost: { stat: 'spAttack', target: 'self', stages: 1 } },
  'barrier': { id: 'barrier', name: 'Mur', type: 'psychic', category: 'status', power: 0, accuracy: 0, pp: 20, priority: 0, description: 'Augmente fortement la Défense.', statBoost: { stat: 'defense', target: 'self', stages: 2 } },
  'amnesia': { id: 'amnesia', name: 'Amnésie', type: 'psychic', category: 'status', power: 0, accuracy: 0, pp: 20, priority: 0, description: 'Augmente fortement la Déf. Spé.', statBoost: { stat: 'spDefense', target: 'self', stages: 2 } },
  'agility': { id: 'agility', name: 'Agilité', type: 'psychic', category: 'status', power: 0, accuracy: 0, pp: 30, priority: 0, description: 'Augmente fortement la Vitesse.', statBoost: { stat: 'speed', target: 'self', stages: 2 } },
  'recover': { id: 'recover', name: 'Soin', type: 'psychic', category: 'status', power: 0, accuracy: 0, pp: 10, priority: 0, description: 'Restaure la moitié des PV max.' },
  'teleport': { id: 'teleport', name: 'Téléport', type: 'psychic', category: 'status', power: 0, accuracy: 0, pp: 20, priority: -6, description: 'Permet la fuite du combat.' },

  // Bug type
  'leech-life': { id: 'leech-life', name: 'Vampirisme', type: 'bug', category: 'physical', power: 20, accuracy: 100, pp: 15, priority: 0, description: 'Absorbe les PV adverses.', draining: 0.5 },
  'string-shot': { id: 'string-shot', name: 'Sécrétion', type: 'bug', category: 'status', power: 0, accuracy: 95, pp: 40, priority: 0, description: 'Réduit la Vitesse adverse.', statBoost: { stat: 'speed', target: 'foe', stages: -1 } },
  'pin-missile': { id: 'pin-missile', name: 'Dard-Nuée', type: 'bug', category: 'physical', power: 25, accuracy: 95, pp: 20, priority: 0, description: 'Lance des dards 2 à 5 fois.', multiHit: true },
  'twineedle': { id: 'twineedle', name: 'Double-Dard', type: 'bug', category: 'physical', power: 25, accuracy: 100, pp: 20, priority: 0, description: 'Frappe deux fois. Peut empoisonner.', effect: { type: 'poison', chance: 20 } },

  // Rock type
  'rock-throw': { id: 'rock-throw', name: 'Jet-Pierres', type: 'rock', category: 'physical', power: 50, accuracy: 90, pp: 15, priority: 0, description: 'Lance des pierres sur l\'adversaire.' },
  'rock-slide': { id: 'rock-slide', name: 'Éboulement', type: 'rock', category: 'physical', power: 75, accuracy: 90, pp: 10, priority: 0, description: 'Lance de gros rochers.' },
  'rock-blast': { id: 'rock-blast', name: 'Éclats-Rocs', type: 'rock', category: 'physical', power: 25, accuracy: 90, pp: 10, priority: 0, description: 'Lance des éclats de roc 2 à 5 fois.', multiHit: true },

  // Ghost type
  'lick': { id: 'lick', name: 'Léchouille', type: 'ghost', category: 'physical', power: 30, accuracy: 100, pp: 30, priority: 0, description: 'Peut paralyser l\'adversaire.', effect: { type: 'paralysis', chance: 30 } },
  'night-shade': { id: 'night-shade', name: 'Ténèbres', type: 'ghost', category: 'special', power: 0, accuracy: 100, pp: 15, priority: 0, description: 'Inflige des dégâts égaux au niveau du lanceur.' },
  'shadow-ball': { id: 'shadow-ball', name: 'Ball\'Ombre', type: 'ghost', category: 'special', power: 80, accuracy: 100, pp: 15, priority: 0, description: 'Peut réduire la Déf. Spé. adverse.', statBoost: { stat: 'spDefense', target: 'foe', stages: -1, chance: 20 } },

  // Dragon type
  'dragon-rage': { id: 'dragon-rage', name: 'Colère', type: 'dragon', category: 'special', power: 0, accuracy: 100, pp: 10, priority: 0, description: 'Inflige toujours 40 dégâts.' },
  'dragon-breath': { id: 'dragon-breath', name: 'Dracosouffle', type: 'dragon', category: 'special', power: 60, accuracy: 100, pp: 20, priority: 0, description: 'Peut paralyser l\'adversaire.', effect: { type: 'paralysis', chance: 30 } },
  'dragon-claw': { id: 'dragon-claw', name: 'Draco-Griffe', type: 'dragon', category: 'physical', power: 80, accuracy: 100, pp: 15, priority: 0, description: 'Griffe l\'adversaire avec une serre dracosique.' },

  // Dark type
  'bite': { id: 'bite', name: 'Morsure', type: 'dark', category: 'physical', power: 60, accuracy: 100, pp: 25, priority: 0, description: 'Mord l\'adversaire.' },
  'crunch': { id: 'crunch', name: 'Croque', type: 'dark', category: 'physical', power: 80, accuracy: 100, pp: 15, priority: 0, description: 'Peut réduire la Défense adverse.', statBoost: { stat: 'defense', target: 'foe', stages: -1, chance: 20 } },
  'pursuit': { id: 'pursuit', name: 'Poursuite', type: 'dark', category: 'physical', power: 40, accuracy: 100, pp: 20, priority: -7, description: 'Frappe en dernier.' },
  'thief': { id: 'thief', name: 'Vol', type: 'dark', category: 'physical', power: 60, accuracy: 100, pp: 25, priority: 0, description: 'Vole l\'objet adverse.' },

  // Steel type
  'iron-tail': { id: 'iron-tail', name: 'Queue de Fer', type: 'steel', category: 'physical', power: 100, accuracy: 75, pp: 15, priority: 0, description: 'Peut réduire la Défense adverse.', statBoost: { stat: 'defense', target: 'foe', stages: -1, chance: 30 } },
  'metal-claw': { id: 'metal-claw', name: 'Griffe Acier', type: 'steel', category: 'physical', power: 50, accuracy: 95, pp: 35, priority: 0, description: 'Peut augmenter l\'Attaque du lanceur.', statBoost: { stat: 'attack', target: 'self', stages: 1, chance: 10 } },
};

export const MOVE_IDS = Object.keys(MOVES);
