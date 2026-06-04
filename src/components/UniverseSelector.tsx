interface Props {
  onSelect: (universe: 'pokemon' | 'naruto') => void;
}

export function UniverseSelector({ onSelect }: Props) {
  return (
    <div className="fixed inset-0 bg-slate-950 text-white flex flex-col items-center justify-center gap-8 p-6">
      <div className="text-center">
        <h1 className="text-4xl font-black mb-2 bg-gradient-to-r from-yellow-400 to-red-500 bg-clip-text text-transparent">
          Katchii
        </h1>
        <p className="text-slate-400 text-sm">Choisis ton univers</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-5 w-full max-w-xl">
        {/* Pokémon */}
        <button
          onClick={() => onSelect('pokemon')}
          className="flex-1 rounded-2xl border-2 border-red-500/60 p-6 flex flex-col items-center gap-4
                     bg-gradient-to-br from-red-950/60 to-yellow-950/60 hover:from-red-900/80 hover:to-yellow-900/80
                     transition-all hover:scale-105 hover:border-red-400 cursor-pointer group"
        >
          <div className="text-5xl group-hover:animate-bounce">⚡</div>
          <div className="text-center">
            <div className="text-xl font-black text-white">Pokémon</div>
            <div className="text-sm text-yellow-400 font-bold">Kanto — Génération 1</div>
            <div className="text-xs text-slate-400 mt-1">151 Pokémon à capturer</div>
          </div>
          {/* Mini pokeball */}
          <svg width="40" height="40" viewBox="0 0 64 64" className="opacity-70">
            <path d="M 32 2 A 30 30 0 0 1 62 32 L 38 32 A 6 6 0 0 0 26 32 L 2 32 A 30 30 0 0 1 32 2 Z" fill="#ef4444" />
            <path d="M 2 32 A 30 30 0 0 0 62 32 L 38 32 A 6 6 0 0 1 26 32 Z" fill="white" />
            <circle cx="32" cy="32" r="30" fill="none" stroke="black" strokeWidth="3" />
            <line x1="2" y1="32" x2="62" y2="32" stroke="black" strokeWidth="3" />
            <circle cx="32" cy="32" r="7" fill="white" stroke="black" strokeWidth="3" />
          </svg>
        </button>

        {/* Naruto */}
        <button
          onClick={() => onSelect('naruto')}
          className="flex-1 rounded-2xl border-2 border-orange-500/60 p-6 flex flex-col items-center gap-4
                     bg-gradient-to-br from-orange-950/60 to-slate-900/60 hover:from-orange-900/80 hover:to-slate-800/80
                     transition-all hover:scale-105 hover:border-orange-400 cursor-pointer group"
        >
          <div className="text-5xl group-hover:animate-bounce">🍥</div>
          <div className="text-center">
            <div className="text-xl font-black text-white">Naruto</div>
            <div className="text-sm text-orange-400 font-bold">Zone 1 — Village de Konoha</div>
            <div className="text-xs text-slate-400 mt-1">30 ninjas à débloquer</div>
          </div>
          <div className="text-3xl opacity-70">忍</div>
        </button>
      </div>

      <p className="text-slate-500 text-xs">Chaque univers a sa propre progression</p>
    </div>
  );
}
