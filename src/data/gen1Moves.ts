export interface Move {
  id: string;
  name: string;
  type: 'normal'|'fire'|'water'|'grass'|'electric'|'ice'|'fighting'|'poison'|'ground'|'flying'|'psychic'|'bug'|'rock'|'ghost'|'dragon'|'dark'|'steel';
  category: 'physical' | 'special' | 'status';
  power: number;
  accuracy: number; // 0 = never miss / always hit
  pp: number;
  priority: number;
  description: string;
  multiHit?: boolean;
  highCrit?: boolean;
  statBoost?: {
    stat: 'attack'|'defense'|'spAttack'|'spDefense'|'speed';
    target: 'self'|'foe';
    stages: number;
    chance?: number; // 0-100
  };
  effect?: {
    type: 'burn'|'poison'|'toxic'|'paralysis'|'sleep'|'freeze';
    chance: number;
  };
  recoil?: number;
  alwaysHit?: boolean;
  draining?: number;
}

export const MOVES: Record<string, Move> = {
  // Normal
  'tackle': {id:'tackle', name:'Charge', type:'normal', category:'physical', power:35, accuracy:95, pp:35, priority:0, description:'Une attaque de base.'},
  'scratch': {id:'scratch', name:'Griffe', type:'normal', category:'physical', power:40, accuracy:100, pp:35, priority:0, description:'Griffe l\'adversaire.'},
  'pound': {id:'pound', name:'Gnognotte', type:'normal', category:'physical', power:40, accuracy:100, pp:35, priority:0, description:'Frappe avec la queue ou les poings.'},
  'growl': {id:'growl', name:'Rugissement', type:'normal', category:'status', power:0, accuracy:100, pp:40, priority:0, description:'Réduit l\'Attaque adverse.', statBoost:{stat:'attack', target:'foe', stages:-1}},
  'tail-whip': {id:'tail-whip', name:'Mimi-Queue', type:'normal', category:'status', power:0, accuracy:100, pp:30, priority:0, description:'Réduit la Défense adverse.', statBoost:{stat:'defense', target:'foe', stages:-1}},
  'leer': {id:'leer', name:'Regard Noir', type:'normal', category:'status', power:0, accuracy:100, pp:30, priority:0, description:'Réduit la Défense adverse.', statBoost:{stat:'defense', target:'foe', stages:-1}},
  'screech': {id:'screech', name:'Cri Acide', type:'normal', category:'status', power:0, accuracy:85, pp:40, priority:0, description:'Réduit fortement la Défense adverse.', statBoost:{stat:'defense', target:'foe', stages:-2}},
  'quick-attack': {id:'quick-attack', name:'Vive-Attaque', type:'normal', category:'physical', power:40, accuracy:100, pp:30, priority:1, description:'Attaque en priorité.'},
  'slash': {id:'slash', name:'Tranche', type:'normal', category:'physical', power:70, accuracy:100, pp:20, priority:0, description:'Frappe avec un taux de critiques élevé.', highCrit:true},
  'cut': {id:'cut', name:'Coupe', type:'normal', category:'physical', power:50, accuracy:95, pp:30, priority:0, description:'Coupe l\'adversaire.'},
  'strength': {id:'strength', name:'Force', type:'normal', category:'physical', power:80, accuracy:100, pp:15, priority:0, description:'Frappe avec une grande force.'},
  'body-slam': {id:'body-slam', name:'Corps Charge', type:'normal', category:'physical', power:85, accuracy:100, pp:15, priority:0, description:'Peut paralyser.', effect:{type:'paralysis', chance:30}},
  'double-slap': {id:'double-slap', name:'Double-Gifle', type:'normal', category:'physical', power:15, accuracy:85, pp:10, priority:0, description:'Frappe 2 à 5 fois.', multiHit:true},
  'comet-punch': {id:'comet-punch', name:'Coup-Météore', type:'normal', category:'physical', power:18, accuracy:85, pp:15, priority:0, description:'Frappe 2 à 5 fois.', multiHit:true},
  'fury-attack': {id:'fury-attack', name:'Furie', type:'normal', category:'physical', power:15, accuracy:85, pp:20, priority:0, description:'Frappe 2 à 5 fois.', multiHit:true},
  'fury-swipes': {id:'fury-swipes', name:'Griffe-Tornade', type:'normal', category:'physical', power:18, accuracy:80, pp:15, priority:0, description:'Frappe 2 à 5 fois.', multiHit:true},
  'spike-cannon': {id:'spike-cannon', name:'Canon Pics', type:'normal', category:'physical', power:20, accuracy:100, pp:15, priority:0, description:'Frappe 2 à 5 fois.', multiHit:true},
  'slam': {id:'slam', name:'Claquoir', type:'normal', category:'physical', power:80, accuracy:75, pp:20, priority:0, description:'Frappe avec la queue ou des tentacules.'},
  'skull-bash': {id:'skull-bash', name:'Coud\'Crâne', type:'normal', category:'physical', power:100, accuracy:100, pp:15, priority:0, description:'Attaque puissante chargée.'},
  'take-down': {id:'take-down', name:'Bélier', type:'normal', category:'physical', power:90, accuracy:85, pp:20, priority:0, description:'Subit des dégâts de recul.', recoil:0.25},
  'double-edge': {id:'double-edge', name:'Damoclès', type:'normal', category:'physical', power:120, accuracy:100, pp:15, priority:0, description:'Subit des dégâts de recul importants.', recoil:0.33},
  'wrap': {id:'wrap', name:'Ligotage', type:'normal', category:'physical', power:15, accuracy:90, pp:20, priority:0, description:'Ligote l\'adversaire pendant plusieurs tours.'},
  'swift': {id:'swift', name:'Météores', type:'normal', category:'special', power:60, accuracy:0, pp:20, priority:0, description:'Ne rate jamais.', alwaysHit:true},
  'razor-wind': {id:'razor-wind', name:'Rasoir-Vent', type:'normal', category:'special', power:80, accuracy:100, pp:10, priority:0, description:'Taux de critiques élevé.', highCrit:true},
  'hyper-beam': {id:'hyper-beam', name:'Rayon Hyper', type:'normal', category:'special', power:150, accuracy:90, pp:5, priority:0, description:'Nécessite de se reposer au tour suivant.'},
  'explosion': {id:'explosion', name:'Explosion', type:'normal', category:'physical', power:250, accuracy:100, pp:5, priority:0, description:'Le lanceur est mis K.O.'},
  'recover': {id:'recover', name:'Soin', type:'normal', category:'status', power:0, accuracy:100, pp:10, priority:0, description:'Restaure 50% des PV max.'},
  'sharpen': {id:'sharpen', name:'Acuité', type:'normal', category:'status', power:0, accuracy:100, pp:30, priority:0, description:'Augmente l\'Attaque.', statBoost:{stat:'attack', target:'self', stages:1}},
  'swords-dance': {id:'swords-dance', name:'Danse-Lames', type:'normal', category:'status', power:0, accuracy:100, pp:20, priority:0, description:'Augmente fortement l\'Attaque.', statBoost:{stat:'attack', target:'self', stages:2}},
  'minimize': {id:'minimize', name:'Esquive', type:'normal', category:'status', power:0, accuracy:100, pp:20, priority:0, description:'Augmente l\'esquive.', statBoost:{stat:'defense', target:'self', stages:2}},
  'smokescreen': {id:'smokescreen', name:'Rideau Fumée', type:'normal', category:'status', power:0, accuracy:100, pp:20, priority:0, description:'Réduit la précision adverse.', statBoost:{stat:'defense', target:'foe', stages:-1}},
  'glare': {id:'glare', name:'Regard Mortel', type:'normal', category:'status', power:0, accuracy:90, pp:30, priority:0, description:'Paralyse l\'adversaire.', effect:{type:'paralysis', chance:100}},
  'sing': {id:'sing', name:'Chant', type:'normal', category:'status', power:0, accuracy:55, pp:15, priority:0, description:'Endort l\'adversaire.', effect:{type:'sleep', chance:100}},
  'defense-curl': {id:'defense-curl', name:'Affûtage', type:'normal', category:'status', power:0, accuracy:100, pp:40, priority:0, description:'Augmente la Défense.', statBoost:{stat:'defense', target:'self', stages:1}},
  'harden': {id:'harden', name:'Armure', type:'normal', category:'status', power:0, accuracy:100, pp:30, priority:0, description:'Augmente la Défense.', statBoost:{stat:'defense', target:'self', stages:1}},
  'double-team': {id:'double-team', name:'Division', type:'normal', category:'status', power:0, accuracy:100, pp:15, priority:0, description:'Augmente l\'esquive.', statBoost:{stat:'defense', target:'self', stages:1}},
  'transform': {id:'transform', name:'Transformation', type:'normal', category:'status', power:0, accuracy:100, pp:10, priority:0, description:'Le Pokémon copie l\'adversaire.'},

  // Fire
  'ember': {id:'ember', name:'Flammèche', type:'fire', category:'special', power:40, accuracy:100, pp:25, priority:0, description:'Peut brûler.', effect:{type:'burn', chance:10}},
  'flamethrower': {id:'flamethrower', name:'Lance-Flammes', type:'fire', category:'special', power:95, accuracy:100, pp:15, priority:0, description:'Peut brûler.', effect:{type:'burn', chance:10}},
  'fire-blast': {id:'fire-blast', name:'Déflagration', type:'fire', category:'special', power:110, accuracy:85, pp:5, priority:0, description:'Peut brûler.', effect:{type:'burn', chance:10}},
  'fire-punch': {id:'fire-punch', name:'Poing-Feu', type:'fire', category:'physical', power:75, accuracy:100, pp:15, priority:0, description:'Peut brûler.', effect:{type:'burn', chance:10}},
  'fire-fang': {id:'fire-fang', name:'Croc Feu', type:'fire', category:'physical', power:65, accuracy:95, pp:15, priority:0, description:'Peut brûler.', effect:{type:'burn', chance:10}},
  'will-o-wisp': {id:'will-o-wisp', name:'Feu Follet', type:'fire', category:'status', power:0, accuracy:75, pp:15, priority:0, description:'Brûle l\'adversaire.', effect:{type:'burn', chance:100}},
  'flame-wheel': {id:'flame-wheel', name:'Roue de Feu', type:'fire', category:'physical', power:60, accuracy:100, pp:25, priority:0, description:'Peut brûler.', effect:{type:'burn', chance:10}},

  // Water
  'water-gun': {id:'water-gun', name:'Pistolet à O', type:'water', category:'special', power:40, accuracy:100, pp:25, priority:0, description:'Projette de l\'eau.'},
  'surf': {id:'surf', name:'Surf', type:'water', category:'special', power:95, accuracy:100, pp:15, priority:0, description:'Frappe tous les Pokémon adjacents.'},
  'hydro-pump': {id:'hydro-pump', name:'Hydrocanon', type:'water', category:'special', power:110, accuracy:80, pp:5, priority:0, description:'Très puissant mais peu précis.'},
  'waterfall': {id:'waterfall', name:'Cascade', type:'water', category:'physical', power:80, accuracy:100, pp:15, priority:0, description:'Peut paralyser.', effect:{type:'paralysis', chance:20}},
  'aqua-jet': {id:'aqua-jet', name:'Aqua-Jet', type:'water', category:'physical', power:40, accuracy:100, pp:20, priority:1, description:'Attaque en priorité.'},
  'bubble': {id:'bubble', name:'Bulles d\'Ô', type:'water', category:'special', power:40, accuracy:100, pp:30, priority:0, description:'Peut réduire la Vitesse.', statBoost:{stat:'speed', target:'foe', stages:-1, chance:10}},
  'clamp': {id:'clamp', name:'Étreinte', type:'water', category:'physical', power:35, accuracy:85, pp:15, priority:0, description:'Enserre l\'adversaire.', multiHit:true},
  'crabhammer': {id:'crabhammer', name:'Marteau-Bras', type:'water', category:'physical', power:90, accuracy:85, pp:10, priority:0, description:'Taux de critiques élevé.', highCrit:true},
  'withdraw': {id:'withdraw', name:'Repli', type:'water', category:'status', power:0, accuracy:100, pp:40, priority:0, description:'Augmente la Défense.', statBoost:{stat:'defense', target:'self', stages:1}},

  // Grass
  'vine-whip': {id:'vine-whip', name:'Fouet Lianes', type:'grass', category:'physical', power:35, accuracy:100, pp:25, priority:0, description:'Fouette avec des lianes.'},
  'razor-leaf': {id:'razor-leaf', name:'Tranch\'Herbe', type:'grass', category:'physical', power:55, accuracy:95, pp:25, priority:0, description:'Taux de critiques élevé.', highCrit:true},
  'solar-beam': {id:'solar-beam', name:'Lance-Soleil', type:'grass', category:'special', power:120, accuracy:100, pp:10, priority:0, description:'Se charge au tour 1, attaque au tour 2.'},
  'leaf-storm': {id:'leaf-storm', name:'Tempête Foliaire', type:'grass', category:'special', power:140, accuracy:90, pp:5, priority:0, description:'Réduit l\'Atk Spé après l\'usage.', statBoost:{stat:'spAttack', target:'self', stages:-2}},
  'sleep-powder': {id:'sleep-powder', name:'Poudre Dodo', type:'grass', category:'status', power:0, accuracy:75, pp:15, priority:0, description:'Endort l\'adversaire.', effect:{type:'sleep', chance:100}},
  'stun-spore': {id:'stun-spore', name:'Para-Spore', type:'grass', category:'status', power:0, accuracy:75, pp:30, priority:0, description:'Paralyse l\'adversaire.', effect:{type:'paralysis', chance:100}},
  'poison-powder': {id:'poison-powder', name:'Poudre Toxik', type:'poison', category:'status', power:0, accuracy:75, pp:35, priority:0, description:'Empoisonne l\'adversaire.', effect:{type:'poison', chance:100}},
  'leech-seed': {id:'leech-seed', name:'Vampigraine', type:'grass', category:'status', power:0, accuracy:90, pp:10, priority:0, description:'Draine les PV de l\'adversaire à chaque tour.'},
  'growth': {id:'growth', name:'Croissance', type:'grass', category:'status', power:0, accuracy:100, pp:40, priority:0, description:'Augmente l\'Attaque Spéciale.', statBoost:{stat:'spAttack', target:'self', stages:1}},
  'spore': {id:'spore', name:'Spore', type:'grass', category:'status', power:0, accuracy:100, pp:15, priority:0, description:'Endort infailliblement l\'adversaire.', effect:{type:'sleep', chance:100}},

  // Electric
  'thunder-shock': {id:'thunder-shock', name:'Éclair', type:'electric', category:'special', power:40, accuracy:100, pp:30, priority:0, description:'Peut paralyser.', effect:{type:'paralysis', chance:10}},
  'thunderbolt': {id:'thunderbolt', name:'Tonnerre', type:'electric', category:'special', power:95, accuracy:100, pp:15, priority:0, description:'Peut paralyser.', effect:{type:'paralysis', chance:10}},
  'thunder': {id:'thunder', name:'Fatal-Foudre', type:'electric', category:'special', power:120, accuracy:50, pp:10, priority:0, description:'Peut paralyser.', effect:{type:'paralysis', chance:30}},
  'thunder-wave': {id:'thunder-wave', name:'Cage-Éclair', type:'electric', category:'status', power:0, accuracy:100, pp:20, priority:0, description:'Paralyse l\'adversaire.', effect:{type:'paralysis', chance:100}},
  'thunder-punch': {id:'thunder-punch', name:'Poing-Éclair', type:'electric', category:'physical', power:75, accuracy:100, pp:15, priority:0, description:'Peut paralyser.', effect:{type:'paralysis', chance:10}},
  'thunder-fang': {id:'thunder-fang', name:'Croc Éclair', type:'electric', category:'physical', power:65, accuracy:95, pp:15, priority:0, description:'Peut paralyser.', effect:{type:'paralysis', chance:10}},

  // Bug
  'pin-missile': {id:'pin-missile', name:'Multidard', type:'bug', category:'physical', power:14, accuracy:85, pp:20, priority:0, description:'Frappe 2 à 5 fois.', multiHit:true},
  'x-scissor': {id:'x-scissor', name:'Lame-X', type:'bug', category:'physical', power:80, accuracy:100, pp:15, priority:0, description:'Coupe en croix.'},

  // Ice
  'ice-beam': {id:'ice-beam', name:'Laser Glace', type:'ice', category:'special', power:95, accuracy:100, pp:10, priority:0, description:'Peut congeler.', effect:{type:'freeze', chance:10}},
  'blizzard': {id:'blizzard', name:'Blizzard', type:'ice', category:'special', power:110, accuracy:70, pp:5, priority:0, description:'Peut congeler.', effect:{type:'freeze', chance:10}},
  'ice-punch': {id:'ice-punch', name:'Poing-Glace', type:'ice', category:'physical', power:75, accuracy:100, pp:15, priority:0, description:'Peut congeler.', effect:{type:'freeze', chance:10}},
  'ice-fang': {id:'ice-fang', name:'Croc Glace', type:'ice', category:'physical', power:65, accuracy:95, pp:15, priority:0, description:'Peut congeler.', effect:{type:'freeze', chance:10}},

  // Fighting
  'karate-chop': {id:'karate-chop', name:'Poing Karaté', type:'fighting', category:'physical', power:50, accuracy:100, pp:25, priority:0, description:'Taux de critiques élevé.', highCrit:true},
  'double-kick': {id:'double-kick', name:'Double-Pied', type:'fighting', category:'physical', power:30, accuracy:100, pp:30, priority:0, description:'Frappe deux fois.', multiHit:true},
  'low-kick': {id:'low-kick', name:'Balayage', type:'fighting', category:'physical', power:65, accuracy:100, pp:20, priority:0, description:'Frappe les jambes.'},
  'close-combat': {id:'close-combat', name:'Close Combat', type:'fighting', category:'physical', power:120, accuracy:100, pp:5, priority:0, description:'Réduit la Défense du lanceur.', statBoost:{stat:'defense', target:'self', stages:-1}},
  'submission': {id:'submission', name:'Sacrifice', type:'fighting', category:'physical', power:80, accuracy:80, pp:25, priority:0, description:'Subit des dégâts de recul.', recoil:0.25},
  'brick-break': {id:'brick-break', name:'Frappe Atlas', type:'fighting', category:'physical', power:75, accuracy:100, pp:15, priority:0, description:'Brise les barrières.'},

  // Poison
  'poison-sting': {id:'poison-sting', name:'Dard-Venin', type:'poison', category:'physical', power:15, accuracy:100, pp:35, priority:0, description:'Peut empoisonner.', effect:{type:'poison', chance:30}},
  'acid': {id:'acid', name:'Acide', type:'poison', category:'special', power:40, accuracy:100, pp:30, priority:0, description:'Peut réduire la Défense Spéciale.', statBoost:{stat:'spDefense', target:'foe', stages:-1, chance:10}},
  'smog': {id:'smog', name:'Smog', type:'poison', category:'special', power:20, accuracy:70, pp:20, priority:0, description:'Peut empoisonner.', effect:{type:'poison', chance:40}},
  'sludge': {id:'sludge', name:'Beurk', type:'poison', category:'special', power:65, accuracy:100, pp:20, priority:0, description:'Peut empoisonner.', effect:{type:'poison', chance:30}},
  'sludge-bomb': {id:'sludge-bomb', name:'Bomb\' Beurk', type:'poison', category:'special', power:90, accuracy:100, pp:10, priority:0, description:'Peut empoisonner.', effect:{type:'poison', chance:30}},
  'toxic': {id:'toxic', name:'Toxik', type:'poison', category:'status', power:0, accuracy:90, pp:10, priority:0, description:'Empoisonne gravement.', effect:{type:'toxic', chance:100}},
  'poison-gas': {id:'poison-gas', name:'Gaz Toxik', type:'poison', category:'status', power:0, accuracy:55, pp:40, priority:0, description:'Empoisonne l\'adversaire.', effect:{type:'poison', chance:100}},

  // Ground
  'earthquake': {id:'earthquake', name:'Séisme', type:'ground', category:'physical', power:100, accuracy:100, pp:10, priority:0, description:'Tremblement de terre puissant.'},
  'dig': {id:'dig', name:'Fouille', type:'ground', category:'physical', power:80, accuracy:100, pp:10, priority:0, description:'Se cache sous terre au tour 1.'},
  'mud-slap': {id:'mud-slap', name:'Boue-Bombe', type:'ground', category:'special', power:20, accuracy:100, pp:10, priority:0, description:'Réduit la précision adverse.', statBoost:{stat:'speed', target:'foe', stages:-1, chance:100}},
  'sand-attack': {id:'sand-attack', name:'Jet de Sable', type:'ground', category:'status', power:0, accuracy:100, pp:15, priority:0, description:'Réduit la précision adverse.', statBoost:{stat:'defense', target:'foe', stages:-1}},

  // Flying
  'peck': {id:'peck', name:'Bec Vrille', type:'flying', category:'physical', power:35, accuracy:100, pp:35, priority:0, description:'Frappe avec le bec.'},
  'wing-attack': {id:'wing-attack', name:'Aile d\'Acier', type:'flying', category:'physical', power:60, accuracy:100, pp:35, priority:0, description:'Frappe avec les ailes.'},
  'aerial-ace': {id:'aerial-ace', name:'Tranche-Air', type:'flying', category:'physical', power:60, accuracy:100, pp:20, priority:0, description:'Ne rate jamais.', alwaysHit:true},
  'fly': {id:'fly', name:'Vol', type:'flying', category:'physical', power:90, accuracy:95, pp:15, priority:0, description:'S\'envole au tour 1, attaque au tour 2.'},

  // Psychic
  'confusion': {id:'confusion', name:'Choc Mental', type:'psychic', category:'special', power:50, accuracy:100, pp:25, priority:0, description:'Peut confondre.', effect:{type:'paralysis', chance:10}},
  'psychic-move': {id:'psychic-move', name:'Psyko', type:'psychic', category:'special', power:90, accuracy:100, pp:10, priority:0, description:'Peut réduire la Défense Spéciale.', statBoost:{stat:'spDefense', target:'foe', stages:-1, chance:10}},
  'psybeam': {id:'psybeam', name:'Rayon Psy', type:'psychic', category:'special', power:65, accuracy:100, pp:20, priority:0, description:'Peut confondre.', effect:{type:'paralysis', chance:10}},
  'hypnosis': {id:'hypnosis', name:'Hypnose', type:'psychic', category:'status', power:0, accuracy:60, pp:20, priority:0, description:'Endort l\'adversaire.', effect:{type:'sleep', chance:100}},
  'dream-eater': {id:'dream-eater', name:'Bouffe-Rêve', type:'psychic', category:'special', power:100, accuracy:100, pp:15, priority:0, description:'Fonctionne sur un Pokémon endormi.'},
  'amnesia': {id:'amnesia', name:'Amnésie', type:'psychic', category:'status', power:0, accuracy:100, pp:20, priority:0, description:'Augmente fortement l\'Attaque Spéciale.', statBoost:{stat:'spAttack', target:'self', stages:2}},
  'barrier': {id:'barrier', name:'Barrière', type:'psychic', category:'status', power:0, accuracy:100, pp:30, priority:0, description:'Augmente fortement la Défense.', statBoost:{stat:'defense', target:'self', stages:2}},
  'calm-mind': {id:'calm-mind', name:'Méditation', type:'psychic', category:'status', power:0, accuracy:100, pp:20, priority:0, description:'Augmente l\'Attaque Spéciale.', statBoost:{stat:'spAttack', target:'self', stages:1}},
  'agility': {id:'agility', name:'Hâte', type:'psychic', category:'status', power:0, accuracy:100, pp:30, priority:0, description:'Augmente fortement la Vitesse.', statBoost:{stat:'speed', target:'self', stages:2}},

  // Dark
  'bite': {id:'bite', name:'Morsure', type:'dark', category:'physical', power:60, accuracy:100, pp:25, priority:0, description:'Peut faire sursauter.', effect:{type:'paralysis', chance:30}},
  'crunch': {id:'crunch', name:'Coud\'Croc', type:'dark', category:'physical', power:80, accuracy:100, pp:15, priority:0, description:'Peut réduire la Défense.', statBoost:{stat:'defense', target:'foe', stages:-1, chance:20}},
  'faint-attack': {id:'faint-attack', name:'Feinte', type:'dark', category:'physical', power:60, accuracy:100, pp:20, priority:0, description:'Ne rate jamais.', alwaysHit:true},
  'nasty-plot': {id:'nasty-plot', name:'Complot', type:'dark', category:'status', power:0, accuracy:100, pp:20, priority:0, description:'Augmente fortement l\'Attaque Spéciale.', statBoost:{stat:'spAttack', target:'self', stages:2}},

  // Ghost
  'night-shade': {id:'night-shade', name:'Ombre Nuit', type:'ghost', category:'special', power:60, accuracy:100, pp:15, priority:0, description:'Inflige des dégâts égaux au niveau.'},
  'confuse-ray': {id:'confuse-ray', name:'Rayon Confus', type:'ghost', category:'status', power:0, accuracy:100, pp:10, priority:0, description:'Confond l\'adversaire.', effect:{type:'paralysis', chance:100}},
  'lick': {id:'lick', name:'Léchage', type:'ghost', category:'physical', power:20, accuracy:100, pp:30, priority:0, description:'Peut paralyser.', effect:{type:'paralysis', chance:30}},

  // Rock
  'rock-throw': {id:'rock-throw', name:'Éclate-Roc', type:'rock', category:'physical', power:50, accuracy:90, pp:15, priority:0, description:'Lance des rochers.'},
  'rock-slide': {id:'rock-slide', name:'Lancer de Roc', type:'rock', category:'physical', power:75, accuracy:90, pp:10, priority:0, description:'Peut faire sursauter.', effect:{type:'paralysis', chance:30}},

  // Dragon
  'dragon-rage': {id:'dragon-rage', name:'Colère', type:'dragon', category:'special', power:80, accuracy:100, pp:10, priority:0, description:'Inflige des dégâts fixes.'},
  'dragon-breath': {id:'dragon-breath', name:'Draco-Souffle', type:'dragon', category:'special', power:60, accuracy:100, pp:20, priority:0, description:'Peut paralyser.', effect:{type:'paralysis', chance:30}},
};

export const MOVE_IDS = Object.keys(MOVES);
