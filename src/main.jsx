import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase } from './lib/supabase';
import './styles.css';

function titleCase(value) {
  if (!value) return '';
  const lower = String(value).toLowerCase();
  if (lower === 'male') return 'Man';
  if (lower === 'female') return 'Woman';
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function formatBounty(character) {
  if (!character?.bounty) return 'Unknown';

  const amount = Number(character.bounty).toLocaleString();

  if (character.bounty_type === 'Cross Guild') {
    const symbol = character.bounty_symbol === 'crown' ? '\u265B' : '\u2605';
    const rank = character.bounty_rank || 1;
    return `${symbol.repeat(rank)} \u0E3F${amount}`;
  }

  return `\u0E3F${amount}`;
}

function tagList(c, options = {}) {
  const { showGender = false } = options;
  const tags = [];

  if (c.swordsman) tags.push('Swordsman');
  if (c.devil_fruit_user) tags.push('Devil Fruit');
  if (c.devil_fruit_type) tags.push(c.devil_fruit_type);
  if (c.haki_user) tags.push('Haki');
  if (showGender && c.gender) tags.push(c.gender);
  if (c.status) tags.push(c.status);
  if (c.affiliations?.length) tags.push(...c.affiliations.slice(0, 2));

  return tags;
}

function fallbackStrength(character) {
  const bits = [];
  if (character.devil_fruit_name) bits.push(character.devil_fruit_english_name || character.devil_fruit_name);
  if (character.haki_types?.length) bits.push(`${character.haki_types[0]} Haki`);
  if (character.swordsman) bits.push('Swordsmanship');
  if (!bits.length && character.race) bits.push(character.race);
  return bits.slice(0, 2).join(', ') || 'Unknown';
}

function fallbackWeakness(character) {
  if (!character.devil_fruit_user) return 'No known fruit boost';
  if (character.affiliations?.length === 1) return 'Limited support';
  return 'Sea weakness';
}

function fallbackMove(character) {
  if (character.devil_fruit_name) return character.devil_fruit_english_name || character.devil_fruit_name;
  if (character.swordsman) return 'Sword attack';
  if (character.haki_user) return 'Haki attack';
  return 'Unknown';
}

function combatFacts(character) {
  return {
    strength: character.strength_summary || fallbackStrength(character),
    weakness: character.weakness_summary || fallbackWeakness(character),
    signature: character.signature_move || fallbackMove(character),
  };
}

function getVoterKey(user) {
  if (user?.id) return `account:${user.id}`;

  const storageKey = 'onePieceStrengthVoterId';
  try {
    const existing = localStorage.getItem(storageKey);
    if (existing) return `anon:${existing}`;

    const id = crypto.randomUUID ? crypto.randomUUID() : `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(storageKey, id);
    return `anon:${id}`;
  } catch {
    return `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

function formatScore(value) {
  return Number(value ?? 0).toFixed(1);
}

function formatConfidence(sigma) {
  const uncertainty = Number(sigma ?? 350);
  if (uncertainty <= 80) return 'Very high';
  if (uncertainty <= 140) return 'High';
  if (uncertainty <= 230) return 'Building';
  return 'Low';
}

function CharacterCard({ character, side, selectedState, onSelect, onInfo }) {
  const facts = character ? combatFacts(character) : null;

  return (
    <button className={`card ${side} ${selectedState || ''}`} onClick={onSelect} disabled={!character}>
      {character ? (
        <>
          <button className="info" onClick={(e) => { e.stopPropagation(); onInfo(character); }}>i</button>
          <div className="imageWrap">
            {character.image_url ? <img src={character.image_url} alt={character.name} /> : <div className="placeholder">?</div>}
          </div>
          <div className="cardText">
            <h2>{character.name}</h2>
            <div className="combatFacts">
              <p><strong>Strength:</strong> {facts.strength}</p>
              <p><strong>Weakness:</strong> {facts.weakness}</p>
              <p><strong>Signature:</strong> {facts.signature}</p>
            </div>
          </div>
        </>
      ) : <div className="loading">Loading...</div>}
    </button>
  );
}

function TimelineChart({ history, mode }) {
  const points = useMemo(() => {
    if (!history.length) return [];

    const values = history.map(row => Number(mode === 'rank' ? row.rank_position : row.rating_score));
    const dates = history.map(row => new Date(row.created_at).getTime());
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const rangeDate = Math.max(1, maxDate - minDate);
    const rangeValue = Math.max(1, maxValue - minValue);

    return history.map((row, index) => {
      const value = values[index];
      const x = 24 + ((dates[index] - minDate) / rangeDate) * 252;
      const normalized = (value - minValue) / rangeValue;
      const y = mode === 'rank' ? 18 + normalized * 104 : 122 - normalized * 104;
      return { x, y, row };
    });
  }, [history, mode]);

  if (!history.length) {
    return <p className="timelineEmpty">No rating snapshots yet. The next vote involving this character will start the timeline.</p>;
  }

  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
  const first = history[0];
  const last = history[history.length - 1];

  return (
    <div className="timelineChart">
      <svg viewBox="0 0 300 150" role="img" aria-label={`${mode === 'rank' ? 'Rank' : 'Rating score'} history`}>
        <line x1="24" y1="18" x2="24" y2="122" />
        <line x1="24" y1="122" x2="276" y2="122" />
        <path d={path} />
        {points.map((point, index) => (
          <circle key={`${point.row.created_at}-${index}`} cx={point.x} cy={point.y} r="3.5" />
        ))}
      </svg>
      <div className="timelineLabels">
        <span>{new Date(first.created_at).toLocaleDateString()}</span>
        <span>{mode === 'rank' ? `Rank #${last.rank_position}` : `Score ${formatScore(last.rating_score)}`}</span>
        <span>{new Date(last.created_at).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

function InfoModal({ character, onClose }) {
  const [activeTab, setActiveTab] = useState('info');
  const [timelineMode, setTimelineMode] = useState('score');
  const [history, setHistory] = useState([]);
  const [ranking, setRanking] = useState(null);

  useEffect(() => {
    if (!character?.id) return;

    setActiveTab('info');
    setTimelineMode('score');
    setHistory([]);
    setRanking(null);

    supabase
      .from('character_rankings')
      .select('*')
      .eq('id', character.id)
      .maybeSingle()
      .then(({ data }) => setRanking(data || null));

    supabase
      .from('rating_history')
      .select('rating_mu,rating_sigma,rating_score,rank_position,wins,losses,comparisons,created_at')
      .eq('character_id', character.id)
      .order('created_at', { ascending: true })
      .limit(200)
      .then(({ data }) => setHistory(data || []));
  }, [character?.id]);

  if (!character) return null;

  const stats = ranking || character;
  const peakRank = history.length
    ? Math.min(...history.map(row => row.rank_position), stats.rank_position || Infinity)
    : stats.rank_position;
  const lowestRank = history.length
    ? Math.max(...history.map(row => row.rank_position), stats.rank_position || 0)
    : stats.rank_position;
  const totalVotes = Number(stats.comparisons || 0);
  const winRate = totalVotes ? `${Math.round((Number(stats.wins || 0) / totalVotes) * 100)}%` : 'No votes yet';

  return (
    <div className="modalBackdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose}>x</button>
        <div className="modalTop">
          {character.image_url && (
            <img className="modalImage" src={character.image_url} alt={character.name} />
          )}

          <div className="modalTitleBlock">
            <h1>{character.name}</h1>
          </div>
        </div>

        <div className="modalTags">
          {tagList(character).map(t => <span key={t}>{t}</span>)}
        </div>

        <div className="modalTabs">
          {['info', 'stats', 'timeline'].map(tab => (
            <button
              key={tab}
              className={activeTab === tab ? 'active' : ''}
              onClick={() => setActiveTab(tab)}
            >
              {titleCase(tab)}
            </button>
          ))}
        </div>

        {activeTab === 'info' && (
          <>
            <p className="modalBio">{character.description || 'No description synced yet.'}</p>

            <dl>
              <dt>Status</dt>
              <dd>{character.status || 'Unknown'}</dd>

              <dt>Devil Fruit</dt>
              <dd>
                {character.devil_fruit_name ? (
                  <>
                    <div>{character.devil_fruit_name}</div>
                    {character.devil_fruit_english_name ? (
                      <div className="muted">{character.devil_fruit_english_name}</div>
                    ) : null}
                  </>
                ) : character.devil_fruit_user ? (
                  'Known Devil Fruit user'
                ) : (
                  'Unknown / none'
                )}
              </dd>

              <dt>Fruit Type</dt>
              <dd>{character.devil_fruit_type || 'Unknown / none'}</dd>

              <dt>Haki</dt>
              <dd>
                {character.haki_types?.length
                  ? character.haki_types.join(', ')
                  : 'Unknown / none'}
              </dd>

              <dt>{character.status === 'Deceased' ? 'Last Bounty' : 'Bounty'}</dt>
              <dd>{character.bounty ? <div className="character-bounty">{formatBounty(character)}</div> : 'Unknown / none'}</dd>

              <dt>Race</dt>
              <dd>{character.race || 'Unknown'}</dd>
            </dl>
            {character.wiki_url && <a className="wikiLink" href={character.wiki_url} target="_blank" rel="noreferrer">Open full wiki page</a>}
          </>
        )}

        {activeTab === 'stats' && (
          <dl className="statsGrid">
            <dt>Current Rank</dt>
            <dd>{stats.rank_position ? `#${stats.rank_position}` : 'Unranked'}</dd>

            <dt>Peak Rank</dt>
            <dd>{peakRank && Number.isFinite(peakRank) ? `#${peakRank}` : 'Unranked'}</dd>

            <dt>Lowest Rank</dt>
            <dd>{lowestRank ? `#${lowestRank}` : 'Unranked'}</dd>

            <dt>Record</dt>
            <dd>{stats.wins || 0}W / {stats.losses || 0}L</dd>

            <dt>Comparisons</dt>
            <dd>{stats.comparisons || 0}</dd>

            <dt>Win Rate</dt>
            <dd>{winRate}</dd>

            <dt>Rating Score</dt>
            <dd>{formatScore(stats.rating_score)}</dd>

            <dt>Estimated Strength</dt>
            <dd>{formatScore(stats.rating_mu)}</dd>

            <dt>Uncertainty</dt>
            <dd>{formatScore(stats.rating_sigma)} <span className="muted">({formatConfidence(stats.rating_sigma)} confidence)</span></dd>
          </dl>
        )}

        {activeTab === 'timeline' && (
          <div className="timelinePanel">
            <div className="timelineControls">
              <button className={timelineMode === 'score' ? 'active' : ''} onClick={() => setTimelineMode('score')}>Score</button>
              <button className={timelineMode === 'rank' ? 'active' : ''} onClick={() => setTimelineMode('rank')}>Rank</button>
            </div>
            <TimelineChart history={history} mode={timelineMode} />
          </div>
        )}
      </div>
    </div>
  );
}

function VoteMode({ user, onOpenAccount }) {
  const [pair, setPair] = useState(null);
  const [modalCharacter, setModalCharacter] = useState(null);
  const [message, setMessage] = useState('');
  const [selectedSide, setSelectedSide] = useState(null);
  const [pairLoadedAt, setPairLoadedAt] = useState(Date.now());
  const [submitting, setSubmitting] = useState(false);

  async function loadPair() {
    setMessage('');
    setSelectedSide(null);
    const { data, error } = await supabase.rpc('get_random_pair');
    if (error) setMessage(error.message);
    else {
      setPair(data?.[0] || null);
      setPairLoadedAt(Date.now());
    }
  }

  useEffect(() => { loadPair(); }, []);

  const left = pair?.left_character;
  const right = pair?.right_character;

  async function vote() {
    if (!user) {
      onOpenAccount();
      return;
    }

    const winner = selectedSide === 'left' ? left : right;
    const loser = selectedSide === 'left' ? right : left;
    if (!winner || !loser || submitting) return;

    setSubmitting(true);
    const { error } = await supabase.rpc('submit_vote', {
      winner_id: winner.id,
      loser_id: loser.id,
      voter_key: getVoterKey(user),
      vote_latency_ms: Date.now() - pairLoadedAt,
      selected_side: selectedSide,
    });
    setSubmitting(false);

    if (error) setMessage(error.message);
    else loadPair();
  }

  return (
    <main className="votePage">
      <header className="topBar"><h1>Who wins in a serious 1v1?</h1><button onClick={loadPair}>Skip</button></header>
      {message && <p className="error">{message}</p>}
      {!user && (
        <button className="accountGate" onClick={onOpenAccount}>
          Create an account to vote
        </button>
      )}
      <section className="versus">
        <CharacterCard
          character={left}
          side="left"
          selectedState={selectedSide === 'left' ? 'selected' : selectedSide ? 'dimmed' : ''}
          onSelect={() => user ? setSelectedSide('left') : onOpenAccount()}
          onInfo={setModalCharacter}
        />
        <button className={`vs ${selectedSide ? 'confirm' : ''}`} onClick={vote} disabled={!selectedSide || submitting}>
          {selectedSide ? (submitting ? 'Saving' : 'Confirm') : 'VS'}
        </button>
        <CharacterCard
          character={right}
          side="right"
          selectedState={selectedSide === 'right' ? 'selected' : selectedSide ? 'dimmed' : ''}
          onSelect={() => user ? setSelectedSide('right') : onOpenAccount()}
          onInfo={setModalCharacter}
        />
      </section>
      <InfoModal character={modalCharacter} onClose={() => setModalCharacter(null)} />
    </main>
  );
}

const FILTERS = [
  ['all', 'All'],
  ['alive', 'Alive'],
  ['swordsman', 'Swordsmen'],
  ['devil_fruit_user', 'Devil Fruit'],
  ['paramecia', 'Paramecia'],
  ['logia', 'Logia'],
  ['zoan', 'Zoan'],
  ['haki_user', 'Haki'],
  ['female', 'Women'],
  ['male', 'Men']
];

function Rankings() {
  const [filter, setFilter] = useState('all');
  const [rows, setRows] = useState([]);
  const [modalCharacter, setModalCharacter] = useState(null);

  useEffect(() => {
    let q = supabase
      .from('character_rankings')
      .select('*')
      .order('rating_score', { ascending: false })
      .limit(500);

    if (filter === 'alive') q = q.eq('status', 'Alive');
    if (filter === 'swordsman') q = q.eq('swordsman', true);
    if (filter === 'devil_fruit_user') q = q.eq('devil_fruit_user', true);
    if (filter === 'paramecia') q = q.eq('devil_fruit_type', 'Paramecia');
    if (filter === 'logia') q = q.eq('devil_fruit_type', 'Logia');
    if (filter === 'zoan') q = q.ilike('devil_fruit_type', '%Zoan%');
    if (filter === 'haki_user') q = q.eq('haki_user', true);
    if (filter === 'female') q = q.ilike('gender', 'Female');
    if (filter === 'male') q = q.ilike('gender', 'Male');

    q.then(({ data }) => setRows(data || []));
  }, [filter]);

  return (
    <main className="rankPage">
      <h1>Live Strength Ranking</h1>

      <div className="filters">
        {FILTERS.map(([id, label]) => (
          <button
            className={filter === id ? 'active' : ''}
            onClick={() => setFilter(id)}
            key={id}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="rankList">
        {rows.map((c, i) => (
          <div className="rankRow" key={c.id}>
            <strong className="rankNumber">{i + 1}</strong>

            {c.image_url ? (
              <img src={c.image_url} alt="" />
            ) : (
              <div className="rankAvatar">?</div>
            )}

            <div className="rankNameBlock">
              <div className="rankNameLine">
                <span className="rankName">{c.name}</span>
                <button
                  className="rankInfo"
                  onClick={() => setModalCharacter(c)}
                  aria-label={`Info about ${c.name}`}
                >
                  i
                </button>
              </div>
              <small>Score {formatScore(c.rating_score)} - {c.wins}W/{c.losses}L - +/-{formatScore(c.rating_sigma)}</small>
            </div>
          </div>
        ))}
      </div>

      <InfoModal
        character={modalCharacter}
        onClose={() => setModalCharacter(null)}
      />
    </main>
  );
}

function AccountModal({ user, profile, onClose }) {
  const [mode, setMode] = useState('signin');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const cleanUsername = username.trim();

    if (mode === 'signup' && cleanUsername.length < 3) {
      setBusy(false);
      setMessage('Choose a username with at least 3 characters.');
      return;
    }

    const authCall = mode === 'signup'
      ? supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username: cleanUsername },
            emailRedirectTo: window.location.origin,
          },
        })
      : supabase.auth.signInWithPassword({ email, password });

    const { error } = await authCall;
    setBusy(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(mode === 'signup' ? 'Check your email to finish creating the account.' : 'Signed in.');
    if (mode === 'signin') onClose();
  }

  async function signOut() {
    setBusy(true);
    await supabase.auth.signOut();
    setBusy(false);
    onClose();
  }

  return (
    <div className="modalBackdrop" onClick={onClose}>
      <div className="modal accountModal" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose}>x</button>
        <h1>Account</h1>

        {user ? (
          <div className="accountPanel">
            <p className="modalBio">{profile?.username || user.user_metadata?.username || user.email}</p>
            <p className="muted">{user.email}</p>
            <button className="accountSubmit" onClick={signOut} disabled={busy}>Sign out</button>
          </div>
        ) : (
          <>
            <div className="modalTabs">
              <button className={mode === 'signin' ? 'active' : ''} onClick={() => setMode('signin')}>Sign in</button>
              <button className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>Create</button>
            </div>

            <form className="accountForm" onSubmit={submit}>
              {mode === 'signup' && (
                <label>
                  Username
                  <input value={username} onChange={(event) => setUsername(event.target.value)} minLength="3" maxLength="24" required />
                </label>
              )}

              <label>
                Email
                <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
              </label>

              <label>
                Password
                <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" minLength="6" required />
              </label>

              <button className="accountSubmit" disabled={busy}>{busy ? 'Saving' : mode === 'signup' ? 'Create account' : 'Sign in'}</button>
            </form>
          </>
        )}

        {message && <p className="error">{message}</p>}
      </div>
    </div>
  );
}

function App() {
  const [page, setPage] = useState('vote');
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [accountOpen, setAccountOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const user = session?.user || null;

  useEffect(() => {
    if (!user?.id) {
      setProfile(null);
      return;
    }

    supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data || null));
  }, [user?.id]);

  return (
    <>
      <nav>
        <button
          className={page === 'vote' ? 'active' : ''}
          onClick={() => setPage('vote')}
        >
          Vote
        </button>

        <button
          className={page === 'rankings' ? 'active' : ''}
          onClick={() => setPage('rankings')}
        >
          Rankings
        </button>

        <button
          className={accountOpen ? 'active' : ''}
          onClick={() => setAccountOpen(true)}
        >
          {profile?.username || 'Account'}
        </button>
      </nav>

      {page === 'vote' ? <VoteMode user={user} onOpenAccount={() => setAccountOpen(true)} /> : <Rankings />}
      {accountOpen && <AccountModal user={user} profile={profile} onClose={() => setAccountOpen(false)} />}
    </>
  );
}

createRoot(document.getElementById('root')).render(<App />);
