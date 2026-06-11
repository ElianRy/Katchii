// ── Katchii Audio Manager ──────────────────────────────────────────────────

const BASE_URL = 'https://kbegumpzvyjagfikjdxi.supabase.co/storage/v1/object/public/sounds';
const CRY_BASE = 'https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest';
const SETTINGS_KEY = 'katchii_settings';

// ── Settings helpers ──────────────────────────────────────────────────────
export interface AudioSettings {
  music: boolean;
  sound: boolean;
  musicVolume: number; // 0–1
  sfxVolume: number;   // 0–1
  globalVolume: number; // 0–1 master multiplier
}

export function loadAudioSettings(): AudioSettings {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}');
    return {
      music:        raw.music        ?? true,
      sound:        raw.sound        ?? true,
      musicVolume:  raw.musicVolume  ?? 0.2,
      sfxVolume:    raw.sfxVolume    ?? 0.7,
      globalVolume: raw.globalVolume ?? 0.7,
    };
  } catch {
    return { music: true, sound: true, musicVolume: 0.2, sfxVolume: 0.7, globalVolume: 0.7 };
  }
}

// ── Web Audio context + gain tree ─────────────────────────────────────────
//
//  masterGain ──┬── musicGain ── [per-track fadeGain] ── MediaElementSource
//               └── sfxGain   ── [per-sfx gainMult]   ── MediaElementSource
//
// Volume sliders update masterGain / musicGain / sfxGain directly.
// iOS ignores HTMLAudioElement.volume, but GainNodes work on every platform.

let _ctx: AudioContext | null = null;
let _masterGain: GainNode | null = null;
let _musicGain: GainNode | null = null;
let _sfxGain: GainNode | null = null;
let _victoryAudio: HTMLAudioElement | null = null;

function getCtx(): AudioContext {
  if (!_ctx) {
    _ctx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    _masterGain = _ctx.createGain();
    _musicGain  = _ctx.createGain();
    _sfxGain    = _ctx.createGain();
    _musicGain.connect(_masterGain);
    _sfxGain.connect(_masterGain);
    _masterGain.connect(_ctx.destination);
    _applyAllGains();
  }
  if (_ctx.state === 'suspended') _ctx.resume().catch(() => {});
  return _ctx;
}

function _applyAllGains() {
  const s = loadAudioSettings();
  if (_masterGain) _masterGain.gain.value = s.globalVolume;
  if (_musicGain)  _musicGain.gain.value  = s.music ? s.musicVolume : 0;
  if (_sfxGain)    _sfxGain.gain.value    = s.sound ? s.sfxVolume   : 0;
}

// ── Music player ─────────────────────────────────────────────────────────
let currentMusic: HTMLAudioElement | null = null;
let currentMusicFadeGain: GainNode | null = null;
let currentMusicSrc = '';
let currentMusicTrack = '';
let currentFadeInId: ReturnType<typeof setInterval> | null = null;

export function playMusic(src: string) {
  const fullSrc = `${BASE_URL}/${src}.mp3`;
  if (currentMusicSrc === fullSrc && currentMusic && !currentMusic.paused) return;

  stopMusic(0.5);

  const s = loadAudioSettings();
  if (!s.music) { currentMusicTrack = src; return; }

  const audio = new Audio(fullSrc);
  audio.crossOrigin = 'anonymous';
  audio.loop = true;
  audio.volume = 1; // volume is controlled via GainNodes, not HTMLAudioElement.volume

  try {
    const c = getCtx();
    const source   = c.createMediaElementSource(audio);
    const fadeGain = c.createGain();
    fadeGain.gain.value = 0;
    source.connect(fadeGain);
    fadeGain.connect(_musicGain!);

    audio.play().catch(() => {});
    currentMusic         = audio;
    currentMusicFadeGain = fadeGain;
    currentMusicSrc      = fullSrc;
    currentMusicTrack    = src;

    // Fade in over ~1 second
    let v = 0;
    const step = 1 / 20;
    currentFadeInId = setInterval(() => {
      v = Math.min(1, v + step);
      fadeGain.gain.value = v;
      if (v >= 1) { clearInterval(currentFadeInId!); currentFadeInId = null; }
    }, 50);
  } catch {
    // Fallback (CORS blocked / unsupported): use element volume directly
    const vol = s.musicVolume * s.globalVolume;
    audio.volume = vol;
    audio.play().catch(() => {});
    currentMusic      = audio;
    currentMusicSrc   = fullSrc;
    currentMusicTrack = src;
  }
}

export function stopMusic(fadeSec = 1) {
  if (currentFadeInId !== null) { clearInterval(currentFadeInId); currentFadeInId = null; }
  // Stop any victory track that may still be playing
  if (_victoryAudio) { _victoryAudio.pause(); _victoryAudio.src = ''; _victoryAudio = null; }
  if (!currentMusic) return;

  const audio    = currentMusic;
  const fadeGain = currentMusicFadeGain;
  currentMusic         = null;
  currentMusicFadeGain = null;
  currentMusicSrc      = '';

  if (fadeSec <= 0) {
    audio.pause();
    audio.src = '';
    return;
  }

  if (fadeGain) {
    // Fade out via GainNode
    const startVol = fadeGain.gain.value;
    const steps = 20;
    const intervalMs = (fadeSec * 1000) / steps;
    const step = startVol / steps;
    let vol = startVol;
    const id = setInterval(() => {
      vol = Math.max(0, vol - step);
      fadeGain.gain.value = vol;
      if (vol <= 0) { clearInterval(id); audio.pause(); audio.src = ''; }
    }, intervalMs);
  } else {
    // Fallback: fade via element volume
    const startVol = audio.volume;
    const steps = 20;
    const intervalMs = (fadeSec * 1000) / steps;
    const step = startVol / steps;
    let vol = startVol;
    const id = setInterval(() => {
      vol = Math.max(0, vol - step);
      audio.volume = vol;
      if (vol <= 0) { clearInterval(id); audio.pause(); audio.src = ''; }
    }, intervalMs);
  }
}

// Pause without destroying the element (for app background/foreground)
export function pauseCurrentMusic() {
  if (currentFadeInId !== null) { clearInterval(currentFadeInId); currentFadeInId = null; }
  if (currentMusic) currentMusic.pause();
}

// Resume last track — first try to un-pause the existing element, else recreate
export function resumeCurrentMusic() {
  if (currentMusic && currentMusic.paused) {
    getCtx(); // ensure AudioContext is resumed
    currentMusic.play().catch(() => {});
    return;
  }
  if (!currentMusicTrack) return;
  const track = currentMusicTrack;
  currentMusicSrc = ''; // force restart
  playMusic(track);
}

// ── Settings volume controls (called from settings sliders) ───────────────
export function setMusicVolume(vol: number) {
  getCtx();
  if (_musicGain) _musicGain.gain.value = Math.max(0, Math.min(1, vol));
  // Fallback for non-AudioContext path
  if (currentMusic && !currentMusicFadeGain) {
    const s = loadAudioSettings();
    currentMusic.volume = Math.min(1, vol * s.globalVolume);
  }
}

export function setGlobalVolume(globalVol: number) {
  getCtx();
  if (_masterGain) _masterGain.gain.value = globalVol;
  // Fallback
  if (currentMusic && !currentMusicFadeGain) {
    const s = loadAudioSettings();
    currentMusic.volume = s.music ? s.musicVolume * globalVol : 0;
  }
}

export function setSfxVolume(vol: number) {
  getCtx();
  if (_sfxGain) _sfxGain.gain.value = vol;
}

// ── Zone music map ────────────────────────────────────────────────────────
const ZONE_MUSIC: Record<string, string> = {
  zone1: 'foret_pallet',
  zone2: 'bords_de_mer',
  zone3: 'centrale_electrique',
  zone4: 'bois_aux_fleurs',
  zone5: 'tour_fantome',
  zone6: 'sylphe_sarl',
  zone7: 'ile_cramoisie',
  zone8: 'route_victoire',
  zone_libre: 'zone_libre',
};

export function playZoneMusic(zoneId: string) {
  const track = ZONE_MUSIC[zoneId];
  if (track) playMusic(track);
}

export function playBattleMusic()       { playMusic('combat'); }
export function playShinyBattleSfx()    { playSfxFile('combat_shiny'); }
export function playLeagueBattleMusic() { playMusic('combat_ligue'); }
export function playMenuMusic()         { playMusic('ecran_menu'); }
export function playShinySpawn()        { playSfxFile('spawn_shiny'); }
export function playShinySpawnLoud()    { playSfxFile('spawn_shiny', 1.5); }

// ── One-shot SFX from Supabase ────────────────────────────────────────────
function playSfxFile(name: string, volMult = 1) {
  const s = loadAudioSettings();
  if (!s.sound) return;

  const audio = new Audio(`${BASE_URL}/${name}.mp3`);
  audio.crossOrigin = 'anonymous';
  audio.volume = 1;

  try {
    const c = getCtx();
    const source  = c.createMediaElementSource(audio);
    const sfxMult = c.createGain();
    sfxMult.gain.value = volMult;
    source.connect(sfxMult);
    sfxMult.connect(_sfxGain!);
    audio.play().catch(() => {});
  } catch {
    // Fallback
    audio.volume = Math.min(1, s.sfxVolume * s.globalVolume * volMult);
    audio.play().catch(() => {});
  }
}

export function playSfxConfirm()       { playSfxFile('sfx_confirm'); }
export function playSfxCapture()       { playSfxFile('sfx_capture'); }
export function playSfxPokeball()      { playSfxFile('catch_poke'); }
export function playCatchPoke()        { playSfxFile('catch_poke', 2.0); }
// Victory plays through the music channel so ambient volume setting controls it
function playVictoryTrack(name: string) {
  const s = loadAudioSettings();
  if (!s.music) return;
  // Stop any previous victory track
  if (_victoryAudio) { _victoryAudio.pause(); _victoryAudio.src = ''; _victoryAudio = null; }
  const audio = new Audio(`${BASE_URL}/${name}.mp3`);
  audio.crossOrigin = 'anonymous';
  audio.loop = false;
  _victoryAudio = audio;
  audio.addEventListener('ended', () => { if (_victoryAudio === audio) _victoryAudio = null; });
  try {
    const c = getCtx();
    const source = c.createMediaElementSource(audio);
    source.connect(_musicGain!);
    audio.play().catch(() => {});
  } catch {
    audio.volume = s.music ? s.musicVolume * s.globalVolume : 0;
    audio.play().catch(() => {});
  }
}
export function playVictory()          { playVictoryTrack('victoire'); }
export function playLeagueVictory()    { playVictoryTrack('victoire_ligue'); }
export function playLevelUp()          { playSfxFile('level_up'); }

// ── Pokemon cry ───────────────────────────────────────────────────────────
export function playPokemonCry(pokemonId: number) {
  const s = loadAudioSettings();
  if (!s.sound) return;
  // GitHub cries: no crossOrigin needed (CORS allowed), but createMediaElementSource
  // may fail for cross-origin — use element volume directly as fallback
  const audio = new Audio(`${CRY_BASE}/${pokemonId}.ogg`);
  audio.crossOrigin = 'anonymous';
  audio.volume = 1;
  try {
    const c = getCtx();
    const source = c.createMediaElementSource(audio);
    const gain   = c.createGain();
    gain.gain.value = 0.8;
    source.connect(gain);
    gain.connect(_sfxGain!);
    audio.play().catch(() => {});
  } catch {
    audio.volume = Math.min(1, s.sfxVolume * s.globalVolume * 0.8);
    audio.play().catch(() => {});
  }
}

// ── Web Audio synth (generated sounds) ───────────────────────────────────
function synth(type: OscillatorType, freq: number, duration: number, volume: number, freqEnd?: number, delay = 0) {
  const c = getCtx();
  const osc  = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(_sfxGain ?? c.destination);
  osc.type = type;
  const start = c.currentTime + delay;
  osc.frequency.setValueAtTime(freq, start);
  if (freqEnd !== undefined) osc.frequency.linearRampToValueAtTime(freqEnd, start + duration);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.005);
  gain.gain.setValueAtTime(volume, start + duration * 0.7);
  gain.gain.linearRampToValueAtTime(0, start + duration);
  osc.start(start);
  osc.stop(start + duration + 0.01);
}

export function playSfxDuplicate()     { synth('square', 330, 0.07, 0.12, 280); }
export function playSfxShinyCapture()  {
  synth('sine',   523, 0.1, 0.3);
  synth('sine',   659, 0.1, 0.3, undefined, 0.1);
  synth('sine',   784, 0.1, 0.3, undefined, 0.2);
  synth('sine',  1047, 0.15, 0.4, undefined, 0.3);
  synth('square', 523, 0.07, 0.5, undefined, 0.3);
}
export function playSfxDefeat() {
  synth('square', 330, 0.15, 0.18, 220);
  synth('square', 220, 0.15, 0.18, 165, 0.15);
  synth('square', 165, 0.2,  0.25, 110, 0.3);
}
export function playSfxQuestComplete() {
  synth('square', 523, 0.07, 0.18);
  synth('square', 659, 0.07, 0.18, undefined, 0.08);
  synth('square', 784, 0.07, 0.18, undefined, 0.16);
  synth('square', 1047, 0.1, 0.25, undefined, 0.24);
}

// ── Visibility / focus resume is handled by App.tsx (has React state context)
