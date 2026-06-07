import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { htmlToText } from 'html-to-text';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const API = 'https://onepiece.fandom.com/api.php';
const WIKI_BASE = 'https://onepiece.fandom.com/wiki/';

const STARTER_CANON_CHARACTERS = [
  'Monkey D. Luffy',
  'Roronoa Zoro',
  'Nami',
  'Usopp',
  'Sanji',
  'Tony Tony Chopper',
  'Nico Robin',
  'Franky',
  'Brook',
  'Jinbe',

  'Shanks',
  'Dracule Mihawk',
  'Marshall D. Teach',
  'Edward Newgate',
  'Gol D. Roger',
  'Silvers Rayleigh',
  'Kaido',
  'Charlotte Linlin',
  'Buggy',
  'Trafalgar D. Water Law',
  'Eustass Kid',

  'Portgas D. Ace',
  'Sabo',
  'Monkey D. Dragon',
  'Bartholomew Kuma',
  'Boa Hancock',
  'Crocodile',
  'Donquixote Doflamingo',
  'Rob Lucci',

  'Sakazuki',
  'Kuzan',
  'Borsalino',
  'Issho',
  'Aramaki',
  'Monkey D. Garp',
  'Sengoku',
  'Koby',

  'Imu',
  'Joy Boy',
  'Saint Figarland Garling',
  'Saint Jaygarcia Saturn',
  'Saint Marcus Mars',
  'Saint Topman Warcury',
  'Saint Ethanbaron V. Nusjuro',
  'Saint Shepherd Ju Peter',

  'Marco',
  'King',
  'Queen',
  'Jack',
  'Charlotte Katakuri',
  'Charlotte Cracker',
  'Charlotte Smoothie',
  'Benn Beckman',
  'Yasopp',
  'Lucky Roux',
  'Killer',
  'Bepo',

  'Yamato',
  'Kozuki Oden',
  'Kozuki Momonosuke',
  'Kozuki Hiyori',
  'Kin\'emon',
  'Denjiro',
  'Ashura Doji',
  'Kikunojo',
  'Inuarashi',
  'Nekomamushi',

  'Enel',
  'Magellan',
  'Shiryu',
  'Vista',
  'Jozu',
  'Jesus Burgess',
  'Van Augur',
  'Lafitte',
  'Catarina Devon',
  'Avalo Pizarro',
  'Sanjuan Wolf',
  'Doc Q',
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function enc(params) {
  return new URLSearchParams({
    origin: '*',
    format: 'json',
    ...params,
  });
}

async function wiki(params, retries = 4) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${API}?${enc(params)}`, {
        headers: {
          'User-Agent': 'OnePieceStrongest/0.1 personal fan app',
        },
      });

      if (!res.ok) {
        throw new Error(`Wiki API failed: ${res.status}`);
      }

      return await res.json();
    } catch (err) {
      console.error(`Fetch failed, attempt ${attempt}/${retries}:`, err.message);

      if (attempt === retries) {
        throw err;
      }

      await sleep(2000 * attempt);
    }
  }
}

function cleanTitle(title) {
  return title.replace(/\s*\(.+?\)\s*$/g, '').trim();
}

function guessFields(title, plainText) {
  const lower = `${title}\n${plainText}`.toLowerCase();

  const hakiTypes = [];

  if (lower.includes('busoshoku haki') || lower.includes('armament haki')) {
    hakiTypes.push('Armament');
  }

  if (lower.includes('kenbunshoku haki') || lower.includes('observation haki')) {
    hakiTypes.push('Observation');
  }

  if (lower.includes('haoshoku haki') || lower.includes("conqueror's haki")) {
    hakiTypes.push('Conqueror');
  }

  const devilFruitUser =
    lower.includes('devil fruit') ||
    lower.includes(' no mi') ||
    lower.includes('-no-mi');

  const swordsman =
    lower.includes('swordsman') ||
    lower.includes('swordsmanship') ||
    lower.includes('katana') ||
    lower.includes('sword');

  const status =
    lower.includes('deceased') ||
    lower.includes('status: deceased') ||
    lower.includes('status deceased')
      ? 'Deceased'
      : 'Alive';

  return {
    devil_fruit_user: devilFruitUser,
    haki_user: hakiTypes.length > 0 || lower.includes('haki'),
    haki_types: hakiTypes,
    swordsman,
    status,
  };
}

async function getPage(title) {
  const [parseData, imageData] = await Promise.all([
    wiki({
      action: 'parse',
      page: title,
      prop: 'text|displaytitle',
      redirects: '1',
    }),
    wiki({
      action: 'query',
      titles: title,
      prop: 'pageimages',
      piprop: 'original',
      redirects: '1',
    }),
  ]);

  const html = parseData.parse?.text?.['*'] || '';

  const plain = htmlToText(html, {
    wordwrap: false,
    selectors: [
      { selector: 'table', format: 'skip' },
      { selector: '.navbox', format: 'skip' },
      { selector: '.toc', format: 'skip' },
    ],
  })
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const description =
    plain
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .find((s) => s.length > 80 && !s.includes('For other uses')) ||
    plain.slice(0, 700);

  const pages = imageData.query?.pages || {};
  const first = Object.values(pages)[0] || {};

  return {
    description: description?.slice(0, 1200),
    image_url: first.original?.source || null,
    ...guessFields(title, plain),
  };
}

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  }

  console.log(`Importing ${STARTER_CANON_CHARACTERS.length} starter canon characters`);

  for (const title of STARTER_CANON_CHARACTERS) {
    try {
      const page = await getPage(title);

      const row = {
        name: cleanTitle(title),
        wiki_title: title,
        wiki_url: `${WIKI_BASE}${encodeURIComponent(title.replaceAll(' ', '_'))}`,
        image_url: page.image_url,
        description: page.description,
        status: page.status,
        canon: true,
        devil_fruit_user: page.devil_fruit_user,
        haki_user: page.haki_user,
        haki_types: page.haki_types,
        swordsman: page.swordsman,
        active: true,
        last_synced_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('characters')
        .upsert(row, { onConflict: 'wiki_title' });

      if (error) {
        console.error('Supabase error:', title, error.message);
      } else {
        console.log('Synced:', title);
      }

      await sleep(800);
    } catch (e) {
      console.error('Failed:', title, e.message);
    }
  }

  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});