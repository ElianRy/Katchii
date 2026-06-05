export interface PlayerGrade {
  level: number;
  grade: string;
  icon: string;
  color: string;
}

// XP needed for level n = 50 * n²
export function playerLevelFromXp(xp: number): number {
  return Math.floor(Math.sqrt((xp ?? 0) / 50)) + 1;
}

export function xpToNextLevel(currentXp: number): { needed: number; progress: number } {
  const level = playerLevelFromXp(currentXp);
  const currentThreshold = 50 * (level - 1) ** 2;
  const nextThreshold = 50 * level ** 2;
  return {
    needed: nextThreshold - currentXp,
    progress: (currentXp - currentThreshold) / (nextThreshold - currentThreshold),
  };
}

export function getPlayerGrade(xp: number): PlayerGrade {
  const level = playerLevelFromXp(xp);
  if (level >= 30) return { level, grade: 'Légende',   icon: '👑', color: '#fde047' };
  if (level >= 20) return { level, grade: 'Champion',  icon: '🏆', color: '#f97316' };
  if (level >= 15) return { level, grade: 'Maître',    icon: '💎', color: '#a78bfa' };
  if (level >= 10) return { level, grade: 'Expert',    icon: '⭐', color: '#60a5fa' };
  if (level >= 5)  return { level, grade: 'Chasseur',  icon: '🎯', color: '#4ade80' };
  return              { level, grade: 'Novice',    icon: '🌱', color: '#94a3b8' };
}

// XP awarded for a capture
export const CAPTURE_XP: Record<string, number> = {
  commun: 10, peu_commun: 25, rare: 60, elite: 150, legendaire: 400,
};

// XP awarded every 2 min while pokemon is in park (player + pokemon)
export const PARK_XP_PER_TICK: Record<string, number> = {
  commun: 5, peu_commun: 8, rare: 15, elite: 30, legendaire: 80,
};
