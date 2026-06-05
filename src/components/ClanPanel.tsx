import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface ClanMember {
  user_id: string;
  username: string;
  role: 'chef' | 'officier' | 'membre';
  joinedAt: string;
}

interface ClanRow {
  id: string;
  name: string;
  emblem: string;
  description: string;
  type: 'open' | 'invite';
  owner_id: string;
  created_at: string;
}

interface ChatMessage {
  id: string;
  clan_id: string;
  user_id: string;
  username: string;
  text: string;
  created_at: string;
}

interface Props {
  userId: string;
  username: string;
  onClose: () => void;
}

const EMBLEMS = ['🛡️','⚔️','🔥','💧','🌿','⚡','🌙','☀️','💎','🦅','🐉','🦁','🌟','🏔️','🌊'];

export function ClanPanel({ userId, username, onClose }: Props) {
  const [view, setView] = useState<'loading' | 'none' | 'mine' | 'browse' | 'create'>('loading');
  const [myClan, setMyClan] = useState<ClanRow | null>(null);
  const [myRole, setMyRole] = useState<ClanMember['role']>('membre');
  const [members, setMembers] = useState<ClanMember[]>([]);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [msgText, setMsgText] = useState('');
  const [clans, setClans] = useState<ClanRow[]>([]);
  // create form
  const [clanName, setClanName] = useState('');
  const [clanEmblem, setClanEmblem] = useState('🛡️');
  const [clanDesc, setClanDesc] = useState('');
  const [clanType, setClanType] = useState<'open' | 'invite'>('open');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMyClan();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat]);

  async function loadMyClan() {
    const { data: membership } = await supabase
      .from('clan_members')
      .select('clan_id, role')
      .eq('user_id', userId)
      .single();

    if (!membership) { setView('none'); return; }

    const { data: clan } = await supabase
      .from('clans')
      .select('*')
      .eq('id', membership.clan_id)
      .single();

    if (!clan) { setView('none'); return; }

    setMyClan(clan);
    setMyRole(membership.role as ClanMember['role']);
    setView('mine');
    loadMembers(clan.id);
    loadChat(clan.id);
    subscribeChat(clan.id);
  }

  async function loadMembers(clanId: string) {
    const { data } = await supabase
      .from('clan_members')
      .select('user_id, username, role, joined_at')
      .eq('clan_id', clanId)
      .order('joined_at', { ascending: true });
    if (data) {
      setMembers(data.map(m => ({
        user_id: m.user_id,
        username: m.username,
        role: m.role as ClanMember['role'],
        joinedAt: m.joined_at,
      })));
    }
  }

  async function loadChat(clanId: string) {
    const { data } = await supabase
      .from('clan_chat')
      .select('*')
      .eq('clan_id', clanId)
      .order('created_at', { ascending: true })
      .limit(50);
    if (data) setChat(data as ChatMessage[]);
  }

  function subscribeChat(clanId: string) {
    const ch = supabase
      .channel(`clan_chat_${clanId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'clan_chat', filter: `clan_id=eq.${clanId}` }, payload => {
        setChat(prev => [...prev, payload.new as ChatMessage]);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }

  async function sendMessage() {
    if (!msgText.trim() || !myClan) return;
    const text = msgText.trim();
    setMsgText('');
    await supabase.from('clan_chat').insert({
      clan_id: myClan.id,
      user_id: userId,
      username,
      text,
    });
  }

  async function loadBrowse() {
    setView('browse');
    const { data } = await supabase
      .from('clans')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);
    if (data) setClans(data as ClanRow[]);
  }

  async function joinClan(clanId: string) {
    setSaving(true);
    const { error } = await supabase.from('clan_members').insert({
      clan_id: clanId,
      user_id: userId,
      username,
      role: 'membre',
    });
    setSaving(false);
    if (error) { setError(error.message); return; }
    loadMyClan();
  }

  async function createClan() {
    if (!clanName.trim()) { setError('Nom requis'); return; }
    setSaving(true);
    setError('');
    const { data: clan, error: clanErr } = await supabase
      .from('clans')
      .insert({ name: clanName.trim(), emblem: clanEmblem, description: clanDesc.trim(), type: clanType, owner_id: userId })
      .select()
      .single();
    if (clanErr || !clan) { setError(clanErr?.message ?? 'Erreur'); setSaving(false); return; }
    await supabase.from('clan_members').insert({
      clan_id: clan.id,
      user_id: userId,
      username,
      role: 'chef',
    });
    setSaving(false);
    loadMyClan();
  }

  async function leaveClan() {
    if (!myClan) return;
    if (!confirm('Quitter le clan ?')) return;
    await supabase.from('clan_members').delete().eq('clan_id', myClan.id).eq('user_id', userId);
    setMyClan(null);
    setView('none');
  }

  const roleLabel: Record<ClanMember['role'], string> = { chef: '👑 Chef', officier: '⭐ Officier', membre: '🔵 Membre' };

  if (view === 'loading') return (
    <div className="fixed inset-0 z-[80] bg-slate-950 flex items-center justify-center">
      <div className="text-yellow-400 animate-pulse font-black text-lg">Chargement…</div>
    </div>
  );

  if (view === 'create') return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-slate-950" style={{ height: '100dvh' }}>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700 shrink-0">
        <button onClick={() => setView('none')} className="text-slate-400 hover:text-white text-2xl px-1">←</button>
        <h2 className="text-white font-black text-xl">Créer un clan</h2>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        <div>
          <label className="text-slate-400 text-xs font-bold block mb-1">Nom du clan</label>
          <input
            className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 border border-slate-700 focus:border-yellow-500 outline-none" style={{ fontSize: 16 }}
            placeholder="Ex: Les Maîtres Pokémon"
            value={clanName}
            onChange={e => setClanName(e.target.value)}
            maxLength={30}
          />
        </div>
        <div>
          <label className="text-slate-400 text-xs font-bold block mb-1">Emblème</label>
          <div className="flex flex-wrap gap-2">
            {EMBLEMS.map(e => (
              <button key={e} onClick={() => setClanEmblem(e)}
                className="text-2xl w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: clanEmblem === e ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.05)', border: `2px solid ${clanEmblem === e ? '#f59e0b' : 'transparent'}` }}>
                {e}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-slate-400 text-xs font-bold block mb-1">Description</label>
          <textarea
            className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 border border-slate-700 focus:border-yellow-500 outline-none resize-none" style={{ fontSize: 16 }}
            rows={3}
            placeholder="Décris ton clan..."
            value={clanDesc}
            onChange={e => setClanDesc(e.target.value)}
            maxLength={200}
          />
        </div>
        <div>
          <label className="text-slate-400 text-xs font-bold block mb-2">Type</label>
          <div className="flex gap-2">
            {(['open', 'invite'] as const).map(t => (
              <button key={t} onClick={() => setClanType(t)}
                className="flex-1 py-2 rounded-xl text-sm font-bold"
                style={{ background: clanType === t ? '#f59e0b' : 'rgba(255,255,255,0.07)', color: clanType === t ? '#000' : '#94a3b8' }}>
                {t === 'open' ? '🌐 Ouvert' : '🔒 Sur invitation'}
              </button>
            ))}
          </div>
        </div>
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <button
          onClick={createClan}
          disabled={saving}
          className="py-3 rounded-2xl font-black text-black text-base"
          style={{ background: saving ? '#78716c' : '#f59e0b' }}>
          {saving ? 'Création…' : 'Créer le clan'}
        </button>
      </div>
    </div>
  );

  if (view === 'browse') return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-slate-950" style={{ height: '100dvh' }}>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700 shrink-0">
        <button onClick={() => setView('none')} className="text-slate-400 hover:text-white text-2xl px-1">←</button>
        <h2 className="text-white font-black text-xl">Rejoindre un clan</h2>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {clans.length === 0 && <p className="text-slate-500 text-sm text-center py-10">Aucun clan pour l'instant.</p>}
        {clans.map(c => (
          <div key={c.id} className="flex items-center gap-3 bg-slate-800/50 rounded-2xl px-4 py-3 border border-slate-700/40">
            <div className="text-3xl shrink-0">{c.emblem}</div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-black text-sm">{c.name}</div>
              {c.description && <div className="text-slate-400 text-xs truncate">{c.description}</div>}
              <div className="text-xs text-slate-500 mt-0.5">{c.type === 'open' ? '🌐 Ouvert' : '🔒 Invitation'}</div>
            </div>
            {c.type === 'open' && (
              <button
                onClick={() => joinClan(c.id)}
                disabled={saving}
                className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-black"
                style={{ background: '#f59e0b', color: '#000' }}>
                Rejoindre
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  if (view === 'none') return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-slate-950" style={{ height: '100dvh' }}>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700 shrink-0">
        <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl px-1">←</button>
        <h2 className="text-white font-black text-xl">🛡️ Clans</h2>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8">
        <div className="text-6xl">🛡️</div>
        <p className="text-slate-400 text-sm text-center">Tu n'appartiens à aucun clan.<br />Crée le tien ou rejoins-en un !</p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={() => setView('create')}
            className="py-3 rounded-2xl font-black text-black text-base"
            style={{ background: '#f59e0b' }}>
            ⚔️ Créer un clan
          </button>
          <button
            onClick={loadBrowse}
            className="py-3 rounded-2xl font-black text-sm"
            style={{ background: 'rgba(255,255,255,0.08)', color: '#94a3b8' }}>
            🔍 Parcourir les clans
          </button>
        </div>
      </div>
    </div>
  );

  // view === 'mine'
  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-slate-950" style={{ height: '100dvh' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700 shrink-0">
        <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl px-1">←</button>
        <div className="text-2xl">{myClan?.emblem}</div>
        <div className="flex-1 min-w-0">
          <h2 className="text-white font-black text-xl truncate">{myClan?.name}</h2>
          <p className="text-slate-400 text-xs">{members.length} membres · {roleLabel[myRole]}</p>
        </div>
        <button onClick={leaveClan} className="text-slate-500 hover:text-red-400 text-xs px-2 py-1 rounded-lg border border-slate-700">
          Quitter
        </button>
      </div>

      {/* Members */}
      <div className="shrink-0 px-4 py-3 border-b border-slate-700/50">
        <p className="text-slate-400 text-xs font-bold mb-2">Membres</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {members.map(m => (
            <div key={m.user_id} className="shrink-0 flex flex-col items-center gap-1">
              <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-sm font-black text-white">
                {m.username[0]?.toUpperCase()}
              </div>
              <div className="text-xs text-slate-400 truncate max-w-[56px]">{m.username}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
        {chat.length === 0 && (
          <p className="text-slate-600 text-sm text-center py-8">Soyez les premiers à écrire !</p>
        )}
        {chat.map(msg => {
          const isMe = msg.user_id === userId;
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              {!isMe && <span className="text-xs text-slate-500 mb-0.5 px-1">{msg.username}</span>}
              <div
                className="rounded-2xl px-3 py-1.5 max-w-[75%] text-sm"
                style={{ background: isMe ? '#f59e0b' : 'rgba(255,255,255,0.09)', color: isMe ? '#000' : '#e2e8f0' }}>
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 flex gap-2 px-4 py-3 border-t border-slate-700 pb-safe" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <input
          className="flex-1 bg-slate-800 text-white rounded-2xl px-4 py-2 border border-slate-700 focus:border-yellow-500 outline-none" style={{ fontSize: 16 }}
          placeholder="Message…"
          value={msgText}
          onChange={e => setMsgText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          maxLength={300}
        />
        <button
          onClick={sendMessage}
          disabled={!msgText.trim()}
          className="w-10 h-10 rounded-2xl flex items-center justify-center font-black"
          style={{ background: msgText.trim() ? '#f59e0b' : 'rgba(255,255,255,0.07)', color: msgText.trim() ? '#000' : '#475569' }}>
          ➤
        </button>
      </div>
    </div>
  );
}
