// ── Katchii Audio Manager ──────────────────────────────────────────────────
// Centralise tous les sons du jeu : musiques d'ambiance, bruitages UI,
// cris pokémon, captures, combats.

const BASE_URL = 'https://kbegumpzvyjagfikjdxi.supabase.co/storage/v1/object/public/sounds';
const CRY_BASE = 'https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest';

const SETTINGS_KEY = 'katchii_settings';

function isSoundEnabled(): boolean {
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}');
    return s.sound !== false;
  } catch { return true; }
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

export function playMusic(src: string, volume = 0.35) {
  if (!isSoundEnabled()) return;
  const fullSrc = `${BASE_URL}/${src}.mp3`;
  if (currentMusicSrc === fullSrc && currentMusic && !currentMusic.paused) return;

  stopMusic(0.5);

  const audio = new Audio(fullSrc);
  audio.loop = true;
  audio.volume = 0;
  audio.play().catch(() => {});
  currentMusic = audio;
  currentMusicSrc = fullSrc;

  // Fade in
  let vol = 0;
  const step = volume / 20;
  const id = setInterval(() => {
    vol = Math.min(volume, vol + step);
    if (audio) audio.volume = vol;
    if (vol >= volume) clearInterval(id);
  }, 50);
}

export function stopMusic(fadeSec = 1) {
  if (!currentMusic) return;
  const audio = currentMusic;
  currentMusic = null;
  currentMusicSrc = '';
  const startVol = audio.volume;
  const steps = 20;
  const step = startVol / steps;
  const intervalMs = (fadeSec * 1000) / steps;
  let vol = startVol;
  const id = setInterval(() => {
    vol = Math.max(0, vol - step);
    audio.volume = vol;
    if (vol <= 0) { clearInterval(id); audio.pause(); audio.src = ''; }
  }, intervalMs);
}

// ── Zone music map ────────────────────────────────────────────────────────
const ZONE_MUSIC: Record<string, string> = {
  zone1: 'foret_pallet',
  zone2: 'bord_de_mer',
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

export function playBattleMusic() { playMusic('combat', 0.4); }
export function playLeagueBattleMusic() { playMusic('combat_ligue', 0.4); }
export function playMenuMusic() { playMusic('ecran_menu', 0.3); }

// ── One-shot SFX (from Supabase) ─────────────────────────────────────────
function playSfx(src: string, volume = 0.7) {
  if (!isSoundEnabled()) return;
  const audio = new Audio(`${BASE_URL}/${src}.mp3`);
  audio.volume = volume;
  audio.play().catch(() => {});
}

export function playVictory() { playSfx('victoire', 0.6); }
export function playLeagueVictory() { playSfx('victoire_ligue', 0.6); }
export function playLevelUp() { playSfx('level_up', 0.7); }

// ── Pokemon cry ───────────────────────────────────────────────────────────
export function playPokemonCry(pokemonId: number, volume = 0.5) {
  if (!isSoundEnabled()) return;
  const audio = new Audio(`${CRY_BASE}/${pokemonId}.ogg`);
  audio.volume = volume;
  audio.play().catch(() => {});
}

// ── Web Audio synth sounds ────────────────────────────────────────────────
// Style Pokédex Game Boy / DS

function synth(
  type: OscillatorType,
  freq: number,
  duration: number,
  volume: number,
  freqEnd?: number,
  delay = 0
) {
  if (!isSoundEnabled()) return;
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
  gain.gain.linearRampToValueAtTime(volume, start + 0.005);
  gain.gain.setValueAtTime(volume, start + duration * 0.7);
  gain.gain.linearRampToValueAtTime(0, start + duration);
  osc.start(start);
  osc.stop(start + duration + 0.01);
}

// Bouton valider (clic positif) — blip montant style Pokédex
export function playSfxConfirm() {
  synth('square', 523, 0.06, 0.15);
  synth('square', 784, 0.06, 0.12, undefined, 0.06);
}

// Bouton retour — blip descendant
export function playSfxBack() {
  synth('square', 523, 0.08, 0.15, 220);
}

// Capture normale — son poké ball
export function playSfxCapture() {
  synth('sine', 300, 0.12, 0.2, 180);
  synth('square', 440, 0.08, 0.15, undefined, 0.1);
  synth('sine', 220, 0.15, 0.18, undefined, 0.2);
}

// Doublon — son plus court et discret
export function playSfxDuplicate() {
  synth('square', 330, 0.07, 0.12, 280);
}

// Shiny ou légendaire — son épique multi-notes
export function playSfxShinyCapture() {
  synth('sine',   523, 0.1, 0.3);
  synth('sine',   659, 0.1, 0.3, undefined, 0.1);
  synth('sine',   784, 0.1, 0.3, undefined, 0.2);
  synth('sine',  1047, 0.15, 0.4, undefined, 0.3);
  synth('square', 523, 0.07, 0.5, undefined, 0.3);
}

// Défaite
export function playSfxDefeat() {
  synth('square', 330, 0.15, 0.18, 220);
  synth('square', 220, 0.15, 0.18, 165, 0.15);
  synth('square', 165, 0.2,  0.25, 110, 0.3);
}

// Quête complétée
export function playSfxQuestComplete() {
  synth('square', 523, 0.07, 0.18);
  synth('square', 659, 0.07, 0.18, undefined, 0.08);
  synth('square', 784, 0.07, 0.18, undefined, 0.16);
  synth('square', 1047,0.1,  0.25, undefined, 0.24);
}
