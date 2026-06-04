import { useState } from 'react';
import { loginUser, registerUser } from '../lib/auth';

interface Props {
  onSuccess: () => void;
}

type Tab = 'connexion' | 'inscription';

export function AuthScreen({ onSuccess }: Props) {
  const [tab, setTab] = useState<Tab>('connexion');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Veuillez remplir tous les champs.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      if (tab === 'connexion') {
        const { error: err } = await loginUser(username.trim(), password);
        if (err) { setError(err); return; }
      } else {
        if (password.length < 6) {
          setError('Le mot de passe doit contenir au moins 6 caractères.');
          return;
        }
        const { error: err } = await registerUser(username.trim(), password);
        if (err) { setError(err); return; }
      }
      onSuccess();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{
        background: 'linear-gradient(180deg, #0a0a2e 0%, #1a1040 40%, #0d1f3c 100%)',
      }}
    >
      {/* Stars decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 60 }, (_, i) => (
          <div
            key={i}
            className="star"
            style={{
              left: `${(i * 137.508) % 100}%`,
              top: `${(i * 97.3) % 100}%`,
              width: `${0.5 + (i % 5) * 0.4}px`,
              height: `${0.5 + (i % 5) * 0.4}px`,
              '--base-opacity': 0.2 + (i % 8) * 0.1,
              '--tw-duration': `${2 + (i % 6) * 0.5}s`,
              '--tw-delay': `${(i % 5) * 1.1}s`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Title */}
      <div className="mb-8 text-center relative z-10">
        <h1
          className="text-6xl font-black tracking-wider"
          style={{
            color: '#f59e0b',
            textShadow: '0 0 20px rgba(245,158,11,0.8), 0 0 40px rgba(245,158,11,0.4), 0 0 60px rgba(245,158,11,0.2)',
          }}
        >
          KATCHII
        </h1>
        <p className="text-slate-400 text-sm mt-2">Attrapez-les tous !</p>
      </div>

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-sm mx-4 rounded-2xl border border-slate-700/60 backdrop-blur-sm"
        style={{ background: 'rgba(10,10,30,0.85)' }}
      >
        {/* Tabs */}
        <div className="flex border-b border-slate-700/60">
          {(['connexion', 'inscription'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(null); }}
              className={`flex-1 py-3 text-sm font-bold transition-colors ${
                tab === t
                  ? 'text-yellow-400 border-b-2 border-yellow-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t === 'connexion' ? 'Connexion' : 'Inscription'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div>
            <label className="block text-slate-300 text-sm font-bold mb-1">Pseudo</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Votre pseudo..."
              autoComplete="username"
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-yellow-500/60 transition-colors"
            />
          </div>
          <div>
            <label className="block text-slate-300 text-sm font-bold mb-1">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={tab === 'connexion' ? 'current-password' : 'new-password'}
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-yellow-500/60 transition-colors"
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm font-bold bg-red-900/30 border border-red-500/40 rounded-xl px-4 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-black text-lg transition-all"
            style={{
              background: loading
                ? 'rgba(245,158,11,0.3)'
                : 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: loading ? '#94a3b8' : '#000',
              boxShadow: loading ? 'none' : '0 0 20px rgba(245,158,11,0.4)',
            }}
          >
            {loading
              ? '...'
              : tab === 'connexion'
              ? 'Se connecter'
              : "S'inscrire"}
          </button>
        </form>
      </div>
    </div>
  );
}
