import { TutorialStep } from './TutorialOverlay';

/* ── Shared illustration helpers ─────────────────────────────────── */

function PokeballAnim() {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 110, height: 110 }}>
      <div className="absolute inset-0 rounded-full"
        style={{ background: 'radial-gradient(ellipse, rgba(250,204,21,0.15) 0%, transparent 70%)', animation: 'aura-pulse 1.8s ease-in-out infinite' }} />
      <div style={{ fontSize: 72, lineHeight: 1, animation: 'badge-pop 0.5s ease-out both, alakazam-float 3s 0.5s ease-in-out infinite' }}>⚾</div>
    </div>
  );
}

function ShinyAnim() {
  const stars = ['✦', '★', '✧', '✦', '★'];
  return (
    <div className="relative flex items-center justify-center" style={{ width: 140, height: 120 }}>
      <div style={{ fontSize: 64, lineHeight: 1, filter: 'drop-shadow(0 0 12px #fde047) drop-shadow(0 0 24px #a855f7)' }}>✨</div>
      {stars.map((s, i) => (
        <div key={i} className="absolute text-yellow-300 font-bold pointer-events-none"
          style={{
            fontSize: 12 + (i % 3) * 4,
            top: `${10 + Math.sin(i * 1.26) * 35 + 35}%`,
            left: `${10 + Math.cos(i * 1.26) * 40 + 40}%`,
            animation: `shiny-sparkle ${0.9 + i * 0.2}s ${i * 0.12}s ease-in-out infinite`,
          }}>{s}</div>
      ))}
    </div>
  );
}

function ZoneMapAnim() {
  const zones = ['🌲','🌊','⚡','🌸','👻','🏢','🌋','🏟️'];
  return (
    <div className="flex flex-wrap justify-center gap-2 px-4">
      {zones.map((emoji, i) => (
        <div key={i} className="rounded-xl flex items-center justify-center font-bold text-xs text-slate-300"
          style={{
            width: 48, height: 48, fontSize: 24,
            background: i < 3 ? 'rgba(74,222,128,0.2)' : i < 6 ? 'rgba(250,204,21,0.12)' : 'rgba(168,85,247,0.2)',
            border: `1px solid ${i < 3 ? 'rgba(74,222,128,0.4)' : i < 6 ? 'rgba(250,204,21,0.3)' : 'rgba(168,85,247,0.4)'}`,
            animation: `badge-pop 0.4s ${i * 0.07}s ease-out both`,
          }}>{emoji}</div>
      ))}
    </div>
  );
}

function CooldownAnim() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div style={{ fontSize: 52, animation: 'alakazam-float 2s ease-in-out infinite' }}>⏱️</div>
      <div className="flex gap-1">
        {[1,0.7,0.4,0.15].map((o, i) => (
          <div key={i} className="rounded-full" style={{ width: 32, height: 8, background: `rgba(250,204,21,${o})`, animation: `aura-pulse 1.2s ${i * 0.2}s ease-in-out infinite` }} />
        ))}
      </div>
    </div>
  );
}

function LegendaryAnim() {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 140, height: 120 }}>
      <div className="absolute inset-0 rounded-full"
        style={{ background: 'radial-gradient(ellipse, rgba(168,85,247,0.25) 0%, transparent 70%)', animation: 'aura-pulse 1.4s ease-in-out infinite' }} />
      <div style={{ fontSize: 72, filter: 'drop-shadow(0 0 16px #a855f7) drop-shadow(0 0 32px #fde047)' }}>🐉</div>
      {['✦','★','✧'].map((s, i) => (
        <div key={i} className="absolute pointer-events-none"
          style={{
            fontSize: 14, color: '#fde047',
            top: `${15 + Math.sin(i * 2.1) * 30 + 30}%`,
            left: `${10 + Math.cos(i * 2.1) * 38 + 38}%`,
            animation: `shiny-sparkle ${1 + i * 0.25}s ${i * 0.18}s ease-in-out infinite`,
          }}>{s}</div>
      ))}
    </div>
  );
}

function SwordShieldAnim() {
  return (
    <div className="flex items-center gap-4">
      <div style={{ fontSize: 52, animation: 'badge-pop 0.4s ease-out both' }}>⚔️</div>
      <div className="text-slate-400 text-2xl font-black">VS</div>
      <div style={{ fontSize: 52, animation: 'badge-pop 0.4s 0.1s ease-out both' }}>🛡️</div>
    </div>
  );
}

function TeamAnim() {
  return (
    <div className="flex items-end justify-center gap-3">
      {[
        { size: 52, delay: '0s', color: '#ef4444' },
        { size: 62, delay: '0.1s', color: '#facc15' },
        { size: 52, delay: '0.2s', color: '#3b82f6' },
      ].map((p, i) => (
        <div key={i} className="rounded-2xl flex items-center justify-center"
          style={{
            width: p.size, height: p.size,
            background: `${p.color}22`, border: `1px solid ${p.color}55`,
            animation: `badge-pop 0.4s ${p.delay} ease-out both, alakazam-float ${2.2 + i * 0.3}s ease-in-out infinite`,
            fontSize: 28,
          }}>⚔️</div>
      ))}
    </div>
  );
}

function ParkAnim() {
  const pokes = ['🌸','🌿','🌊','☀️'];
  return (
    <div className="relative flex items-center justify-center" style={{ width: '100%', height: 110 }}>
      <div className="absolute bottom-0 left-0 right-0 h-8 rounded-xl"
        style={{ background: 'linear-gradient(to top, rgba(74,222,128,0.25), transparent)' }} />
      {pokes.map((p, i) => (
        <div key={i} className="absolute"
          style={{
            fontSize: 32,
            left: `${15 + i * 20}%`,
            bottom: '20%',
            animation: `alakazam-float ${2 + i * 0.4}s ${i * 0.3}s ease-in-out infinite`,
          }}>{p}</div>
      ))}
    </div>
  );
}

function DuelAnim() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-2">
        <div className="text-2xl font-black text-blue-400" style={{ animation: 'badge-pop 0.4s ease-out both' }}>TU</div>
        <div className="text-slate-500 text-lg font-black mx-1">⚡</div>
        <div className="text-2xl font-black text-red-400" style={{ animation: 'badge-pop 0.4s 0.1s ease-out both' }}>ENNEMI</div>
      </div>
      <div style={{ fontSize: 48, animation: 'alakazam-float 2s ease-in-out infinite' }}>🥊</div>
      <div className="flex gap-2 text-xs text-slate-400">
        <span className="px-2 py-1 rounded-lg" style={{ background: 'rgba(250,204,21,0.1)', border: '1px solid rgba(250,204,21,0.2)' }}>🏆 Points</span>
        <span className="px-2 py-1 rounded-lg" style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)' }}>💎 Fragments</span>
      </div>
    </div>
  );
}

/* ── Tutorial content ─────────────────────────────────────────────── */

export const HUNT_TUTORIAL: TutorialStep[] = [
  {
    title: 'Bienvenue dans la Chasse ! 🎯',
    body: "Des Pokémon sauvages apparaissent régulièrement dans cette zone. Appuie sur l'un d'eux pour tenter de le capturer. Plus tu joues, plus ton Pokédex se remplit !",
    illustration: <PokeballAnim />,
  },
  {
    title: 'Le Cooldown ⏱️',
    body: "Après chaque capture d'un nouveau Pokémon, un cooldown s'active. Les doublons (indiqués par une Pokéball à côté de leur nom) se capturent sans attendre ! Le timer est affiché en bas à droite.",
    illustration: <CooldownAnim />,
  },
  {
    title: 'Les 8 Zones 🗺️',
    body: "Chaque zone a une mission à accomplir avant d'affronter le Maître d'Arène. Bats-le pour débloquer la zone suivante !",
    illustration: <ZoneMapAnim />,
  },
  {
    title: 'Le bouton Info ℹ️',
    body: "Le bouton ℹ️ en haut de chaque zone affiche les Pokémon disponibles, leur rareté, la mission du Maître d'Arène et ta progression. Consulte-le pour savoir quoi capturer !",
    illustration: (
      <div className="flex flex-col items-center gap-3">
        <div className="rounded-2xl px-5 py-3 flex items-center gap-3"
          style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)' }}>
          <span style={{ fontSize: 32 }}>ℹ️</span>
          <div className="text-left">
            <div className="text-white font-bold text-sm">Zone Info</div>
            <div className="text-slate-400 text-xs">Pokémon · Missions · Maître</div>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: 'Shiny & Probabilités ✨',
    body: "Chaque Pokémon a une rareté : Commun, Peu commun, Rare, Élite ou Légendaire. Les Shiny sont ultra-rares (1 chance sur ~750). Garde l'œil ouvert — ils brillent ! Ils peuvent spawner dans toutes les zones !",
    illustration: <ShinyAnim />,
  },
  {
    title: 'Les Légendaires 🐉',
    body: "Les Pokémon Légendaires ne sont disponibles QUE dans la Zone Libre (la dernière zone débloquée). Progresse zone par zone pour avoir une chance de les rencontrer !",
    illustration: <LegendaryAnim />,
  },
];

export const COLLECTION_TUTORIAL: TutorialStep[] = [
  {
    title: 'Ta Collection 📚',
    body: "Tous les Pokémon que tu as capturés sont ici. Filtre par rareté, recherche par nom, et consulte les stats de chacun.",
    illustration: (
      <div className="flex flex-col items-center gap-3">
        <div style={{ fontSize: 52, animation: 'badge-pop 0.5s ease-out both, alakazam-float 2.5s ease-in-out infinite' }}>📚</div>
        <div className="flex gap-2 text-xs text-slate-300 font-bold">
          <span className="px-2 py-1 rounded-lg" style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)' }}>✨ Shiny</span>
          <span className="px-2 py-1 rounded-lg" style={{ background: 'rgba(250,204,21,0.12)', border: '1px solid rgba(250,204,21,0.2)' }}>🏆 Élite</span>
          <span className="px-2 py-1 rounded-lg" style={{ background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.2)' }}>💫 Rare</span>
        </div>
      </div>
    ),
  },
];

export const TEAM_TUTORIAL: TutorialStep[] = [
  {
    title: 'Ton Équipe ⚔️',
    body: "Compose une équipe de 3 Pokémon pour les combats. Définis une équipe favorite — elle sera utilisée automatiquement dans les duels et les combats de zone.",
    illustration: <TeamAnim />,
  },
  {
    title: 'Entraînement & Niveaux 📈',
    body: "Tes Pokémon gagnent de l'XP en combattant. Plus leur niveau est élevé, plus ils sont forts dans les combats. Entraîne-les régulièrement !",
    illustration: <SwordShieldAnim />,
  },
];

export const DUELS_TUTORIAL: TutorialStep[] = [
  {
    title: 'Les Duels 🥊',
    body: "Affronte d'autres joueurs en temps réel ! Lance un défi depuis cet écran. Ton équipe favorite est utilisée automatiquement — pense à la configurer dans l'onglet Équipe.",
    illustration: <DuelAnim />,
  },
  {
    title: 'Récompenses & Classement 🏆',
    body: "Chaque victoire te rapporte des points de classement et des fragments légendaires. Les défaites font perdre des points. Grimpe dans le classement pour débloquer des bonus exclusifs !",
    illustration: (
      <div className="flex flex-col items-center gap-3">
        <div style={{ fontSize: 56, animation: 'badge-pop 0.5s ease-out both, alakazam-float 2.5s ease-in-out infinite' }}>🏆</div>
        <div className="flex gap-2 text-sm font-bold">
          <span className="px-3 py-1 rounded-xl text-yellow-400" style={{ background: 'rgba(250,204,21,0.15)' }}>1er</span>
          <span className="px-3 py-1 rounded-xl text-slate-300" style={{ background: 'rgba(255,255,255,0.08)' }}>2e</span>
          <span className="px-3 py-1 rounded-xl" style={{ background: 'rgba(205,127,50,0.2)', color: '#cd7f32' }}>3e</span>
        </div>
      </div>
    ),
  },
];

export const POKEPARK_TUTORIAL: TutorialStep[] = [
  {
    title: 'Le PokéParc 🌿',
    body: "Choisis un Pokémon à mettre dans le Poképarc (un seul à la fois). Il se balade librement dans cet espace partagé avec tous les joueurs connectés !",
    illustration: <ParkAnim />,
  },
  {
    title: 'Interactions & XP 💬',
    body: "Ton Pokémon dans le Poképarc gagne de l'XP automatiquement au fil du temps — même quand tu n'es pas connecté ! Interagis avec les Pokémon des autres joueurs pour chatter et les défier en duel.",
    illustration: (
      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-3">
          <div style={{ fontSize: 36, animation: 'alakazam-float 2s ease-in-out infinite' }}>💬</div>
          <div style={{ fontSize: 36, animation: 'alakazam-float 2.3s 0.3s ease-in-out infinite' }}>💫</div>
          <div style={{ fontSize: 36, animation: 'alakazam-float 2.6s 0.6s ease-in-out infinite' }}>⚡</div>
        </div>
        <p className="text-xs text-slate-400 text-center px-4">Clique sur un Pokémon pour voir les options</p>
      </div>
    ),
  },
];
