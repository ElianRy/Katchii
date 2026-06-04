export interface BadgeDefinition {
  id: string;
  label: string;
  desc: string;
  icon: string;
  secret: boolean;
}

export const BADGES: BadgeDefinition[] = [
  { id: 'first_catch', label: 'Première capture', desc: 'Capture ton premier Pokémon', icon: '🎯', secret: false },
  { id: 'catch_10', label: 'Débutant', desc: '10 Pokémon différents capturés', icon: '📋', secret: false },
  { id: 'catch_50', label: 'Collectionneur', desc: '50 Pokémon différents capturés', icon: '📚', secret: false },
  { id: 'catch_100', label: 'Expert', desc: '100 Pokémon différents capturés', icon: '🏆', secret: false },
  { id: 'catch_151', label: 'Maître Pokémon', desc: 'Tous les 151 capturés !', icon: '👑', secret: false },
  { id: 'first_rare', label: 'Chasseur', desc: 'Capture ton premier Rare', icon: '💎', secret: false },
  { id: 'first_elite', label: 'Chasseur Élite', desc: 'Capture ton premier Élite', icon: '💜', secret: false },
  { id: 'first_legendary', label: 'Légendaire !', desc: 'Capture ton premier Légendaire', icon: '⚡', secret: false },
  { id: 'first_shiny', label: 'Brillant !', desc: 'Capture ton premier Shiny', icon: '✨', secret: false },
  { id: 'shiny_3', label: 'Chasseur de Shinies', desc: '3 Pokémon Shinies capturés', icon: '🌟', secret: false },
  { id: 'first_evolution', label: 'Évolution !', desc: 'Fais évoluer ton premier Pokémon', icon: '🔄', secret: false },
  { id: 'first_lure', label: 'Stratège', desc: 'Active ton premier leurre', icon: '🎣', secret: false },
  { id: 'magicarpe', label: '...', desc: '???', icon: '❓', secret: true },
  { id: 'full_starter', label: 'Starter complet', desc: 'Capture les 3 starters', icon: '🌿', secret: false },
  { id: 'first_fusion', label: 'Alchimiste', desc: 'Réalise ta première fusion', icon: '⚗️', secret: false },
  { id: 'all_fusions', label: 'Maître Fusionneur', desc: 'Réalise toutes les fusions', icon: '🌀', secret: false },
];

export const BADGE_BY_ID: Record<string, BadgeDefinition> = Object.fromEntries(
  BADGES.map((b) => [b.id, b])
);
