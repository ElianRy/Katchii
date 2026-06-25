import { useState, useMemo } from 'react';
import { ALL_CARDS, TCG_RARITY_COLOR, TCG_RARITY_LABEL, cardProbability } from '../data/tcgData';
import type { TcgCardDef, TcgRarity } from '../data/tcgData';
import TcgCard from './TcgCard';

interface CardBinderProps {
  tcgCards: Record<string, number>;
  favoriteCardId?: string;
  onSetFavorite: (cardId: string | undefined) => void;
}

type SortKey = 'number' | 'rarity' | 'name';

const ALL_RARITIES: TcgRarity[] = ['common', 'uncommon', 'rare', 'ultra', 'secret'];

export default function CardBinder({ tcgCards, favoriteCardId, onSetFavorite }: CardBinderProps) {
  const [filterRarity, setFilterRarity] = useState<TcgRarity | null>(null);
  const [filterHolo, setFilterHolo] = useState<boolean | null>(null);
  const [filterShiny, setFilterShiny] = useState(false);
  const [filterOwned, setFilterOwned] = useState<'all' | 'owned' | 'missing'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('number');
  const [selectedCard, setSelectedCard] = useState<TcgCardDef | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const rarityOrder: Record<TcgRarity, number> = { common: 0, uncommon: 1, rare: 2, ultra: 3, secret: 4 };

  const filtered = useMemo(() => {
    let cards = [...ALL_CARDS];
    if (filterRarity) cards = cards.filter(c => c.tcgRarity === filterRarity);
    if (filterHolo !== null) cards = cards.filter(c => c.isHolo === filterHolo);
    if (filterShiny) cards = cards.filter(c => c.isShiny === true);
    if (filterOwned === 'owned') cards = cards.filter(c => (tcgCards[c.cardId] ?? 0) > 0);
    if (filterOwned === 'missing') cards = cards.filter(c => (tcgCards[c.cardId] ?? 0) === 0);
    cards.sort((a, b) => {
      if (sortKey === 'number') return a.pokemonId !== b.pokemonId ? a.pokemonId - b.pokemonId : (a.isHolo ? 1 : -1);
      if (sortKey === 'rarity') {
        const d = rarityOrder[a.tcgRarity] - rarityOrder[b.tcgRarity];
        if (d !== 0) return d;
        if (a.isHolo && !b.isHolo) return 1;
        if (!a.isHolo && b.isHolo) return -1;
        return a.pokemonId - b.pokemonId;
      }
      if (sortKey === 'name') return a.pokemonName.localeCompare(b.pokemonName);
      return 0;
    });
    return cards;
  }, [filterRarity, filterHolo, filterShiny, filterOwned, sortKey, tcgCards]);

  const totalOwned = ALL_CARDS.filter(c => (tcgCards[c.cardId] ?? 0) > 0).length;
  const totalCards = ALL_CARDS.length;

  const isFiltered = filterRarity !== null || filterHolo !== null || filterShiny || filterOwned !== 'all' || sortKey !== 'number';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: '#0f172a' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ color: 'white', fontFamily: 'monospace', fontWeight: 900, fontSize: '0.85rem' }}>
            📖 CLASSEUR
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '0.7rem' }}>
              {totalOwned} / {totalCards}
            </span>
            <button
              onClick={() => setFiltersOpen(o => !o)}
              style={{
                background: isFiltered ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${isFiltered ? '#6366f1' : 'rgba(255,255,255,0.15)'}`,
                color: isFiltered ? '#a5b4fc' : '#94a3b8',
                borderRadius: 6, padding: '2px 8px', fontSize: '0.62rem',
                fontFamily: 'monospace', cursor: 'pointer', fontWeight: 700,
              }}
            >
              Filtres {filtersOpen ? '▴' : '▾'}
            </button>
          </div>
        </div>

        {/* Collapsible filters */}
        {filtersOpen && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', paddingTop: 6 }}>
            {/* Rarity filter */}
            {ALL_RARITIES.map(r => (
              <button
                key={r}
                onClick={() => setFilterRarity(filterRarity === r ? null : r)}
                style={{
                  background: filterRarity === r ? `${TCG_RARITY_COLOR[r]}33` : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${filterRarity === r ? TCG_RARITY_COLOR[r] : 'rgba(255,255,255,0.15)'}`,
                  color: filterRarity === r ? TCG_RARITY_COLOR[r] : '#94a3b8',
                  borderRadius: 6, padding: '2px 8px', fontSize: '0.62rem',
                  fontFamily: 'monospace', cursor: 'pointer', fontWeight: 700,
                }}
              >
                {TCG_RARITY_LABEL[r].split(' ')[0]}
              </button>
            ))}
            {/* Holo filter */}
            <button
              onClick={() => setFilterHolo(filterHolo === true ? null : true)}
              style={{
                background: filterHolo === true ? '#f59e0b33' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${filterHolo === true ? '#f59e0b' : 'rgba(255,255,255,0.15)'}`,
                color: filterHolo === true ? '#f59e0b' : '#94a3b8',
                borderRadius: 6, padding: '2px 8px', fontSize: '0.62rem',
                fontFamily: 'monospace', cursor: 'pointer', fontWeight: 700,
              }}
            >
              ✦ Holo
            </button>
            {/* Shiny filter */}
            <button
              onClick={() => setFilterShiny(s => !s)}
              style={{
                background: filterShiny ? '#fbbf2433' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${filterShiny ? '#fbbf24' : 'rgba(255,255,255,0.15)'}`,
                color: filterShiny ? '#fbbf24' : '#94a3b8',
                borderRadius: 6, padding: '2px 8px', fontSize: '0.62rem',
                fontFamily: 'monospace', cursor: 'pointer', fontWeight: 700,
              }}
            >
              ✨ Shiny
            </button>
            {/* Owned filter */}
            {(['all', 'owned', 'missing'] as const).map(o => (
              <button
                key={o}
                onClick={() => setFilterOwned(o)}
                style={{
                  background: filterOwned === o ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${filterOwned === o ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.1)'}`,
                  color: filterOwned === o ? 'white' : '#64748b',
                  borderRadius: 6, padding: '2px 8px', fontSize: '0.62rem',
                  fontFamily: 'monospace', cursor: 'pointer',
                }}
              >
                {o === 'all' ? 'Tout' : o === 'owned' ? 'Possédées' : 'Manquantes'}
              </button>
            ))}
            {/* Sort */}
            <select
              value={sortKey}
              onChange={e => setSortKey(e.target.value as SortKey)}
              style={{
                background: '#1e293b', border: '1px solid rgba(255,255,255,0.15)',
                color: '#94a3b8', borderRadius: 6, padding: '2px 6px',
                fontSize: '0.62rem', fontFamily: 'monospace', cursor: 'pointer',
              }}
            >
              <option value="number">Trier: n°</option>
              <option value="rarity">Trier: rareté</option>
              <option value="name">Trier: nom</option>
            </select>
            {/* Reset */}
            {isFiltered && (
              <button
                onClick={() => { setFilterRarity(null); setFilterHolo(null); setFilterShiny(false); setFilterOwned('all'); setSortKey('number'); }}
                style={{
                  background: 'transparent', border: '1px solid #ef4444',
                  color: '#ef4444', borderRadius: 6, padding: '2px 8px',
                  fontSize: '0.62rem', fontFamily: 'monospace', cursor: 'pointer',
                }}
              >
                ✕ Reset
              </button>
            )}
          </div>
        )}
      </div>

      {/* Cards grid */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 12 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-start' }}>
          {filtered.map(card => {
            const count = tcgCards[card.cardId] ?? 0;
            const owned = count > 0;
            return (
              <div
                key={card.cardId}
                onClick={() => setSelectedCard(card)}
                style={{
                  opacity: owned ? 1 : 0.35,
                  cursor: 'pointer',
                  filter: owned ? 'none' : 'grayscale(0.8)',
                  position: 'relative',
                }}
              >
                {owned ? (
                  <TcgCard
                    card={card}
                    count={count}
                    size="sm"
                    isFavorite={favoriteCardId === card.cardId}
                  />
                ) : (
                  <div style={{
                    width: 80, height: 112, borderRadius: 5,
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace', fontWeight: 900, fontSize: '0.75rem' }}>
                      #{String(card.pokemonId).padStart(3, '0')}
                    </span>
                    {card.isHolo && (
                      <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '0.55rem', fontFamily: 'monospace' }}>HOLO</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Card detail modal */}
      {selectedCard && (
        <div
          onClick={() => setSelectedCard(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9000,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
            background: '#1e293b', borderRadius: 16, padding: 24,
            border: `2px solid ${TCG_RARITY_COLOR[selectedCard.tcgRarity]}44`,
            maxWidth: 260,
          }}>
            <TcgCard
              card={selectedCard}
              size="lg"
              isFavorite={favoriteCardId === selectedCard.cardId}
            />
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'white', fontFamily: 'monospace', fontWeight: 900, fontSize: '0.95rem' }}>
                {selectedCard.pokemonName}
              </div>
              <div style={{ color: TCG_RARITY_COLOR[selectedCard.tcgRarity], fontFamily: 'monospace', fontSize: '0.75rem', marginTop: 4 }}>
                {selectedCard.isHolo ? '✦ Holo · ' : ''}{TCG_RARITY_LABEL[selectedCard.tcgRarity]}
              </div>
              <div style={{ color: '#64748b', fontFamily: 'monospace', fontSize: '0.65rem', marginTop: 6 }}>
                Probabilité : {cardProbability(selectedCard)} par booster
              </div>
              <div style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '0.7rem', marginTop: 4 }}>
                Possédée : <strong style={{ color: 'white' }}>×{tcgCards[selectedCard.cardId] ?? 0}</strong>
              </div>
              {favoriteCardId === selectedCard.cardId ? (
                <button
                  onClick={() => onSetFavorite(undefined)}
                  style={{
                    marginTop: 12, background: '#f59e0b33', border: '1px solid #f59e0b',
                    color: '#f59e0b', borderRadius: 8, padding: '6px 16px',
                    fontFamily: 'monospace', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 700,
                  }}
                >
                  ★ Retirer des favoris
                </button>
              ) : (tcgCards[selectedCard.cardId] ?? 0) > 0 ? (
                <button
                  onClick={() => onSetFavorite(selectedCard.cardId)}
                  style={{
                    marginTop: 12, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.4)',
                    color: '#fbbf24', borderRadius: 8, padding: '6px 16px',
                    fontFamily: 'monospace', fontSize: '0.75rem', cursor: 'pointer',
                  }}
                >
                  ☆ Mettre en favori
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
