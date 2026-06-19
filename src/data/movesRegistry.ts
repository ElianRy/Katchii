/**
 * movesRegistry.ts — Single Source of Truth for all game moves.
 *
 * Every move is indexed by a unique immutable English slug (e.g. "fly", "solar-beam").
 * Use `nameFR` for player-facing display; use `id` for combat logic.
 * `name` mirrors `nameFR` for backward compatibility with older code.
 */

export interface MoveRegistryEntry {
  /** Unique immutable key — English slug, lowercase (e.g. "solar-beam") */
  id: string;
  /** Official French name for UI display (e.g. "Lance-Soleil") */
  nameFR: string;
  /** English name (e.g. "Solar Beam") */
  nameEN: string;
  /** Alias of nameFR — kept for backward compatibility */
  name: string;
  type: 'normal'|'fire'|'water'|'grass'|'electric'|'ice'|'fighting'|'poison'|'ground'|'flying'|'psychic'|'bug'|'rock'|'ghost'|'dragon'|'dark'|'steel';
  category: 'physical' | 'special' | 'status';
  power: number;
  accuracy: number; // 0 = always hits
  pp: number;
  priority: number;
  description: string;
  multiHit?: boolean;
  highCrit?: boolean;
  statBoost?: {
    stat: 'attack'|'defense'|'spAttack'|'spDefense'|'speed';
    target: 'self'|'foe';
    stages: number;
    chance?: number; // 0–100
  };
  effect?: {
    type: 'burn'|'poison'|'toxic'|'paralysis'|'sleep'|'freeze'|'confusion';
    chance: number;
  };
  recoil?: number;
  alwaysHit?: boolean;
  draining?: number;
  allStatBoost?: { stages: number; chance: number };
  isSeed?: boolean;
  /** True for 2-turn moves (fly, solar-beam) */
  isTwoTurnMove?: boolean;
  /** Message shown on the charging turn (e.g. "se gorge de lumière !") */
  chargingMessage?: string;
}

function m(
  id: string, nameFR: string, nameEN: string,
  type: MoveRegistryEntry['type'],
  category: MoveRegistryEntry['category'],
  power: number, accuracy: number, pp: number, priority: number,
  description: string,
  extras?: Partial<Omit<MoveRegistryEntry, 'id'|'nameFR'|'nameEN'|'name'|'type'|'category'|'power'|'accuracy'|'pp'|'priority'|'description'>>,
): MoveRegistryEntry {
  return { id, nameFR, nameEN, name: nameFR, type, category, power, accuracy, pp, priority, description, ...extras };
}

export const MOVES_REGISTRY: Record<string, MoveRegistryEntry> = {
  // ── Normal ────────────────────────────────────────────────────────────────
  'tackle':        m('tackle','Charge','Tackle','normal','physical',35,95,35,0,"Une attaque de base."),
  'scratch':       m('scratch','Griffe','Scratch','normal','physical',40,100,35,0,"Griffe l'adversaire."),
  'pound':         m('pound','Gnognotte','Pound','normal','physical',40,100,35,0,"Frappe avec la queue ou les poings."),
  'growl':         m('growl','Rugissement','Growl','normal','status',0,100,40,0,"Réduit l'Attaque adverse.",{statBoost:{stat:'attack',target:'foe',stages:-1}}),
  'tail-whip':     m('tail-whip','Mimi-Queue','Tail Whip','normal','status',0,100,30,0,"Réduit la Défense adverse.",{statBoost:{stat:'defense',target:'foe',stages:-1}}),
  'leer':          m('leer','Regard Noir','Leer','normal','status',0,100,30,0,"Réduit la Défense adverse.",{statBoost:{stat:'defense',target:'foe',stages:-1}}),
  'screech':       m('screech','Cri Acide','Screech','normal','status',0,85,40,0,"Réduit fortement la Défense adverse.",{statBoost:{stat:'defense',target:'foe',stages:-2}}),
  'quick-attack':  m('quick-attack','Vive-Attaque','Quick Attack','normal','physical',40,100,30,1,"Attaque en priorité."),
  'slash':         m('slash','Tranche','Slash','normal','physical',70,100,20,0,"Frappe avec un taux de critiques élevé.",{highCrit:true}),
  'cut':           m('cut','Coupe','Cut','normal','physical',50,95,30,0,"Coupe l'adversaire."),
  'strength':      m('strength','Force','Strength','normal','physical',80,100,15,0,"Frappe avec une grande force."),
  'body-slam':     m('body-slam','Corps Charge','Body Slam','normal','physical',85,100,15,0,"Peut paralyser.",{effect:{type:'paralysis',chance:30}}),
  'double-slap':   m('double-slap','Double-Gifle','Double Slap','normal','physical',15,85,10,0,"Frappe 2 à 5 fois.",{multiHit:true}),
  'comet-punch':   m('comet-punch','Coup-Météore','Comet Punch','normal','physical',18,85,15,0,"Frappe 2 à 5 fois.",{multiHit:true}),
  'fury-attack':   m('fury-attack','Furie','Fury Attack','normal','physical',15,85,20,0,"Frappe 2 à 5 fois.",{multiHit:true}),
  'fury-swipes':   m('fury-swipes','Griffe-Tornade','Fury Swipes','normal','physical',18,80,15,0,"Frappe 2 à 5 fois.",{multiHit:true}),
  'spike-cannon':  m('spike-cannon','Canon Pics','Spike Cannon','normal','physical',20,100,15,0,"Frappe 2 à 5 fois.",{multiHit:true}),
  'slam':          m('slam','Claquoir','Slam','normal','physical',80,75,20,0,"Frappe avec la queue ou des tentacules."),
  'skull-bash':    m('skull-bash',"Coud'Crâne",'Skull Bash','normal','physical',100,100,15,0,"Attaque puissante chargée."),
  'take-down':     m('take-down','Bélier','Take Down','normal','physical',90,85,20,0,"Subit des dégâts de recul.",{recoil:0.25}),
  'double-edge':   m('double-edge','Damoclès','Double-Edge','normal','physical',120,100,15,0,"Subit des dégâts de recul importants.",{recoil:0.33}),
  'wrap':          m('wrap','Ligotage','Wrap','normal','physical',15,90,20,0,"Ligote l'adversaire pendant plusieurs tours."),
  'swift':         m('swift','Météores','Swift','normal','special',60,0,20,0,"Ne rate jamais.",{alwaysHit:true}),
  'razor-wind':    m('razor-wind','Rasoir-Vent','Razor Wind','normal','special',80,100,10,0,"Taux de critiques élevé.",{highCrit:true}),
  'hyper-beam':    m('hyper-beam','Rayon Hyper','Hyper Beam','normal','special',150,90,5,0,"Nécessite de se reposer au tour suivant."),
  'explosion':     m('explosion','Explosion','Explosion','normal','physical',250,100,5,0,"Le lanceur est mis K.O."),
  'sharpen':       m('sharpen','Acuité','Sharpen','normal','status',0,100,30,0,"Augmente l'Attaque.",{statBoost:{stat:'attack',target:'self',stages:1}}),
  'swords-dance':  m('swords-dance','Danse-Lames','Swords Dance','normal','status',0,100,20,0,"Augmente fortement l'Attaque.",{statBoost:{stat:'attack',target:'self',stages:2}}),
  'minimize':      m('minimize','Esquive','Minimize','normal','status',0,100,20,0,"Augmente l'esquive.",{statBoost:{stat:'defense',target:'self',stages:2}}),
  'smokescreen':   m('smokescreen','Rideau Fumée','Smokescreen','normal','status',0,100,20,0,"Réduit la précision adverse.",{statBoost:{stat:'defense',target:'foe',stages:-1}}),
  'glare':         m('glare','Regard Mortel','Glare','normal','status',0,90,30,0,"Paralyse l'adversaire.",{effect:{type:'paralysis',chance:100}}),
  'sing':          m('sing','Chant','Sing','normal','status',0,55,15,0,"Endort l'adversaire.",{effect:{type:'sleep',chance:100}}),
  'defense-curl':  m('defense-curl','Affûtage','Defense Curl','normal','status',0,100,40,0,"Augmente la Défense.",{statBoost:{stat:'defense',target:'self',stages:1}}),
  'harden':        m('harden','Armure','Harden','normal','status',0,100,30,0,"Augmente la Défense.",{statBoost:{stat:'defense',target:'self',stages:1}}),
  'double-team':   m('double-team','Division','Double Team','normal','status',0,100,15,0,"Augmente l'esquive.",{statBoost:{stat:'defense',target:'self',stages:1}}),
  'transform':     m('transform','Transformation','Transform','normal','status',0,100,10,0,"Le Pokémon copie l'adversaire."),
  'splash':        m('splash','Éclaboussure','Splash','normal','status',0,100,40,0,"N'a aucun effet."),
  'supersonic':    m('supersonic','Ultrasons','Supersonic','normal','status',0,55,20,0,"Confond l'adversaire.",{effect:{type:'confusion',chance:100}}),
  'sweet-kiss':    m('sweet-kiss','Grobisou','Sweet Kiss','normal','status',0,75,10,0,"Confond l'adversaire.",{effect:{type:'confusion',chance:100}}),
  'teeter-dance':  m('teeter-dance','Danse Fofolle','Teeter Dance','normal','status',0,100,20,0,"Confond tous les adversaires.",{effect:{type:'confusion',chance:100}}),
  'thrash':        m('thrash','Frénésie','Thrash','normal','physical',120,100,10,0,"Attaque 2-3 tours puis confond."),

  // ── Fire ──────────────────────────────────────────────────────────────────
  'ember':         m('ember','Flammèche','Ember','fire','special',40,100,25,0,"Peut brûler.",{effect:{type:'burn',chance:10}}),
  'flamethrower':  m('flamethrower','Lance-Flammes','Flamethrower','fire','special',95,100,15,0,"Peut brûler.",{effect:{type:'burn',chance:10}}),
  'fire-blast':    m('fire-blast','Déflagration','Fire Blast','fire','special',110,85,5,0,"Peut brûler.",{effect:{type:'burn',chance:10}}),
  'fire-punch':    m('fire-punch','Poing-Feu','Fire Punch','fire','physical',75,100,15,0,"Peut brûler.",{effect:{type:'burn',chance:10}}),
  'fire-fang':     m('fire-fang','Croc Feu','Fire Fang','fire','physical',65,95,15,0,"Peut brûler.",{effect:{type:'burn',chance:10}}),
  'will-o-wisp':   m('will-o-wisp','Feu Follet','Will-O-Wisp','fire','status',0,75,15,0,"Brûle l'adversaire.",{effect:{type:'burn',chance:100}}),
  'flame-wheel':   m('flame-wheel','Roue de Feu','Flame Wheel','fire','physical',60,100,25,0,"Peut brûler.",{effect:{type:'burn',chance:10}}),

  // ── Water ─────────────────────────────────────────────────────────────────
  'water-gun':     m('water-gun',"Pistolet à O",'Water Gun','water','special',40,100,25,0,"Projette de l'eau."),
  'surf':          m('surf','Surf','Surf','water','special',95,100,15,0,"Frappe tous les Pokémon adjacents."),
  'hydro-pump':    m('hydro-pump','Hydrocanon','Hydro Pump','water','special',110,80,5,0,"Très puissant mais peu précis."),
  'waterfall':     m('waterfall','Cascade','Waterfall','water','physical',80,100,15,0,"Peut paralyser.",{effect:{type:'paralysis',chance:20}}),
  'aqua-jet':      m('aqua-jet','Aqua-Jet','Aqua Jet','water','physical',40,100,20,1,"Attaque en priorité."),
  'bubble':        m('bubble',"Bulles d'Ô",'Bubble','water','special',40,100,30,0,"Peut réduire la Vitesse.",{statBoost:{stat:'speed',target:'foe',stages:-1,chance:10}}),
  'clamp':         m('clamp','Étreinte','Clamp','water','physical',35,85,15,0,"Enserre l'adversaire.",{multiHit:true}),
  'crabhammer':    m('crabhammer','Marteau-Bras','Crabhammer','water','physical',90,85,10,0,"Taux de critiques élevé.",{highCrit:true}),
  'withdraw':      m('withdraw','Repli','Withdraw','water','status',0,100,40,0,"Augmente la Défense.",{statBoost:{stat:'defense',target:'self',stages:1}}),
  'water-pulse':   m('water-pulse','Aqua-Anneau','Water Pulse','water','special',60,100,20,0,"Peut confondre.",{effect:{type:'confusion',chance:20}}),

  // ── Grass ─────────────────────────────────────────────────────────────────
  'vine-whip':     m('vine-whip','Fouet Lianes','Vine Whip','grass','physical',35,100,25,0,"Fouette avec des lianes."),
  'razor-leaf':    m('razor-leaf',"Tranch'Herbe",'Razor Leaf','grass','physical',55,95,25,0,"Taux de critiques élevé.",{highCrit:true}),
  'solar-beam':    m('solar-beam','Lance-Soleil','Solar Beam','grass','special',120,100,10,0,"Se charge au tour 1, attaque au tour 2.",{isTwoTurnMove:true,chargingMessage:'se gorge de lumière !'}),
  'leaf-storm':    m('leaf-storm','Tempête Foliaire','Leaf Storm','grass','special',140,90,5,0,"Réduit l'Atk Spé après l'usage.",{statBoost:{stat:'spAttack',target:'self',stages:-2}}),
  'sleep-powder':  m('sleep-powder','Poudre Dodo','Sleep Powder','grass','status',0,75,15,0,"Endort l'adversaire.",{effect:{type:'sleep',chance:100}}),
  'stun-spore':    m('stun-spore','Para-Spore','Stun Spore','grass','status',0,75,30,0,"Paralyse l'adversaire.",{effect:{type:'paralysis',chance:100}}),
  'poison-powder': m('poison-powder','Poudre Toxik','Poison Powder','poison','status',0,75,35,0,"Empoisonne l'adversaire.",{effect:{type:'poison',chance:100}}),
  'leech-seed':    m('leech-seed','Vampigraine','Leech Seed','grass','status',0,90,10,0,"Draine les PV de l'adversaire à chaque tour.",{isSeed:true}),
  'growth':        m('growth','Croissance','Growth','grass','status',0,100,40,0,"Augmente l'Attaque Spéciale.",{statBoost:{stat:'spAttack',target:'self',stages:1}}),
  'spore':         m('spore','Spore','Spore','grass','status',0,100,15,0,"Endort infailliblement l'adversaire.",{effect:{type:'sleep',chance:100}}),
  'petal-dance':   m('petal-dance','Danse-Fleur','Petal Dance','grass','special',120,100,10,0,"Attaque 2-3 tours puis confond."),

  // ── Electric ──────────────────────────────────────────────────────────────
  'thunder-shock':  m('thunder-shock','Éclair','ThunderShock','electric','special',40,100,30,0,"Peut paralyser.",{effect:{type:'paralysis',chance:10}}),
  'thunderbolt':    m('thunderbolt','Tonnerre','Thunderbolt','electric','special',95,100,15,0,"Peut paralyser.",{effect:{type:'paralysis',chance:10}}),
  'thunder':        m('thunder','Fatal-Foudre','Thunder','electric','special',120,50,10,0,"Peut paralyser.",{effect:{type:'paralysis',chance:30}}),
  'thunder-wave':   m('thunder-wave','Cage-Éclair','Thunder Wave','electric','status',0,100,20,0,"Paralyse l'adversaire.",{effect:{type:'paralysis',chance:100}}),
  'thunder-punch':  m('thunder-punch','Poing-Éclair','ThunderPunch','electric','physical',75,100,15,0,"Peut paralyser.",{effect:{type:'paralysis',chance:10}}),
  'thunder-fang':   m('thunder-fang','Croc Éclair','Thunder Fang','electric','physical',65,95,15,0,"Peut paralyser.",{effect:{type:'paralysis',chance:10}}),
  'discharge':      m('discharge','Décharge','Discharge','electric','special',80,100,15,0,"Peut paralyser.",{effect:{type:'paralysis',chance:30}}),

  // ── Bug ───────────────────────────────────────────────────────────────────
  'pin-missile':   m('pin-missile','Multidard','Pin Missile','bug','physical',14,85,20,0,"Frappe 2 à 5 fois.",{multiHit:true}),
  'x-scissor':     m('x-scissor','Lame-X','X-Scissor','bug','physical',80,100,15,0,"Coupe en croix."),
  'signal-beam':   m('signal-beam','Dard-Météore','Signal Beam','bug','special',75,100,15,0,"Peut confondre.",{effect:{type:'confusion',chance:10}}),

  // ── Ice ───────────────────────────────────────────────────────────────────
  'ice-beam':      m('ice-beam','Laser Glace','Ice Beam','ice','special',95,100,10,0,"Peut congeler.",{effect:{type:'freeze',chance:10}}),
  'blizzard':      m('blizzard','Blizzard','Blizzard','ice','special',110,70,5,0,"Peut congeler.",{effect:{type:'freeze',chance:10}}),
  'ice-punch':     m('ice-punch','Poing-Glace','Ice Punch','ice','physical',75,100,15,0,"Peut congeler.",{effect:{type:'freeze',chance:10}}),
  'ice-fang':      m('ice-fang','Croc Glace','Ice Fang','ice','physical',65,95,15,0,"Peut congeler.",{effect:{type:'freeze',chance:10}}),

  // ── Fighting ──────────────────────────────────────────────────────────────
  'karate-chop':    m('karate-chop','Poing Karaté','Karate Chop','fighting','physical',50,100,25,0,"Taux de critiques élevé.",{highCrit:true}),
  'double-kick':    m('double-kick','Double-Pied','Double Kick','fighting','physical',30,100,30,0,"Frappe deux fois.",{multiHit:true}),
  'low-kick':       m('low-kick','Balayage','Low Kick','fighting','physical',65,100,20,0,"Frappe les jambes."),
  'close-combat':   m('close-combat','Close Combat','Close Combat','fighting','physical',120,100,5,0,"Réduit la Défense du lanceur.",{statBoost:{stat:'defense',target:'self',stages:-1}}),
  'submission':     m('submission','Sacrifice','Submission','fighting','physical',80,80,25,0,"Subit des dégâts de recul.",{recoil:0.25}),
  'brick-break':    m('brick-break','Frappe Atlas','Brick Break','fighting','physical',75,100,15,0,"Brise les barrières."),
  'dynamic-punch':  m('dynamic-punch','Dynamopoing','DynamicPunch','fighting','physical',100,50,5,0,"Confond toujours si ça touche.",{effect:{type:'confusion',chance:100}}),

  // ── Poison ────────────────────────────────────────────────────────────────
  'poison-sting':  m('poison-sting','Dard-Venin','Poison Sting','poison','physical',15,100,35,0,"Peut empoisonner.",{effect:{type:'poison',chance:30}}),
  'acid':          m('acid','Acide','Acid','poison','special',40,100,30,0,"Peut réduire la Défense Spéciale.",{statBoost:{stat:'spDefense',target:'foe',stages:-1,chance:10}}),
  'smog':          m('smog','Smog','Smog','poison','special',20,70,20,0,"Peut empoisonner.",{effect:{type:'poison',chance:40}}),
  'sludge':        m('sludge','Beurk','Sludge','poison','special',65,100,20,0,"Peut empoisonner.",{effect:{type:'poison',chance:30}}),
  'sludge-bomb':   m('sludge-bomb',"Bomb' Beurk",'Sludge Bomb','poison','special',90,100,10,0,"Peut empoisonner.",{effect:{type:'poison',chance:30}}),
  'toxic':         m('toxic','Toxik','Toxic','poison','status',0,90,10,0,"Empoisonne gravement.",{effect:{type:'toxic',chance:100}}),
  'poison-gas':    m('poison-gas','Gaz Toxik','Poison Gas','poison','status',0,55,40,0,"Empoisonne l'adversaire.",{effect:{type:'poison',chance:100}}),

  // ── Ground ────────────────────────────────────────────────────────────────
  'earthquake':    m('earthquake','Séisme','Earthquake','ground','physical',100,100,10,0,"Tremblement de terre puissant."),
  'dig':           m('dig','Fouille','Dig','ground','physical',80,100,10,0,"Se cache sous terre au tour 1."),
  'mud-slap':      m('mud-slap','Boue-Bombe','Mud-Slap','ground','special',20,100,10,0,"Réduit la précision adverse.",{statBoost:{stat:'speed',target:'foe',stages:-1,chance:100}}),
  'sand-attack':   m('sand-attack','Jet de Sable','Sand Attack','ground','status',0,100,15,0,"Réduit la précision adverse.",{statBoost:{stat:'defense',target:'foe',stages:-1}}),

  // ── Flying ────────────────────────────────────────────────────────────────
  'peck':          m('peck','Bec Vrille','Peck','flying','physical',35,100,35,0,"Frappe avec le bec."),
  'wing-attack':   m('wing-attack',"Coup d'Aile",'Wing Attack','flying','physical',60,100,35,0,"Frappe avec les ailes."),
  'aerial-ace':    m('aerial-ace','Tranche-Air','Aerial Ace','flying','physical',60,100,20,0,"Ne rate jamais.",{alwaysHit:true}),
  'fly':           m('fly','Vol','Fly','flying','physical',90,95,15,0,"S'envole au tour 1, attaque au tour 2.",{isTwoTurnMove:true,chargingMessage:'prend son envol !'}),
  'drill-peck':    m('drill-peck','Picpic','Drill Peck','flying','physical',80,100,20,0,"Attaque en tournoyant comme une perceuse."),
  'twister':       m('twister','Tourbillon','Twister','dragon','special',40,100,20,0,"Peut confondre.",{effect:{type:'confusion',chance:20}}),

  // ── Psychic ───────────────────────────────────────────────────────────────
  'confusion':     m('confusion','Choc Mental','Confusion','psychic','special',50,100,25,0,"Peut confondre.",{effect:{type:'confusion',chance:10}}),
  'psychic-move':  m('psychic-move','Psyko','Psychic','psychic','special',90,100,10,0,"Peut réduire la Défense Spéciale.",{statBoost:{stat:'spDefense',target:'foe',stages:-1,chance:10}}),
  'psybeam':       m('psybeam','Rayon Psy','Psybeam','psychic','special',65,100,20,0,"Peut confondre.",{effect:{type:'confusion',chance:10}}),
  'hypnosis':      m('hypnosis','Hypnose','Hypnosis','psychic','status',0,60,20,0,"Endort l'adversaire.",{effect:{type:'sleep',chance:100}}),
  'dream-eater':   m('dream-eater','Bouffe-Rêve','Dream Eater','psychic','special',100,100,15,0,"Fonctionne sur un Pokémon endormi.",{draining:0.5}),
  'amnesia':       m('amnesia','Amnésie','Amnesia','psychic','status',0,100,20,0,"Augmente fortement l'Attaque Spéciale.",{statBoost:{stat:'spAttack',target:'self',stages:2}}),
  'barrier':       m('barrier','Barrière','Barrier','psychic','status',0,100,30,0,"Augmente fortement la Défense.",{statBoost:{stat:'defense',target:'self',stages:2}}),
  'calm-mind':     m('calm-mind','Méditation','Calm Mind','psychic','status',0,100,20,0,"Augmente l'Attaque Spéciale.",{statBoost:{stat:'spAttack',target:'self',stages:1}}),
  'agility':       m('agility','Hâte','Agility','psychic','status',0,100,30,0,"Augmente fortement la Vitesse.",{statBoost:{stat:'speed',target:'self',stages:2}}),

  // ── Dark ──────────────────────────────────────────────────────────────────
  'bite':          m('bite','Morsure','Bite','dark','physical',60,100,25,0,"Peut faire sursauter.",{effect:{type:'paralysis',chance:30}}),
  'crunch':        m('crunch',"Coud'Croc",'Crunch','dark','physical',80,100,15,0,"Peut réduire la Défense.",{statBoost:{stat:'defense',target:'foe',stages:-1,chance:20}}),
  'faint-attack':  m('faint-attack','Feinte','Faint Attack','dark','physical',60,100,20,0,"Ne rate jamais.",{alwaysHit:true}),
  'nasty-plot':    m('nasty-plot','Complot','Nasty Plot','dark','status',0,100,20,0,"Augmente fortement l'Attaque Spéciale.",{statBoost:{stat:'spAttack',target:'self',stages:2}}),

  // ── Ghost ─────────────────────────────────────────────────────────────────
  'night-shade':   m('night-shade','Ombre Nuit','Night Shade','ghost','special',60,100,15,0,"Inflige des dégâts égaux au niveau."),
  'confuse-ray':   m('confuse-ray','Rayon Confus','Confuse Ray','ghost','status',0,100,10,0,"Confond l'adversaire.",{effect:{type:'confusion',chance:100}}),
  'lick':          m('lick','Léchage','Lick','ghost','physical',20,100,30,0,"Peut paralyser.",{effect:{type:'paralysis',chance:30}}),

  // ── Rock ──────────────────────────────────────────────────────────────────
  'rock-throw':    m('rock-throw','Jet-Roc','Rock Throw','rock','physical',50,90,15,0,"Lance des rochers."),
  'rock-slide':    m('rock-slide','Éboulement','Rock Slide','rock','physical',75,90,10,0,"Peut faire sursauter.",{effect:{type:'paralysis',chance:30}}),
  'ancient-power': m('ancient-power','Antique Pouvoir','AncientPower','rock','special',60,100,5,0,"Peut augmenter toutes les stats.",{allStatBoost:{stages:1,chance:10}}),

  // ── Dragon ────────────────────────────────────────────────────────────────
  'dragon-rage':   m('dragon-rage','Rage du Dragon','Dragon Rage','dragon','special',80,100,10,0,"Inflige des dégâts fixes."),
  'dragon-breath': m('dragon-breath','Draco-Souffle','DragonBreath','dragon','special',60,100,20,0,"Peut paralyser.",{effect:{type:'paralysis',chance:30}}),
  'outrage':       m('outrage','Colère','Outrage','dragon','physical',120,100,10,0,"Attaque 2-3 tours puis confond.",{recoil:0}),
};

export const MOVE_IDS = Object.keys(MOVES_REGISTRY);
