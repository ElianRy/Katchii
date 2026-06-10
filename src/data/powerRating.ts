import { GameState } from '../types';
import { POKEMON_BY_ID } from './gen1';

const RARITY_PR: Record<string, number> = {
  commun: 1, peu_commun: 2, rare: 4, elite: 7, legendaire: 12,
};

/**
 * Power Rating — représente la puissance réelle du compte.
 * Prend en compte : niveaux des pokémons, collection, shinys, entraînements.
 */
export function calcPowerRating(state: GameState): number {
  let pr = 0;

  // Contribution des niveaux de pokémons capturés
  for (const [idStr, count] of Object.entries(state.normalCollection)) {
    if (!count || (count as number) <= 0) continue;
    const id = Number(idStr);
    const rarity = POKEMON_BY_ID[id]?.rarity ?? 'commun';
    const lvl = state.pokemonLevels?.[id]?.level ?? 1;
    pr += lvl * (RARITY_PR[rarity] ?? 1);
  }

  // Bonus shiny (chaque shiny compte double)
  for (const [idStr, count] of Object.entries(state.shinyCollection)) {
    if (!count || (count as number) <= 0) continue;
    const id = Number(idStr);
    const rarity = POKEMON_BY_ID[id]?.rarity ?? 'commun';
    const lvl = state.pokemonLevels?.[id]?.level ?? 1;
    pr += lvl * (RARITY_PR[rarity] ?? 1);
  }

  // Bonus entraînements
  pr += (state.trainingBattlesTotal ?? 0) * 0.5;

  // Bonus victoires PokéParc
  pr += (state.parkDuelRecord?.totalWins ?? 0) * 2;

  return Math.round(pr);
}

/**
 * Elo minimum dynamique — empêche un gros compte de descendre trop bas.
 * Elo_min = 1000 + PR × 0.15 (plafonné à 2000)
 */
export function calcEloFloor(pr: number): number {
  return Math.min(2000, Math.round(1000 + pr * 0.15));
}

/**
 * Calcule le delta Elo après un combat PokéParc.
 *
 * Formule :
 *  - base Elo standard (K=32, expected score)
 *  - multiplicateur PR : si l'attaquant est beaucoup plus fort → gains réduits / pertes amplifiées
 *  - rendement décroissant selon le nombre de combats contre le même joueur aujourd'hui
 *
 * @param myElo         Elo du joueur local
 * @param myPR          Power Rating du joueur local
 * @param oppElo        Elo de l'adversaire (estimé si inconnu)
 * @param oppPR         Power Rating de l'adversaire (estimé si inconnu)
 * @param won           Résultat du combat
 * @param fightCountVsOpp  Nombre de combats déjà joués contre cet adversaire aujourd'hui
 */
export function calcEloDelta(
  myElo: number,
  myPR: number,
  oppElo: number,
  oppPR: number,
  won: boolean,
  fightCountVsOpp = 0
): number {
  const K = 32;
  const expected = 1 / (1 + Math.pow(10, (oppElo - myElo) / 400));
  const score = won ? 1 : 0;

  // Base delta
  let delta = K * (score - expected);

  // Multiplicateur basé sur le ratio de PR
  // Si je suis beaucoup plus fort que l'adversaire :
  //   - en cas de victoire : réduction des gains
  //   - en cas de défaite : amplification des pertes
  const prRatio = oppPR > 0 ? myPR / oppPR : 1;
  let prMult: number;
  if (prRatio >= 4) {
    // Je suis 4× plus fort : victoire = quasi nul, défaite = x3
    prMult = won ? 0.05 : 3.0;
  } else if (prRatio >= 2) {
    prMult = won ? 0.2 : 2.0;
  } else if (prRatio >= 1.3) {
    prMult = won ? 0.6 : 1.4;
  } else if (prRatio <= 0.25) {
    // Je suis 4× plus faible : victoire = x3, défaite = quasi nul
    prMult = won ? 3.0 : 0.05;
  } else if (prRatio <= 0.5) {
    prMult = won ? 2.0 : 0.2;
  } else if (prRatio <= 0.77) {
    prMult = won ? 1.4 : 0.6;
  } else {
    prMult = 1.0;
  }

  delta *= prMult;

  // Rendement décroissant (combats répétés vs même joueur)
  const repeatMult = [1, 0.5, 0.25, 0.1][Math.min(fightCountVsOpp, 3)] ?? 0;
  delta *= repeatMult;

  // Arrondi et cap
  const rounded = Math.round(delta);
  return Math.max(-60, Math.min(60, rounded));
}
