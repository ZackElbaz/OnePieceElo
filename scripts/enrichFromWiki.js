import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { htmlToText } from 'html-to-text';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const API = 'https://onepiece.fandom.com/api.php';
const WIKI_BASE = 'https://onepiece.fandom.com/wiki/';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function wikiUrl(params) {
  return `${API}?${new URLSearchParams({
    origin: '*',
    format: 'json',
    ...params,
  })}`;
}

async function wiki(params, retries = 5) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(wikiUrl(params), {
        headers: { 'User-Agent': 'OnePieceElo/1.0 personal fan project' },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.log(`Fetch failed ${attempt}/${retries}: ${err.message}`);
      if (attempt === retries) throw err;
      await sleep(3000 * attempt);
    }
  }
}

function cleanText(value) {
  if (!value) return null;

  return value
    .replace(/\[\s*\d+\s*\]/g, '')
    .replace(/\?/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*;\s*/g, '; ')
    .trim();
}

function getSectionValue(plain, heading) {
  const regex = new RegExp(
    `###\\s*${heading}:?\\s*\\n+([\\s\\S]*?)(?=\\n###\\s|\\n##\\s|$)`,
    'i'
  );

  const match = plain.match(regex);
  return cleanText(match?.[1]);
}

function splitList(value) {
  if (!value) return [];

  return value
    .split(/;|,|\n/)
    .map((x) => cleanText(x))
    .filter(Boolean)
    .map((x) => x.replace(/\s*\(former\)/i, '').trim())
    .filter(Boolean);
}

function extractCategories(html) {
  const categories = [];

  const categoryBlockMatch = html.match(
    /<div[^>]*class="[^"]*page-header__categories[^"]*"[\s\S]*?<\/div>/i
  );

  const source = categoryBlockMatch?.[0] || html;

  const matches = source.matchAll(/\/wiki\/Category:([^"#?]+)[^"]*"[^>]*>(.*?)<\/a>/gi);

  for (const match of matches) {
    const text = cleanText(match[2].replace(/<[^>]+>/g, ''));
    if (text) categories.push(text);
  }

  return [...new Set(categories)];
}

function deriveFlags(categories, plain) {
  const catText = categories.join(' ').toLowerCase();
  const plainText = plain.toLowerCase();

  return {
    devil_fruit_user:
      catText.includes('devil fruit users') ||
      plainText.includes('devil fruit user'),

    haki_user:
      catText.includes('haki users') ||
      plainText.includes('haki user') ||
      catText.includes('supreme king haki') ||
      catText.includes('observation haki') ||
      catText.includes('armament haki'),

    swordsman:
      catText.includes('swordsmen') ||
      catText.includes('swordsman') ||
      plainText.includes('swordsman'),
  };
}

function extractGender(categories, plain) {
  const catText = categories.join(' ').toLowerCase();

  if (catText.includes('female characters')) return 'Female';
  if (catText.includes('male characters')) return 'Male';

  const gender = getSectionValue(plain, 'Gender');
  return gender;
}

async function extractDevilFruitFromFruitPage(fruitTitle) {
  try {
    const fruitPage = await wiki({
      action: 'parse',
      page: fruitTitle,
      prop: 'text',
      redirects: '1',
    });

    const fruitHtml = fruitPage.parse?.text?.['*'] || '';

    const fruitPlain = htmlToText(fruitHtml, {
      wordwrap: false,
      selectors: [
        { selector: '.navbox', format: 'skip' },
        { selector: '.toc', format: 'skip' },
      ],
    })
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const japaneseName = fruitTitle;

    const englishNameMatch =
        fruitPlain.match(/OFFICIAL ENGLISH NAME:\s*\n+\s*([^\n]+)/i) ||
        fruitPlain.match(/ENGLISH NAME:\s*\n+\s*([^\n]+)/i);

        const englishName = englishNameMatch
        ? cleanText(englishNameMatch[1])
        : null;

        if (process.env.DEBUG_TITLE) {
        console.log('\nFRUIT PAGE DEBUG:', fruitTitle);
        console.log(fruitPlain.slice(0, 2500));
        }

        return {
        devilFruitName: japaneseName,
        devilFruitEnglishName: englishName,
        };
  } catch (err) {
    console.log(`No fruit page found for ${fruitTitle}`);
    return {
      devilFruitName: fruitTitle,
      devilFruitEnglishName: null,
    };
  }
}

async function getWikiData(title) {
  const [parseData, imageData, sourceData] = await Promise.all([
    wiki({
      action: 'parse',
      page: title,
      prop: 'text',
      redirects: '1',
    }),
    wiki({
      action: 'query',
      titles: title,
      prop: 'pageimages',
      piprop: 'original',
      redirects: '1',
    }),
    wiki({
      action: 'parse',
      page: title,
      prop: 'wikitext',
      redirects: '1',
    }),
  ]);

  const html = parseData.parse?.text?.['*'] || '';
  const source = sourceData.parse?.wikitext?.['*'] || '';

  const plain = htmlToText(html, {
    wordwrap: false,
    selectors: [
      { selector: '.navbox', format: 'skip' },
      { selector: '.toc', format: 'skip' },
    ],
  })
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const pages = imageData.query?.pages || {};
  const first = Object.values(pages)[0] || {};

  const description =
    plain
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .filter(
        (s) =>
          s.length > 100 &&
          !s.includes('Template:') &&
          !s.includes('action=edit') &&
          !s.includes('For other uses')
      )[0] || null;

  function getField(fieldName) {
    const regex = new RegExp(
      `\\|\\s*${fieldName}\\s*=\\s*([\\s\\S]*?)(?=\\n\\|\\s*[a-zA-Z0-9_ -]+\\s*=|\\n}})`,
      'i'
    );

    const match = source.match(regex);
    return cleanWiki(match?.[1]);
  }

  function cleanWiki(value) {
    if (!value) return null;

    return value
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<ref[\s\S]*?<\/ref>/gi, '')
      .replace(/<ref[^>]*\/>/gi, '')
      .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, '$2')
      .replace(/\[\[([^\]]+)\]\]/g, '$1')
      .replace(/'''/g, '')
      .replace(/''/g, '')
      .replace(/<br\s*\/?>/gi, '; ')
      .replace(/\{\{[^{}]*\}\}/g, '')
      .replace(/\s+/g, ' ')
      .replace(/\s*;\s*/g, '; ')
      .trim();
  }

  const affiliations = splitList(getField('affiliation') || getField('affiliations'));
  const status = getField('status');
  const gender = getField('gender');

  let devilFruitName = null;
  let devilFruitEnglishName = null;

  let dfRaw =
    getField('df') ||
    getField('devilfruit') ||
    getField('devil fruit');

    if (!dfRaw) {
    const earlySource = source.slice(0, 6000);

    const fruitSentenceMatch = earlySource.match(
        /(?:wields|ate|eaten|consumed|possesses|user of|power of)[\s\S]{0,250}?\[\[([^|\]#]+ no Mi)(?:\|[^\]]+)?\]\]/i
    );

    if (fruitSentenceMatch) {
        dfRaw = fruitSentenceMatch[1].trim();
    }
    }

    if (dfRaw) {
    const fruitData = await extractDevilFruitFromFruitPage(dfRaw);

    devilFruitName = fruitData.devilFruitName || dfRaw;
    devilFruitEnglishName = fruitData.devilFruitEnglishName;

    console.log(
        `Fruit found for ${title}: ${devilFruitName} / ${devilFruitEnglishName}`
    );
    }

  const sourceLower = source.toLowerCase();

  const flags = {
    devil_fruit_user: Boolean(dfRaw) || sourceLower.includes('devil fruit user'),
    haki_user: sourceLower.includes('haki') || sourceLower.includes('haoshoku'),
    swordsman: sourceLower.includes('swordsman') || sourceLower.includes('swordsmen'),
  };

  if (process.env.DEBUG_TITLE) {
    console.log('\n==============================');
    console.log(`DEBUG SOURCE: ${title}`);
    console.log('==============================');
    console.log('df raw:', dfRaw);
    console.log('Affiliations:', affiliations);
    console.log('Status:', status);
    console.log('Gender:', gender);
    console.log('Flags:', flags);
    console.log('Devil Fruit:', {
      devilFruitName,
      devilFruitEnglishName,
    });

    console.log('\nFirst 2000 chars of source:');
    console.log(source.slice(0, 2000));
    console.log('==============================\n');
  }

  return {
    image_url: first.original?.source || null,
    description: description?.slice(0, 1200) || null,

    affiliations,
    status,
    gender,

    swordsman: flags.swordsman,
    haki_user: flags.haki_user,
    devil_fruit_user: flags.devil_fruit_user,

    devil_fruit_name: devilFruitName,
    devil_fruit_english_name: devilFruitEnglishName,
  };
}

async function main() {
  const debugTitle = process.env.DEBUG_TITLE;

  let query = supabase
    .from('characters')
    .select(`
      id,
      name,
      wiki_title,
      wiki_url,
      image_url,
      description,
      affiliations,
      gender,
      status,
      swordsman,
      haki_user,
      devil_fruit_user,
      devil_fruit_name,
      devil_fruit_english_name
    `)
    .eq('active', true)
    .order('name');

  if (debugTitle) {
    query = query.or(`name.ilike.%${debugTitle}%,wiki_title.ilike.%${debugTitle}%`);
  }

  const { data: characters, error } = await query;

  if (error) throw error;

  console.log(`Enriching ${characters.length} characters from wiki`);

  for (const character of characters) {
    const title = character.wiki_title || character.name;

    try {
      console.log(`Fetching ${title}`);

      const wikiData = await getWikiData(title);

      const update = {
        wiki_title: title,
        wiki_url:
          character.wiki_url ||
          `${WIKI_BASE}${encodeURIComponent(title.replaceAll(' ', '_'))}`,
        last_synced_at: new Date().toISOString(),
      };

      if (wikiData.image_url) update.image_url = wikiData.image_url;
      if (wikiData.description) update.description = wikiData.description;

      if (wikiData.affiliations?.length) update.affiliations = wikiData.affiliations;
      if (wikiData.status) update.status = wikiData.status;
      if (wikiData.gender) update.gender = wikiData.gender;

      update.swordsman = wikiData.swordsman;
      update.haki_user = wikiData.haki_user;
      update.devil_fruit_user = wikiData.devil_fruit_user;

      if (wikiData.devil_fruit_name) {
        update.devil_fruit_name = wikiData.devil_fruit_name;
      }

      if (wikiData.devil_fruit_english_name) {
        update.devil_fruit_english_name = wikiData.devil_fruit_english_name;
      }

      const { error: updateError } = await supabase
        .from('characters')
        .update(update)
        .eq('id', character.id);

      if (updateError) {
        console.error(`Supabase update failed for ${title}:`, updateError.message);
      } else {
        console.log(`Updated ${title}`);
      }

      if (!debugTitle) {
        await sleep(2500);
      }
    } catch (err) {
      console.error(`Failed ${title}:`, err.message);
    }
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});