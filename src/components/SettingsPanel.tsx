import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface Props {
  onClose: () => void;
}

const SETTINGS_KEY = 'katchii_settings';

interface Settings {
  sound: boolean;
  reducedAnimations: boolean;
}

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { sound: true, reducedAnimations: false, ...JSON.parse(raw) };
  } catch {}
  return { sound: true, reducedAnimations: false };
}

function saveSettings(s: Settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

export function getSettings(): Settings {
  return loadSettings();
}

export function SettingsPanel({ onClose }: Props) {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwStatus, setPwStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [pwError, setPwError] = useState('');

  function toggle(key: keyof Settings) {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    saveSettings(next);
  }

  async function handleChangePassword() {
    if (!pwNew || pwNew !== pwConfirm) {
      setPwError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (pwNew.length < 6) {
      setPwError('Minimum 6 caractères.');
      return;
    }
    setPwStatus('loading');
    setPwError('');
    const { error } = await supabase.auth.updateUser({ password: pwNew });
    if (error) {
      setPwStatus('error');
      setPwError(error.message);
    } else {
      setPwStatus('success');
      setPwNew('');
      setPwConfirm('');
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-slate-950" style={{ height: '100dvh' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700 shrink-0">
        <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl px-1">←</button>
        <div>
          <h2 className="text-white font-black text-xl">⚙️ Paramètres</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-6">
        {/* Sound */}
        <section>
          <h3 className="text-slate-300 font-bold text-sm mb-3 uppercase tracking-wider">Audio</h3>
          <div className="bg-slate-800/60 rounded-xl border border-slate-700/40 overflow-hidden">
            <ToggleRow
              label="Son & Effets sonores"
              description="Active les sons du jeu"
              icon="🔊"
              checked={settings.sound}
              onChange={() => toggle('sound')}
            />
          </div>
        </section>

        {/* Animations */}
        <section>
          <h3 className="text-slate-300 font-bold text-sm mb-3 uppercase tracking-wider">Affichage</h3>
          <div className="bg-slate-800/60 rounded-xl border border-slate-700/40 overflow-hidden">
            <ToggleRow
              label="Réduire les animations"
              description="Moins d'effets visuels pour économiser la batterie"
              icon="✨"
              checked={settings.reducedAnimations}
              onChange={() => toggle('reducedAnimations')}
            />
          </div>
        </section>

        {/* Password change */}
        <section>
          <h3 className="text-slate-300 font-bold text-sm mb-3 uppercase tracking-wider">Sécurité</h3>
          <div className="bg-slate-800/60 rounded-xl border border-slate-700/40 p-4 flex flex-col gap-3">
            <input
              type="password"
              placeholder="Nouveau mot de passe"
              value={pwNew}
              onChange={e => setPwNew(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 outline-none focus:border-yellow-500"
            />
            <input
              type="password"
              placeholder="Confirmer le mot de passe"
              value={pwConfirm}
              onChange={e => setPwConfirm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 outline-none focus:border-yellow-500"
            />
            {pwError && <p className="text-red-400 text-xs">{pwError}</p>}
            {pwStatus === 'success' && <p className="text-green-400 text-xs">Mot de passe mis à jour !</p>}
            <button
              onClick={handleChangePassword}
              disabled={pwStatus === 'loading'}
              className="w-full rounded-xl py-3 font-bold text-sm transition-all active:scale-95"
              style={{
                background: pwStatus === 'loading' ? 'rgba(245,158,11,0.4)' : 'linear-gradient(135deg,#f59e0b,#ef7c00)',
                color: '#fff',
              }}
            >
              {pwStatus === 'loading' ? 'Mise à jour…' : 'Changer le mot de passe'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function ToggleRow({ label, description, icon, checked, onChange }: {
  label: string;
  description: string;
  icon: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5" onClick={onChange} style={{ cursor: 'pointer' }}>
      <span className="text-xl shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-white font-semibold text-sm">{label}</div>
        <div className="text-slate-400 text-xs mt-0.5">{description}</div>
      </div>
      {/* Toggle switch */}
      <div
        className="shrink-0 w-12 h-6 rounded-full transition-colors duration-200 relative"
        style={{ background: checked ? '#f59e0b' : '#334155' }}
      >
        <div
          className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200"
          style={{ left: checked ? '1.625rem' : '0.125rem' }}
        />
      </div>
    </div>
  );
}
