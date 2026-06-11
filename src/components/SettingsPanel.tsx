import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { stopMusic, playMenuMusic, setMusicVolume, setGlobalVolume, setSfxVolume } from '../lib/audio';

interface Props {
  onClose: () => void;
}

const SETTINGS_KEY = 'katchii_settings';

interface Settings {
  music: boolean;
  sound: boolean;
  musicVolume: number;
  sfxVolume: number;
  globalVolume: number;
  reducedAnimations: boolean;
}

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { music: true, sound: true, musicVolume: 0.2, sfxVolume: 0.7, globalVolume: 0.7, reducedAnimations: false, ...JSON.parse(raw) };
  } catch {}
  return { music: true, sound: true, musicVolume: 0.2, sfxVolume: 0.7, globalVolume: 0.7, reducedAnimations: false };
}

function saveSettings(s: Settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

export function getSettings(): Settings {
  return loadSettings();
}

const TUTORIAL_KEYS = ['hunt', 'collection', 'duels', 'pokepark'];
function allTutorialsDone(): boolean {
  return TUTORIAL_KEYS.every(k => localStorage.getItem(`katchii_tuto_${k}`) === '1');
}
function setAllTutorialsDone(done: boolean) {
  TUTORIAL_KEYS.forEach(k => {
    if (done) localStorage.setItem(`katchii_tuto_${k}`, '1');
    else localStorage.removeItem(`katchii_tuto_${k}`);
  });
}

export function SettingsPanel({ onClose }: Props) {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [tutosHidden, setTutosHidden] = useState(allTutorialsDone);
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwStatus, setPwStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [pwError, setPwError] = useState('');

  function update(patch: Partial<Settings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
    // Live audio reactions — gain tree: masterGain × musicGain × sfxGain
    if ('music' in patch) {
      if (!patch.music) { stopMusic(0.3); setMusicVolume(0); }
      else { setMusicVolume(next.musicVolume); playMenuMusic(); }
    }
    if ('musicVolume' in patch) {
      setMusicVolume(next.music ? patch.musicVolume! : 0);
    }
    if ('sfxVolume' in patch) {
      setSfxVolume(next.sound ? patch.sfxVolume! : 0);
    }
    if ('sound' in patch) {
      setSfxVolume(patch.sound ? next.sfxVolume : 0);
    }
    if ('globalVolume' in patch) {
      setGlobalVolume(patch.globalVolume!);
    }
  }

  async function handleChangePassword() {
    if (!pwNew || pwNew !== pwConfirm) { setPwError('Les mots de passe ne correspondent pas.'); return; }
    if (pwNew.length < 6) { setPwError('Minimum 6 caractères.'); return; }
    setPwStatus('loading'); setPwError('');
    const { error } = await supabase.auth.updateUser({ password: pwNew });
    if (error) { setPwStatus('error'); setPwError(error.message); }
    else { setPwStatus('success'); setPwNew(''); setPwConfirm(''); }
  }

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-slate-950" style={{ height: '100dvh' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700 shrink-0">
        <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl px-1">←</button>
        <h2 className="text-white font-black text-xl">⚙️ Paramètres</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-6">

        {/* Son — global + musique + effets dans un seul encadré */}
        <section>
          <h3 className="text-slate-300 font-bold text-sm mb-3 uppercase tracking-wider">🔊 Son</h3>
          <div className="bg-slate-800/60 rounded-xl border border-slate-700/40 overflow-hidden">

            {/* Volume global */}
            <div className="px-4 py-4 border-b border-slate-700/40">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xl shrink-0">🔊</span>
                <div className="flex-1">
                  <div className="text-white font-semibold text-sm">Volume global</div>
                  <div className="text-slate-400 text-xs mt-0.5">Ajuste le volume de tous les sons</div>
                </div>
                <span className="text-slate-300 text-xs w-8 text-right font-bold">{Math.round(settings.globalVolume * 100)}%</span>
              </div>
              <input
                type="range" min={0} max={1} step={0.05}
                value={settings.globalVolume}
                onChange={e => update({ globalVolume: parseFloat(e.target.value) })}
                className="w-full accent-yellow-400"
              />
            </div>

            {/* Musique */}
            <ToggleRow
              label="Musique d'ambiance"
              description="Active les musiques de zones et combats"
              icon="🎵"
              checked={settings.music}
              onChange={() => update({ music: !settings.music })}
            />
            {settings.music && (
              <div className="px-4 pb-3 flex items-center gap-3 border-b border-slate-700/40">
                <span className="text-slate-400 text-xs w-16 shrink-0">Volume</span>
                <input
                  type="range" min={0} max={1} step={0.05}
                  value={settings.musicVolume}
                  onChange={e => update({ musicVolume: parseFloat(e.target.value) })}
                  className="flex-1 accent-yellow-400"
                />
                <span className="text-slate-300 text-xs w-8 text-right">{Math.round(settings.musicVolume * 100)}%</span>
              </div>
            )}

            {/* Effets sonores */}
            <ToggleRow
              label="Effets sonores"
              description="Bruitages, cris pokémon, captures…"
              icon="🔉"
              checked={settings.sound}
              onChange={() => update({ sound: !settings.sound })}
            />
            {settings.sound && (
              <div className="px-4 pb-4 flex items-center gap-3">
                <span className="text-slate-400 text-xs w-16 shrink-0">Volume</span>
                <input
                  type="range" min={0} max={1} step={0.05}
                  value={settings.sfxVolume}
                  onChange={e => update({ sfxVolume: parseFloat(e.target.value) })}
                  className="flex-1 accent-yellow-400"
                />
                <span className="text-slate-300 text-xs w-8 text-right">{Math.round(settings.sfxVolume * 100)}%</span>
              </div>
            )}
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
              onChange={() => update({ reducedAnimations: !settings.reducedAnimations })}
            />
          </div>
        </section>

        {/* Tutorial */}
        <section>
          <h3 className="text-slate-300 font-bold text-sm mb-3 uppercase tracking-wider">Tutoriel</h3>
          <div className="bg-slate-800/60 rounded-xl border border-slate-700/40 overflow-hidden">
            <ToggleRow
              label="Masquer les tutoriels"
              description="Ne plus afficher les guides d'introduction sur chaque écran"
              icon="📖"
              checked={tutosHidden}
              onChange={() => {
                const next = !tutosHidden;
                setAllTutorialsDone(next);
                setTutosHidden(next);
              }}
            />
          </div>
        </section>

        {/* Password */}
        <section>
          <h3 className="text-slate-300 font-bold text-sm mb-3 uppercase tracking-wider">Sécurité</h3>
          <div className="bg-slate-800/60 rounded-xl border border-slate-700/40 p-4 flex flex-col gap-3">
            <input type="password" placeholder="Nouveau mot de passe" value={pwNew}
              onChange={e => setPwNew(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 outline-none focus:border-yellow-500" />
            <input type="password" placeholder="Confirmer le mot de passe" value={pwConfirm}
              onChange={e => setPwConfirm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 outline-none focus:border-yellow-500" />
            {pwError && <p className="text-red-400 text-xs">{pwError}</p>}
            {pwStatus === 'success' && <p className="text-green-400 text-xs">Mot de passe mis à jour !</p>}
            <button onClick={handleChangePassword} disabled={pwStatus === 'loading'}
              className="w-full rounded-xl py-3 font-bold text-sm transition-all active:scale-95"
              style={{ background: pwStatus === 'loading' ? 'rgba(245,158,11,0.4)' : 'linear-gradient(135deg,#f59e0b,#ef7c00)', color: '#fff' }}>
              {pwStatus === 'loading' ? 'Mise à jour…' : 'Changer le mot de passe'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function ToggleRow({ label, description, icon, checked, onChange }: {
  label: string; description: string; icon: string; checked: boolean; onChange: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 cursor-pointer" onClick={onChange}>
      <span className="text-xl shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-white font-semibold text-sm">{label}</div>
        <div className="text-slate-400 text-xs mt-0.5">{description}</div>
      </div>
      <div className="shrink-0 w-12 h-6 rounded-full transition-colors duration-200 relative"
        style={{ background: checked ? '#f59e0b' : '#334155' }}>
        <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200"
          style={{ left: checked ? '1.625rem' : '0.125rem' }} />
      </div>
    </div>
  );
}
