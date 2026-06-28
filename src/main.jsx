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
  const axis = useMemo(() => {
    if (!history.length) return null;

    const values = history.map(row => Number(mode === 'rank' ? row.rank_position : row.rating_score));
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);

    if (mode === 'rank') {
      return {
        top: `#${Math.round(minValue)}`,
        middle: `#${Math.round((minValue + maxValue) / 2)}`,
        bottom: `#${Math.round(maxValue)}`,
        title: 'Rank',
      };
    }

    return {
      top: formatScore(maxValue),
      middle: formatScore((minValue + maxValue) / 2),
      bottom: formatScore(minValue),
      title: 'Score',
    };
  }, [history, mode]);

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
      const x = 60 + ((dates[index] - minDate) / rangeDate) * 216;
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
        <line x1="60" y1="18" x2="60" y2="122" />
        <line x1="60" y1="122" x2="276" y2="122" />
        {axis && (
          <>
            <text className="axisLabel" x="54" y="21" textAnchor="end">{axis.top}</text>
            <text className="axisLabel" x="54" y="73" textAnchor="end">{axis.middle}</text>
            <text className="axisLabel" x="54" y="125" textAnchor="end">{axis.bottom}</text>
          </>
        )}
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
      <header className="topBar"><h1>Who wins in their prime?</h1><button onClick={loadPair}>Skip</button></header>
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
  ['alive', 'Alive'],
  ['dead', 'Dead'],
  ['swordsman', 'Swordsmen'],
  ['devil_fruit_user', 'Devil Fruit'],
  ['paramecia', 'Paramecia'],
  ['logia', 'Logia'],
  ['zoan', 'Zoan'],
  ['haki_user', 'Haki'],
  ['female', 'Women'],
  ['male', 'Men']
];

function primaryAffiliation(character) {
  if (!Array.isArray(character.affiliations)) return null;
  const cleanAffiliations = character.affiliations
    .map(item => String(item || '').trim())
    .filter(Boolean);

  for (const affiliation of cleanAffiliations) {
    const teamName = normalizeTeamName(affiliation);
    if (teamName) return teamName;
  }

  return null;
}

function normalizeTeamName(affiliation) {
  const value = String(affiliation || '').trim();
  const lower = value.toLowerCase();

  if (lower.includes('sword') && lower.includes('marine')) return 'Marines (SWORD)';
  if (lower.includes('marine')) return 'Marines';
  if (lower.includes('giant warrior pirates')) return 'Giant Warrior Pirates';
  if (lower.includes('mokomo dukedom')) return 'Mokomo Dukedom';
  if (lower.includes('inuarashi musketeer squad')) return 'Mokomo Dukedom';

  const ignored = ['alliance', 'disbanded', 'defected', 'former', 'semi-retired', 'retired', 'unaffiliated', 'clan of d'];
  if (ignored.some(term => lower.includes(term))) return null;

  if (lower.includes('revolutionary army')) return 'Revolutionary Army';
  if (lower.includes('beasts pirates')) return 'Beasts Pirates';
  if (lower.includes('new fish-man pirates')) return 'New Fish-Man Pirates';
  if (lower.includes('roger pirates')) return 'Roger Pirates';
  if (lower === 'roger') return 'Roger Pirates';
  if (lower.includes('straw hat pirates')) return 'Straw Hat Pirates';
  if (lower.includes('whitebeard pirates')) return 'Whitebeard Pirates';
  if (lower.includes('giant warrior pirates')) return 'Giant Warrior Pirates';
  if (lower.includes('arabasta kingdom')) return 'Arabasta Kingdom';
  if (lower.includes('baroque works')) return 'Baroque Works';
  if (lower.includes('galley-la company')) return 'Galley-La Company';
  if (lower.includes('takoyaki 8')) return 'Takoyaki 8';
  if (lower.includes('mermaid cafe') || lower.includes('mermaid café')) return 'Mermaid Cafe';

  return value
    .replace(/\s*\((?:former|semi-retired|retired|disbanded)\)\s*/gi, '')
    .replace(/\s+/g, ' ')
    .trim() || null;
}

function buildTeamRankings(characters) {
  const teams = new Map();

  for (const character of characters) {
    const name = primaryAffiliation(character);
    if (!name) continue;
    const team = teams.get(name) || {
      name,
      totalScore: 0,
      averageScore: 0,
      members: [],
    };

    team.members.push(character);
    team.totalScore += Number(character.rating_score || 0);
    teams.set(name, team);
  }

  return [...teams.values()]
    .map(team => ({
      ...team,
      averageScore: team.members.length ? team.totalScore / team.members.length : 0,
      members: team.members.sort((a, b) => Number(b.rating_score || 0) - Number(a.rating_score || 0)),
    }))
    .filter(team => team.members.length > 0);
}

function Rankings() {
  const [filters, setFilters] = useState([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showTeams, setShowTeams] = useState(false);
  const [rows, setRows] = useState([]);
  const [allRows, setAllRows] = useState([]);
  const [modalCharacter, setModalCharacter] = useState(null);
  const [modalTeam, setModalTeam] = useState(null);

  useEffect(() => {
    supabase
      .from('character_rankings')
      .select('*')
      .order('rating_score', { ascending: false })
      .limit(1000)
      .then(({ data }) => setAllRows(data || []));
  }, []);

  useEffect(() => {
    let q = supabase
      .from('character_rankings')
      .select('*')
      .order('rating_score', { ascending: false })
      .limit(500);

    const showAlive = filters.includes('alive');
    const showDead = filters.includes('dead');
    if (showAlive && showDead) q = q.in('status', ['Alive', 'Deceased']);
    else if (showAlive) q = q.eq('status', 'Alive');
    else if (showDead) q = q.eq('status', 'Deceased');
    if (filters.includes('swordsman')) q = q.eq('swordsman', true);
    if (filters.includes('devil_fruit_user')) q = q.eq('devil_fruit_user', true);
    if (filters.includes('paramecia')) q = q.eq('devil_fruit_type', 'Paramecia');
    if (filters.includes('logia')) q = q.eq('devil_fruit_type', 'Logia');
    if (filters.includes('zoan')) q = q.ilike('devil_fruit_type', '%Zoan%');
    if (filters.includes('haki_user')) q = q.eq('haki_user', true);
    if (filters.includes('female')) q = q.ilike('gender', 'Female');
    if (filters.includes('male')) q = q.ilike('gender', 'Male');

    q.then(({ data }) => setRows(data || []));
  }, [filters]);

  function toggleFilter(id) {
    setFilters(current => current.includes(id)
      ? current.filter(item => item !== id)
      : [...current, id]);
  }

  const teamRankings = useMemo(() => buildTeamRankings(allRows.length ? allRows : rows), [allRows, rows]);
  const totalTeams = useMemo(
    () => [...teamRankings].sort((a, b) => b.totalScore - a.totalScore),
    [teamRankings]
  );
  const averageTeams = useMemo(
    () => [...teamRankings].sort((a, b) => b.averageScore - a.averageScore),
    [teamRankings]
  );

  function renderTeamColumn(title, teams, scoreKey, scoreLabel) {
    return (
      <section className="teamColumn">
        <h2>{title}</h2>
        <div className="teamList">
          {teams.map((team, index) => (
            <article className="teamRow" key={`${scoreKey}-${team.name}`}>
              <strong className="teamRank">{index + 1}</strong>
              <div className="teamDetails">
                <span className="teamName">{team.name}</span>
                <small>{scoreLabel} {formatScore(team[scoreKey])} · {team.members.length} members</small>
              </div>
              <button
                className="teamInfo"
                onClick={() => setModalTeam({ ...team, scoreLabel, score: team[scoreKey] })}
                aria-label={`Show ${team.name} members`}
              >
                i
              </button>
            </article>
          ))}
        </div>
      </section>
    );
  }

  return (
    <main className="rankPage">
      <h1>Live Strength Ranking</h1>

      <div className="rankingTools">
        <div className="filterMenuWrap">
          <button className={`filterMenuButton ${filtersOpen ? 'active' : ''}`} onClick={() => setFiltersOpen(open => !open)}>
            Filters{filters.length ? ` (${filters.length})` : ''}
          </button>
          {filtersOpen && (
            <div className="filterMenu">
              <label className="filterOption">
                <input type="checkbox" checked={!filters.length} onChange={() => setFilters([])} />
                All characters
              </label>
              {FILTERS.map(([id, label]) => (
                <label className="filterOption" key={id}>
                  <input type="checkbox" checked={filters.includes(id)} onChange={() => toggleFilter(id)} />
                  {label}
                </label>
              ))}
            </div>
          )}
        </div>

        <button className={`filterMenuButton ${!showTeams ? 'active' : ''}`} onClick={() => setShowTeams(false)}>
          Individual Ranking
        </button>

        <button className={`filterMenuButton ${showTeams ? 'active' : ''}`} onClick={() => setShowTeams(value => !value)}>
          Team Rankings
        </button>
      </div>

      {showTeams ? (
        <div className="teamRankingsGrid">
          {renderTeamColumn('Total Team Ranking', totalTeams, 'totalScore', 'Total')}
          {renderTeamColumn('Average Team Ranking', averageTeams, 'averageScore', 'Average')}
        </div>
      ) : (
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
              <span className="rankName">{c.name}</span>
              <small className="rankScore">Score {formatScore(c.rating_score)} · {c.wins}W/{c.losses}L · +/-{formatScore(c.rating_sigma)}</small>
            </div>
            <button
              className="rankInfo"
              onClick={() => setModalCharacter(c)}
              aria-label={`Info about ${c.name}`}
            >
              i
            </button>
          </div>
        ))}
      </div>
      )}

      <InfoModal
        character={modalCharacter}
        onClose={() => setModalCharacter(null)}
      />
      <TeamModal team={modalTeam} onClose={() => setModalTeam(null)} />
    </main>
  );
}

function TeamModal({ team, onClose }) {
  if (!team) return null;

  return (
    <div className="modalBackdrop" onClick={onClose}>
      <div className="modal teamModal" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose}>x</button>
        <h1>{team.name}</h1>
        <p className="teamModalSummary">
          {team.scoreLabel} {formatScore(team.score)} · {team.members.length} members
        </p>
        <div className="teamMemberList">
          {team.members.map((member, index) => (
            <div className="teamMemberRow" key={member.id}>
              <strong>{index + 1}</strong>
              {member.image_url ? <img src={member.image_url} alt="" /> : <div className="rankAvatar">?</div>}
              <div>
                <span>{member.name}</span>
                <small>Score {formatScore(member.rating_score)}</small>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AccountModal({ user, profile, onClose, onOpenStats }) {
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
            <p className="modalBio"><strong>Username:</strong> {profile?.username || user.user_metadata?.username || 'Unknown'}</p>
            <p className="muted"><strong>Email:</strong> {user.email}</p>
            <button className="accountSubmit" onClick={onOpenStats}>Stats</button>
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

function AccountStats({ user, profile, onBack }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    const voterKey = getVoterKey(user);

    Promise.all([
      supabase
        .from('voter_reliability')
        .select('*')
        .eq('voter_key', voterKey)
        .maybeSingle(),
      supabase
        .from('votes')
        .select('id,created_at,winner_expected_probability', { count: 'exact' })
        .eq('voter_session_id', voterKey)
        .order('created_at', { ascending: false })
        .limit(1),
    ]).then(([reliabilityResult, votesResult]) => {
      setStats({
        reliability: reliabilityResult.data,
        voteCount: votesResult.count || 0,
        lastVoteAt: votesResult.data?.[0]?.created_at || null,
      });
    });
  }, [user?.id]);

  if (!user) {
    return (
      <main className="rankPage statsPage">
        <h1>Account Stats</h1>
        <button className="accountSubmit" onClick={onBack}>Sign in</button>
      </main>
    );
  }

  const reliability = stats?.reliability;

  return (
    <main className="rankPage statsPage">
      <h1>Account Stats</h1>
      <div className="statsCards">
        <div className="statsCard">
          <span>Username</span>
          <strong>{profile?.username || user.user_metadata?.username || 'Unknown'}</strong>
        </div>
        <div className="statsCard">
          <span>Email</span>
          <strong>{user.email}</strong>
        </div>
        <div className="statsCard">
          <span>Votes</span>
          <strong>{stats?.voteCount ?? '...'}</strong>
        </div>
        <div className="statsCard">
          <span>Reliability</span>
          <strong>{reliability ? `${Math.round(Number(reliability.reliability) * 100)}%` : '100%'}</strong>
        </div>
        <div className="statsCard">
          <span>Quick votes</span>
          <strong>{reliability?.quick_votes ?? 0}</strong>
        </div>
        <div className="statsCard">
          <span>Outlier votes</span>
          <strong>{reliability?.outlier_votes ?? 0}</strong>
        </div>
      </div>
      <button className="accountSubmit" onClick={onBack}>Back to vote</button>
    </main>
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
          className={accountOpen || page === 'stats' ? 'active' : ''}
          onClick={() => setAccountOpen(true)}
        >
          Account
        </button>
      </nav>

      {page === 'vote' && <VoteMode user={user} onOpenAccount={() => setAccountOpen(true)} />}
      {page === 'rankings' && <Rankings />}
      {page === 'stats' && <AccountStats user={user} profile={profile} onBack={() => setPage('vote')} />}
      {accountOpen && (
        <AccountModal
          user={user}
          profile={profile}
          onClose={() => setAccountOpen(false)}
          onOpenStats={() => {
            setAccountOpen(false);
            setPage('stats');
          }}
        />
      )}
    </>
  );
}

createRoot(document.getElementById('root')).render(<App />);
