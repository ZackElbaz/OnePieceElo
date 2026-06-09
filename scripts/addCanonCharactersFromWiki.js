import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const API = 'https://onepiece.fandom.com/api.php';
const WIKI_BASE = 'https://onepiece.fandom.com/wiki/';
const LIMIT_TO_ADD = 50;

const categories = [
  // Main crews / factions
  'Category:Straw Hat Pirates',
  'Category:Whitebeard Pirates',
  'Category:Blackbeard Pirates',
  'Category:Red Hair Pirates',
  'Category:Big Mom Pirates',
  'Category:Beasts Pirates',
  'Category:Roger Pirates',
  'Category:Heart Pirates',
  'Category:Kid Pirates',
  'Category:Donquixote Pirates',
  'Category:Baroque Works',
  'Category:Sun Pirates',
  'Category:Kuja Pirates',

  // Major organisations
  'Category:Marines',
  'Category:Admirals',
  'Category:Seven Warlords of the Sea',
  'Category:Worst Generation',
  'Category:Revolutionary Army',
  'Category:CP9',
  'Category:CP0',

  // Major arc groups / side characters
  'Category:Arabasta Kingdom',
  'Category:Water 7',
  'Category:Skypiea',
  'Category:Thriller Bark Pirates',
  'Category:Fish-Man Island',
  'Category:Dressrosa',
  'Category:Wano Country',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function wikiUrl(params) {
  return `${API}?${new URLSearchParams({
    origin: '*',
    format: 'json',
    ...params,
  })}`;
}

function cleanName(title) {
  return title.replace(/_/g, ' ').replace(/\s*\(.+?\)\s*$/g, '').trim();
}

function isBadTitle(title) {
  const bad = [
    'Category:',
    'File:',
    'Template:',
    'User:',
    'One Piece Wiki:',
    'Chapter ',
    'Episode ',
    'Volume ',
    'Arc',
    'Saga',
    'List of',
  ];

  return bad.some((x) => title.includes(x));
}

async function wiki(params) {
  const res = await fetch(wikiUrl(params), {
    headers: { 'User-Agent': 'OnePieceElo/1.0 personal fan project' },
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function getCategoryMembers(category) {
  const titles = [];
  let cmcontinue = undefined;

  while (titles.length < 250) {
    const data = await wiki({
      action: 'query',
      list: 'categorymembers',
      cmtitle: category,
      cmlimit: '50',
      cmnamespace: '0',
      ...(cmcontinue ? { cmcontinue } : {}),
    });

    const members = data.query?.categorymembers || [];

    for (const member of members) {
      if (!isBadTitle(member.title)) {
        titles.push(member.title);
      }
    }

    cmcontinue = data.continue?.cmcontinue;
    if (!cmcontinue) break;

    await sleep(400);
  }

  return titles;
}

async function main() {
  const { data: existing, error: existingError } = await supabase
    .from('characters')
    .select('wiki_title,name');

  if (existingError) throw existingError;

  const existingTitles = new Set(
    (existing || []).flatMap((c) => [
      c.wiki_title,
      c.name,
      c.wiki_title?.replaceAll('_', ' '),
      c.name?.replaceAll(' ', '_'),
    ]).filter(Boolean)
  );

  const candidates = [];

  for (const category of categories) {
    console.log(`Fetching ${category}`);

    try {
      const titles = await getCategoryMembers(category);

      for (const title of titles) {
        const wikiTitle = title.replaceAll(' ', '_');

        if (existingTitles.has(title)) continue;
        if (existingTitles.has(wikiTitle)) continue;
        if (candidates.some((c) => c.wiki_title === wikiTitle)) continue;

        candidates.push({
            name: cleanName(title),
            wiki_title: wikiTitle,
            wiki_url: `${WIKI_BASE}${encodeURIComponent(wikiTitle)}`,
            canon: true,
            active: true,
            needs_enrichment: true,
            });

        if (candidates.length >= LIMIT_TO_ADD) break;
      }
    } catch (err) {
      console.error(`Failed category ${category}:`, err.message);
    }

    if (candidates.length >= LIMIT_TO_ADD) break;
    await sleep(1000);
  }

  if (!candidates.length) {
    console.log('No new characters found.');
    return;
  }

  const { error } = await supabase
    .from('characters')
    .upsert(candidates, { onConflict: 'wiki_title' });

  if (error) throw error;

  console.log(`Added ${candidates.length} new characters:`);
  for (const c of candidates) {
    console.log(`- ${c.name} (${c.wiki_title})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});