/**
 * gen1Moves.ts — backward-compatibility re-export from movesRegistry.
 * All move data now lives in movesRegistry.ts (Single Source of Truth).
 * Import directly from movesRegistry for new code.
 */
export type { MoveRegistryEntry as Move } from './movesRegistry';
export { MOVES_REGISTRY as MOVES, MOVE_IDS } from './movesRegistry';
