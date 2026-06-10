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
}

export function loadAudioSettings(): AudioSettings {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}');
    return {
      music:       raw.music       ?? true,
      sound:       raw.sound       ?? true,
      musicVolume: raw.musicVolume ?? 0.35,
      sfxVolume:   raw.sfxVolume   ?? 0.7,
    };
  } catch {
    return { music: true, sound: true, musicVolume: 0.35, sfxVolume: 0.7 };
  }
}

function getMusicVol(): number {
  const s = loadAudioSettings();
  return s.music ? s.musicVolume : 0;
}
function getSfxVol(): number {
  const s = loadAudioSettings();
  return s.sound ? s.sfxVolume : 0;
}

// ── AudioContext singleton ────────────────────────────────────────────────
let _ctx: AudioContext | null = null;
function ctx(): AudioContext {
  if (!_ctx) _ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}

// ── Music player ─────────────────────────────────────────────────────────
let currentMusic: HTMLAudioElement | null = null;
let currentMusicSrc = '';
let currentMusicTrack = ''; // track name without BASE_URL
let currentFadeInId: ReturnType<typeof setInterval> | null = null;

export function playMusic(src: string) {
  const vol = getMusicVol();
  const fullSrc = `${BASE_URL}/${src}.mp3`;
  if (currentMusicSrc === fullSrc && currentMusic && !currentMusic.paused) return;

  stopMusic(0.5);
  if (vol === 0) { currentMusicTrack = src; return; } // remember track but don't play

  const audio = new Audio(fullSrc);
  audio.loop = true;
  audio.volume = 0;
  audio.play().catch(() => {});
  currentMusic = audio;
  currentMusicSrc = fullSrc;
  currentMusicTrack = src;

  let v = 0;
  const step = vol / 20;
  currentFadeInId = setInterval(() => {
    v = Math.min(vol, v + step);
    if (audio) audio.volume = v;
    if (v >= vol) { clearInterval(currentFadeInId!); currentFadeInId = null; }
  }, 50);
}

export function stopMusic(fadeSec = 1) {
  if (currentFadeInId !== null) { clearInterval(currentFadeInId); currentFadeInId = null; }
  if (!currentMusic) return;
  const audio = currentMusic;
  currentMusic = null;
  currentMusicSrc = '';
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

// Resume last track (called on visibility change / focus)
export function resumeCurrentMusic() {
  if (!currentMusicTrack) return;
  const track = currentMusicTrack;
  currentMusicSrc = ''; // force restart
  playMusic(track);
}

// Update music volume live (called from settings slider)
export function setMusicVolume(vol: number) {
  if (currentMusic) currentMusic.volume = vol;
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

// ── One-shot SFX from Supabase ────────────────────────────────────────────
function playSfxFile(name: string) {
  const vol = getSfxVol();
  if (vol === 0) return;
  const audio = new Audio(`${BASE_URL}/${name}.mp3`);
  audio.volume = vol;
  audio.play().catch(() => {});
}

export function playSfxConfirm()       { playSfxFile('sfx_confirm'); }
export function playSfxCapture()       { playSfxFile('sfx_capture'); }
export function playSfxPokeball()      { playSfxFile('sfx_pokeball'); }
export function playVictory()          { playSfxFile('victoire'); }
export function playLeagueVictory()    { playSfxFile('victoire_ligue'); }
export function playLevelUp()          { playSfxFile('level_up'); }

// ── Pokemon cry ───────────────────────────────────────────────────────────
export function playPokemonCry(pokemonId: number) {
  const vol = getSfxVol();
  if (vol === 0) return;
  const audio = new Audio(`${CRY_BASE}/${pokemonId}.ogg`);
  audio.volume = vol * 0.8;
  audio.play().catch(() => {});
}

// ── Web Audio synth (only for sounds without a file) ─────────────────────
function synth(type: OscillatorType, freq: number, duration: number, volume: number, freqEnd?: number, delay = 0) {
  const vol = getSfxVol();
  if (vol === 0) return;
  const c = ctx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = type;
  const start = c.currentTime + delay;
  osc.frequency.setValueAtTime(freq, start);
  if (freqEnd !== undefined) osc.frequency.linearRampToValueAtTime(freqEnd, start + duration);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume * vol, start + 0.005);
  gain.gain.setValueAtTime(volume * vol, start + duration * 0.7);
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
