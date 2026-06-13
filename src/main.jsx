// import React, { useEffect, useState } from 'react';
// import { createRoot } from 'react-dom/client';
// import { supabase } from './lib/supabase';
// import './styles.css';

// function tagList(c) {
//   const tags = [];
//   if (c.swordsman) tags.push('Swordsman');
//   if (c.devil_fruit_user) tags.push('Devil Fruit');
//   if (c.haki_user) tags.push('Haki');
//   if (c.gender) tags.push(c.gender);
//   if (c.status) tags.push(c.status);
//   if (c.affiliations?.length) tags.push(...c.affiliations.slice(0, 2));
//   return tags;
// }

// function CharacterCard({ character, side, onVote, onInfo }) {
//   return (
//     <button className={`card ${side}`} onClick={onVote} disabled={!character}>
//       {character ? (
//         <>
//           <button className="info" onClick={(e) => { e.stopPropagation(); onInfo(character); }}>i</button>
//           <div className="imageWrap">
//             {character.image_url ? <img src={character.image_url} alt={character.name} /> : <div className="placeholder">?</div>}
//           </div>
//           <div className="cardText">
//             <h2>{character.name}</h2>
//             <div className="tags">{tagList(character).map(t => <span key={t}>{t}</span>)}</div>
//           </div>
//         </>
//       ) : <div className="loading">Loading...</div>}
//     </button>
//   );
// }

// function InfoModal({ character, onClose }) {
//   if (!character) return null;
//   return (
//     <div className="modalBackdrop" onClick={onClose}>
//       <div className="modal" onClick={(e) => e.stopPropagation()}>
//         <button className="close" onClick={onClose}>×</button>
//         <div className="modalTop">
//           {character.image_url && <img src={character.image_url} alt={character.name} />}
//           <div>
//             <h1>{character.name}</h1>
//             <div className="tags">{tagList(character).map(t => <span key={t}>{t}</span>)}</div>
//           </div>
//         </div>
//         <p>{character.description || 'No description synced yet.'}</p>
//         <dl>
//           <dt>Status</dt>
//           <dd>{character.status || 'Unknown'}</dd>

//           <dt>Devil Fruit</dt>
//           <dd>
//             {character.devil_fruit_name
//               ? (
//                 <>
//                   {character.devil_fruit_name}

//                   {character.devil_fruit_english_name
//                     ? <><br /><span className="muted">{character.devil_fruit_english_name}</span></>
//                     : null}

//                   {character.devil_fruit_type
//                     ? <><br /><span className="muted">Type: {character.devil_fruit_type}</span></>
//                     : null}
//                 </>
//               )
//               : character.devil_fruit_user
//                 ? 'Known Devil Fruit user'
//                 : 'Unknown / none'}
//           </dd>

//           <dt>Haki</dt>
//           <dd>
//             {character.haki_types?.length
//               ? character.haki_types.join(', ')
//               : 'Unknown / none'}
//           </dd>

//           <dt>{character.status === 'Deceased' ? 'Last Bounty' : 'Bounty'}</dt>
//           <dd>
//             {character.bounty
//               ? `฿ ${Number(character.bounty).toLocaleString()}`
//               : 'Unknown / none'}
//           </dd>

//           <dt>Race</dt>
//           <dd>{character.race || 'Unknown'}</dd>
//         </dl>
//         {character.wiki_url && <a className="wikiLink" href={character.wiki_url} target="_blank" rel="noreferrer">Open full wiki page</a>}
//       </div>
//     </div>
//   );
// }

// function VoteMode() {
//   const [pair, setPair] = useState(null);
//   const [modalCharacter, setModalCharacter] = useState(null);
//   const [message, setMessage] = useState('');

//   async function loadPair() {
//     setMessage('');
//     const { data, error } = await supabase.rpc('get_random_pair');
//     if (error) setMessage(error.message);
//     else setPair(data?.[0] || null);
//   }

//   useEffect(() => { loadPair(); }, []);

//   async function vote(winner, loser) {
//     if (!winner || !loser) return;
//     const { error } = await supabase.rpc('submit_vote', { winner_id: winner.id, loser_id: loser.id });
//     if (error) setMessage(error.message);
//     else loadPair();
//   }

//   const left = pair?.left_character;
//   const right = pair?.right_character;

//   return (
//     <main className="votePage">
//       <header className="topBar"><h1>Who wins in a serious 1v1?</h1><button onClick={loadPair}>Skip</button></header>
//       {message && <p className="error">{message}</p>}
//       <section className="versus">
//         <CharacterCard character={left} side="left" onVote={() => vote(left, right)} onInfo={setModalCharacter} />
//         <div className="vs">VS</div>
//         <CharacterCard character={right} side="right" onVote={() => vote(right, left)} onInfo={setModalCharacter} />
//       </section>
//       <InfoModal character={modalCharacter} onClose={() => setModalCharacter(null)} />
//     </main>
//   );
// }

// const FILTERS = [
//   ['all', 'All'], ['alive', 'Alive'], ['swordsman', 'Swordsmen'], ['devil_fruit_user', 'Devil Fruit'], ['haki_user', 'Haki'], ['female', 'Women'], ['male', 'Men']
// ];

// function Rankings() {
//   const [filter, setFilter] = useState('all');
//   const [rows, setRows] = useState([]);
//   const [modalCharacter, setModalCharacter] = useState(null);

//   useEffect(() => {
//     let q = supabase
//       .from('character_rankings')
//       .select('*')
//       .order('elo_rating', { ascending: false })
//       .limit(500);

//     if (filter === 'alive') q = q.eq('status', 'Alive');
//     if (filter === 'swordsman') q = q.eq('swordsman', true);
//     if (filter === 'devil_fruit_user') q = q.eq('devil_fruit_user', true);
//     if (filter === 'haki_user') q = q.eq('haki_user', true);
//     if (filter === 'female') q = q.ilike('gender', 'female');
//     if (filter === 'male') q = q.ilike('gender', 'male');

//     q.then(({ data }) => setRows(data || []));
//   }, [filter]);

//   return (
//     <main className="rankPage">
//       <h1>Live Strength Ranking</h1>

//       <div className="filters">
//         {FILTERS.map(([id, label]) => (
//           <button
//             className={filter === id ? 'active' : ''}
//             onClick={() => setFilter(id)}
//             key={id}
//           >
//             {label}
//           </button>
//         ))}
//       </div>

//       <div className="rankList">
//         {rows.map((c, i) => (
//           <div className="rankRow" key={c.id}>
//             <strong className="rankNumber">{i + 1}</strong>

//             {c.image_url ? (
//               <img src={c.image_url} alt="" />
//             ) : (
//               <div className="rankAvatar">?</div>
//             )}

//             <div className="rankNameBlock">
//               <div className="rankNameLine">
//                 <span className="rankName">{c.name}</span>
//                 <button
//                   className="rankInfo"
//                   onClick={() => setModalCharacter(c)}
//                   aria-label={`Info about ${c.name}`}
//                 >
//                   i
//                 </button>
//               </div>
//               <small>{Math.round(c.elo_rating)} Elo · {c.wins}W/{c.losses}L</small>
//             </div>
//           </div>
//         ))}
//       </div>

//       <InfoModal
//         character={modalCharacter}
//         onClose={() => setModalCharacter(null)}
//       />
//     </main>
//   );
// }

// function App() {
//   const [page, setPage] = useState('vote');
//   return <><nav><button onClick={() => setPage('vote')}>Vote</button><button onClick={() => setPage('rankings')}>Rankings</button></nav>{page === 'vote' ? <VoteMode /> : <Rankings />}</>;
// }

// createRoot(document.getElementById('root')).render(<App />);


import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase } from './lib/supabase';
import './styles.css';

function titleCase(value) {
  if (!value) return '';
  const lower = String(value).toLowerCase();
  if (lower === 'male') return 'Man';
  if (lower === 'female') return 'Woman';
  return value;
}

function formatBounty(character) {
  if (!character?.bounty) return 'Unknown';

  const amount = Number(character.bounty).toLocaleString();

  if (character.bounty_type === 'Cross Guild') {
    const symbol = character.bounty_symbol === 'crown' ? '♛' : '★';
    const rank = character.bounty_rank || 1;

    return `${symbol.repeat(rank)} ฿${amount}`;
  }

  return `฿${amount}`;
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

function CharacterCard({ character, side, onVote, onInfo }) {
  const facts = character ? combatFacts(character) : null;

  return (
    <button className={`card ${side}`} onClick={onVote} disabled={!character}>
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

function InfoModal({ character, onClose }) {
  if (!character) return null;
  console.log(character);
  return (
    <div className="modalBackdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose}>×</button>
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
          <dd>
            {character.bounty && (
              <div className="character-bounty">
                {formatBounty(character)}
              </div>
            )}
          </dd>

          <dt>Race</dt>
          <dd>{character.race || 'Unknown'}</dd>
        </dl>
        {character.wiki_url && <a className="wikiLink" href={character.wiki_url} target="_blank" rel="noreferrer">Open full wiki page</a>}
      </div>
    </div>
  );
}

function VoteMode() {
  const [pair, setPair] = useState(null);
  const [modalCharacter, setModalCharacter] = useState(null);
  const [message, setMessage] = useState('');

  async function loadPair() {
    setMessage('');
    const { data, error } = await supabase.rpc('get_random_pair');
    if (error) setMessage(error.message);
    else setPair(data?.[0] || null);
  }

  useEffect(() => { loadPair(); }, []);

  async function vote(winner, loser) {
    if (!winner || !loser) return;
    const { error } = await supabase.rpc('submit_vote', { winner_id: winner.id, loser_id: loser.id });
    if (error) setMessage(error.message);
    else loadPair();
  }

  const left = pair?.left_character;
  const right = pair?.right_character;

  return (
    <main className="votePage">
      <header className="topBar"><h1>Who wins in a serious 1v1?</h1><button onClick={loadPair}>Skip</button></header>
      {message && <p className="error">{message}</p>}
      <section className="versus">
        <CharacterCard character={left} side="left" onVote={() => vote(left, right)} onInfo={setModalCharacter} />
        <div className="vs">VS</div>
        <CharacterCard character={right} side="right" onVote={() => vote(right, left)} onInfo={setModalCharacter} />
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
      .order('elo_rating', { ascending: false })
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
              <small>{Math.round(c.elo_rating)} Elo · {c.wins}W/{c.losses}L</small>
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

function App() {
  const [page, setPage] = useState('vote');

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
      </nav>

      {page === 'vote' ? <VoteMode /> : <Rankings />}
    </>
  );
}

createRoot(document.getElementById('root')).render(<App />);
