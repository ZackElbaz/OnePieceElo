import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { htmlToText } from 'html-to-text';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
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
        headers: { 'User-Agent': 'OnePieceStrongest/1.0 personal fan project' },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.log(`Fetch failed ${attempt}/${retries}: ${err.message}`);
      if (attempt === retries) throw err;
      await sleep(2500 * attempt);
    }
  }
}

function cleanText(value) {
  if (!value) return null;

  return String(value)
    .replace(/\s*\[\/wiki\/[^\]]+\]/g, '')
    .replace(/\[\s*\d+\s*\]/g, '')
    .replace(/\?/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*;\s*/g, '; ')
    .trim() || null;
}

function cleanWiki(value) {
  if (!value) return null;

  return String(value)
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<ref[\s\S]*?<\/ref>/gi, '')
    .replace(/<ref[^>]*\/>/gi, '')
    .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/'''/g, '')
    .replace(/''/g, '')
    .replace(/<br\s*\/?>/gi, '; ')
    .replace(/\{\{!}}/g, '|')
    .replace(/\{\{Shipwright\}\}/gi, 'shipwright')
    .replace(/\{\{Navigator\}\}/gi, 'navigator')
    .replace(/\{\{Sniper\}\}/gi, 'sniper')
    .replace(/\{\{Cook\}\}/gi, 'cook')
    .replace(/\{\{Doctor\}\}/gi, 'doctor')
    .replace(/\{\{Archaeologist\}\}/gi, 'archaeologist')
    .replace(/\{\{Musician\}\}/gi, 'musician')
    .replace(/\{\{Helmsman\}\}/gi, 'helmsman')
    .replace(/\{\{Combatant\}\}/gi, 'combatant')
    .replace(/\{\{Swordsman\}\}/gi, 'swordsman')
    .replace(/\{\{First Mate\}\}/gi, 'first mate')
    .replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*;\s*/g, '; ')
    .trim() || null;
}

function splitList(value) {
  if (!value) return [];

  return String(value)
    .split(/;|\n/)
    .map((x) => cleanText(x))
    .filter(Boolean)
    .map((x) => x.replace(/\s*\(former\)/i, ' (former)').trim())
    .filter(Boolean);
}

function getRenderedStat(plain, heading) {
  const headings = Array.isArray(heading) ? heading : [heading];

  for (const h of headings) {
    const regex = new RegExp(
      `${h}\\s*(?:\\[\\/wiki\\/[^\\]]+\\])?:\\s*\\n+([\\s\\S]*?)(?=\\n\\n[A-Z][A-Z '\\-/()]+(?:\\s*\\[\\/wiki\\/[^\\]]+\\])?:\\s*\\n|\\n\\nPORTRAYAL|\\n\\nDEVIL FRUIT|\\n\\nABILITIES|$)`,
      'i'
    );

    const match = plain.match(regex);
    if (match?.[1]) return cleanText(match[1]);
  }

  return null;
}

function getInfoboxField(source, fieldName) {
  const regex = new RegExp(
    `\\|\\s*${fieldName}\\s*=\\s*([\\s\\S]*?)(?=\\n\\|\\s*[a-zA-Z0-9_ -]+\\s*=|\\n}})`,
    'i'
  );

  const match = source.match(regex);
  return cleanWiki(match?.[1]);
}

function getInfoboxFieldsByPrefix(source, prefix) {
  const regex = new RegExp(
    `\\|\\s*(${prefix}\\d*)\\s*=\\s*([\\s\\S]*?)(?=\\n\\|\\s*[a-zA-Z0-9_ -]+\\s*=|\\n}})`,
    'gi'
  );

  return [...source.matchAll(regex)]
    .map((match) => ({
      key: match[1].trim().toLowerCase(),
      value: cleanWiki(match[2]),
    }))
    .filter((item) => item.value);
}

function normaliseStatus(value, categories) {
  const raw = cleanText(value);

  if (hasCategory(categories, [/Deceased Characters/i])) return 'Deceased';
  if (hasCategory(categories, [/Living Characters/i])) return 'Alive';

  if (raw === '1') return 'Alive';
  if (raw === '2') return 'Deceased';
  if (raw === '3') return 'Unknown';

  if (!raw) return null;

  const lower = raw.toLowerCase();
  if (lower.includes('deceased') || lower.includes('dead')) return 'Deceased';
  if (lower.includes('alive') || lower.includes('living')) return 'Alive';

  return raw;
}

function normaliseGender(value) {
  if (!value) return null;

  const lower = value.toLowerCase();
  if (lower.includes('female')) return 'Female';
  if (lower.includes('male')) return 'Male';

  return cleanText(value);
}

function normaliseRace(value) {
  if (!value) return null;

  return cleanText(value)
    ?.replace(/\s*\(.*?\)\s*/g, '')
    .trim() || null;
}

function pickPreferredEnglishFruitName(value) {
  if (!value) return null;

  const parts = value
    .split(';')
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => x.replace(/\s*\(VIZ\)/gi, '').trim());

  return parts.at(-1) || null;
}

function extractBountyFromText(value) {
  if (!value) return null;

  const text = String(value)
    .replace(/<s>|<\/s>|<strike>|<\/strike>/gi, '')
    .replace(/\{\{Bounty\|([^}|]+).*?\}\}/gi, '$1')
    .replace(/\{\{Beli\|([^}|]+).*?\}\}/gi, '$1')
    .replace(/\{\{Berry\|([^}|]+).*?\}\}/gi, '$1')
    .replace(/\d{14}/g, '')
    .replace(/\d{12}/g, '');

  const matches = [...text.matchAll(/\d[\d,]{3,}/g)]
    .map((m) => Number(m[0].replaceAll(',', '')))
    .filter((n) => Number.isFinite(n))
    .filter((n) => n >= 1000 && n < 10000000000);

  if (!matches.length) return null;

  return Math.max(...matches);
}

function extractBounty(source, plain) {
  const infoboxBounty =
    getInfoboxField(source, 'bounty') ||
    getInfoboxField(source, 'bounty1');

  const fromInfobox = extractBountyFromText(infoboxBounty);
  if (fromInfobox) return fromInfobox;

  const bountyBlock = getRenderedStat(plain, 'BOUNTY');
  return extractBountyFromText(bountyBlock);
}

function extractFruitFromRenderedText(plain) {
  const compact = plain
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n');

  const match =
    compact.match(
      /DEVIL FRUIT[\s\S]{0,800}?JAPANESE NAME:\s*\n+\s*([^\n]+)[\s\S]{0,400}?(?:OFFICIAL ENGLISH NAME|ENGLISH NAME):\s*\n+\s*([^\n]+)/i
    ) ||
    compact.match(
      /Devil Fruit[\s\S]{0,800}?Japanese Name:\s*\n+\s*([^\n]+)[\s\S]{0,400}?(?:Official English Name|English Name):\s*\n+\s*([^\n]+)/i
    );

  if (!match) {
    return {
      devilFruitName: null,
      devilFruitEnglishName: null,
    };
  }

  return {
    devilFruitName: cleanText(match[1]),
    devilFruitEnglishName: cleanText(match[2]),
  };
}

function hasCategory(categories, patterns) {
  return categories.some((cat) =>
    patterns.some((pattern) => pattern.test(cat))
  );
}

function extractHakiTypesFromCategories(categories) {
  const haki = [];

  if (hasCategory(categories, [/Observation Haki Users/i, /Kenbunshoku Haki Users/i])) {
    haki.push('Observation');
  }

  if (hasCategory(categories, [/Armament Haki Users/i, /Busoshoku Haki Users/i])) {
    haki.push('Armament');
  }

  if (hasCategory(categories, [/Supreme King Haki Users/i, /Conqueror'?s Haki Users/i, /Haoshoku Haki Users/i])) {
    haki.push('Conquerors');
  }

  return [...new Set(haki)];
}

function extractDevilFruitTypeFromCategories(categories) {
  if (hasCategory(categories, [/Mythical Zoan Devil Fruit Users/i])) return 'Mythical Zoan';
  if (hasCategory(categories, [/Ancient Zoan Devil Fruit Users/i])) return 'Ancient Zoan';
  if (hasCategory(categories, [/Logia Devil Fruit Users/i])) return 'Logia';
  if (hasCategory(categories, [/Paramecia Devil Fruit Users/i])) return 'Paramecia';
  if (hasCategory(categories, [/Zoan Devil Fruit Users/i])) return 'Zoan';

  return null;
}

function isAnimeCharacter(source, plain, categories) {
  if (hasCategory(categories, [/Anime Characters/i])) return true;

  const debut =
    getInfoboxField(source, 'debut') ||
    getInfoboxField(source, 'anime') ||
    getInfoboxField(source, 'anime debut') ||
    getInfoboxField(source, 'debut anime') ||
    getRenderedStat(plain, 'DEBUT');

  return /Episode\s+\d+/i.test(debut || '');
}

function extractLeadBio(plain, title) {
  const name = title.replaceAll('_', ' ');

  const paragraphs = plain
    .split(/\n\s*\n/)
    .map((s) => cleanText(s))
    .filter(Boolean)
    .filter((s) => s.length > 120)
    .filter((s) => !s.includes('Featured Article'))
    .filter((s) => !s.includes('Ahoy!'))
    .filter((s) => !s.includes('data:image'))
    .filter((s) => !s.includes('Advertisement'))
    .filter((s) => !s.includes('For other uses'))
    .filter((s) => !s.includes('Template:'))
    .filter((s) => !s.includes('action=edit'));

  return (
    paragraphs.find((s) =>
      s.toLowerCase().includes(name.toLowerCase().split(' ')[0])
    ) ||
    paragraphs[0] ||
    null
  )?.slice(0, 1600) || null;
}

async function getWikiData(title) {
  const [parseData, imageData, sourceData, categoryData, extractData] = await Promise.all([
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
    wiki({
      action: 'query',
      titles: title,
      prop: 'categories',
      cllimit: '500',
      redirects: '1',
    }),
    wiki({
      action: 'query',
      titles: title,
      prop: 'extracts',
      exintro: '1',
      explaintext: '1',
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
      { selector: 'script', format: 'skip' },
      { selector: 'style', format: 'skip' },
    ],
  })
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const imagePages = imageData.query?.pages || {};
  const imagePage = Object.values(imagePages)[0] || {};

  const categoryPages = categoryData.query?.pages || {};
  const categoryPage = Object.values(categoryPages)[0] || {};
  const categories = (categoryPage.categories || [])
    .map((c) => c.title.replace(/^Category:/, '').trim())
    .filter(Boolean);

  const active = isAnimeCharacter(source, plain, categories);

  const introSource = source.split(/^==/m)[0];

  const introWithoutInfobox = introSource
    .replace(/^\s*\{\{Character[\s\S]*?\n\}\}/i, '')
    .replace(/^\s*\{\{Tabs[\s\S]*?\n\}\}/i, '')
    .replace(/^\s*\{\{Character Tabs[\s\S]*?\n\}\}/i, '');

  const introWithoutTemplates = introWithoutInfobox
    .replace(/\{\{Featured Article[\s\S]*?\}\}/gi, '')
    .replace(/\{\{FA[\s\S]*?\}\}/gi, '')
    .replace(/\{\{For\|[\s\S]*?\}\}/gi, '')
    .replace(/\{\{About\|[\s\S]*?\}\}/gi, '')
    .replace(/\{\{[^{}]*\}\}/g, '')
    .trim();

  const introPlain = cleanWiki(introWithoutTemplates);

  let cleanedBio = introPlain
    ?.replace(/^:\s*The subject of this article is sometimes called.*?\.\s*/i, '')
    ?.replace(/^:\s*For other uses.*?\.\s*/i, '')
    ?.replace(/^:\s*/, '');

  const titleWords = title
    .replaceAll('_', ' ')
    .split(/\s+/)
    .filter((word) => word.length > 1);

  const bioStart = cleanedBio?.search(
    new RegExp(titleWords.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i')
  );

  cleanedBio =
    bioStart !== undefined && bioStart >= 0
      ? cleanedBio.slice(bioStart)
      : cleanedBio;

  const protectedIntro = cleanedBio
    ?.replace(/\bMr\./g, 'Mr§')
    ?.replace(/\bMrs\./g, 'Mrs§')
    ?.replace(/\bMs\./g, 'Ms§')
    ?.replace(/\bDr\./g, 'Dr§')
    ?.replace(/\bD\./g, 'D§');

  const shortBio =
    protectedIntro
      ?.match(/[^.!?]*[.!?]/)?.[0]
      ?.replace(/\bMr§/g, 'Mr.')
      ?.replace(/\bMrs§/g, 'Mrs.')
      ?.replace(/\bMs§/g, 'Ms.')
      ?.replace(/\bDr§/g, 'Dr.')
      ?.replace(/\bD§/g, 'D.')
      ?.trim() ||
    cleanedBio ||
    null;

  const affiliations =
    splitList(getInfoboxField(source, 'affiliation') || getInfoboxField(source, 'affiliations')).length
      ? splitList(getInfoboxField(source, 'affiliation') || getInfoboxField(source, 'affiliations'))
      : splitList(getRenderedStat(plain, 'AFFILIATIONS'));

  const origin =
    getInfoboxField(source, 'origin') ||
    cleanText(getRenderedStat(plain, 'ORIGIN'));

  const status = normaliseStatus(
    getInfoboxField(source, 'status') || getRenderedStat(plain, 'STATUS'),
    categories
  );

  const gender =
    normaliseGender(getInfoboxField(source, 'gender')) ||
    normaliseGender(getRenderedStat(plain, ['GENDER', 'SEX']));

  const race =
    normaliseRace(getInfoboxField(source, 'race') || getInfoboxField(source, 'species')) ||
    normaliseRace(getRenderedStat(plain, ['RACE', 'SPECIES']));

  const bounty = extractBounty(source, plain);

  let devilFruitName = null;
  let devilFruitEnglishName = null;

  const dfNameFields = getInfoboxFieldsByPrefix(source, 'dfname');
  const dfEnglishFields = getInfoboxFieldsByPrefix(source, 'dfename');

  if (dfNameFields.length) {
    const fruitNames = dfNameFields.map((item) => item.value);

    const englishNames = dfNameFields.map((nameField, index) => {
      const suffix = nameField.key.replace('dfname', '');

      const matchingEnglish =
        dfEnglishFields.find((item) => item.key === `dfename${suffix}`) ||
        dfEnglishFields[index];

      return pickPreferredEnglishFruitName(matchingEnglish?.value);
    });

    devilFruitName = fruitNames.filter(Boolean).join('; ') || null;
    devilFruitEnglishName = englishNames.filter(Boolean).join('; ') || null;
  }

  if (!devilFruitName || !devilFruitEnglishName) {
    const renderedFruit = extractFruitFromRenderedText(plain);
    devilFruitName = devilFruitName || renderedFruit.devilFruitName;
    devilFruitEnglishName = devilFruitEnglishName || renderedFruit.devilFruitEnglishName;
  }

  const devilFruitType =
    getInfoboxField(source, 'dftype') ||
    getInfoboxField(source, 'df type') ||
    extractDevilFruitTypeFromCategories(categories);

  const hakiTypes = extractHakiTypesFromCategories(categories);

  const devilFruitUser =
    Boolean(devilFruitName) ||
    hasCategory(categories, [/Devil Fruit Users/i]);

  const swordsman = hasCategory(categories, [
    /Swordsmen/i,
    /Swordsman/i,
    /Sword Users/i,
  ]);

  if (process.env.DEBUG_TITLE) {
    console.log('\n==============================');
    console.log(`DEBUG: ${title}`);
    console.log('==============================');
    console.log('Active anime character:', active);
    console.log('Categories:', categories);
    console.log('Bio:', shortBio);
    console.log('Affiliations:', affiliations);
    console.log('Origin:', origin);
    console.log('Status:', status);
    console.log('Bounty:', bounty);
    console.log('Devil Fruit:', {
      devilFruitName,
      devilFruitEnglishName,
      devilFruitType,
      devilFruitUser,
    });
    console.log('Haki:', hakiTypes);
    console.log('Swordsman:', swordsman);
    console.log('==============================\n');
  }

  return {
    active,
    image_url: imagePage.original?.source || null,
    description: shortBio,

    affiliations,
    origin,
    status,
    gender,
    race,
    bounty,

    swordsman,
    haki_user: hakiTypes.length > 0,
    haki_types: hakiTypes,

    devil_fruit_user: devilFruitUser,
    devil_fruit_name: devilFruitName,
    devil_fruit_english_name: devilFruitEnglishName,
    devil_fruit_type: devilFruitType,

    tags: categories,
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
      needs_enrichment
    `)
    .order('name');

  if (debugTitle) {
    query = supabase
      .from('characters')
      .select(`
        id,
        name,
        wiki_title,
        wiki_url,
        needs_enrichment
      `)
      .or(`name.ilike.%${debugTitle}%,wiki_title.ilike.%${debugTitle}%`)
      .order('name');
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
        active: wikiData.active,
        last_synced_at: new Date().toISOString(),
        needs_enrichment: false,

        affiliations: wikiData.affiliations || [],
        origin: wikiData.origin,
        status: wikiData.status,
        gender: wikiData.gender,
        race: wikiData.race,
        bounty: wikiData.bounty,

        swordsman: wikiData.swordsman,
        haki_user: wikiData.haki_user,
        haki_types: wikiData.haki_types || [],

        devil_fruit_user: wikiData.devil_fruit_user,
        devil_fruit_name: wikiData.devil_fruit_name,
        devil_fruit_english_name: wikiData.devil_fruit_english_name,
        devil_fruit_type: wikiData.devil_fruit_type,

        tags: wikiData.tags || [],
      };

      if (wikiData.image_url) update.image_url = wikiData.image_url;
      if (wikiData.description) update.description = wikiData.description;

      const { error: updateError } = await supabase
        .from('characters')
        .update(update)
        .eq('id', character.id);

      if (updateError) {
        console.error(`Supabase update failed for ${title}:`, updateError.message);
      } else if (!wikiData.active) {
        console.log(`Hidden ${title}: no anime appearance detected`);
      } else {
        console.log(`Updated ${title}`);
      }

      if (!debugTitle) {
        await sleep(1800);
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