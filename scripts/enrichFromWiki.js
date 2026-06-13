// import 'dotenv/config';
// import { createClient } from '@supabase/supabase-js';
// import { htmlToText } from 'html-to-text';

// const supabase = createClient(
//   process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
//   process.env.SUPABASE_SERVICE_ROLE_KEY
// );

// const API = 'https://onepiece.fandom.com/api.php';
// const WIKI_BASE = 'https://onepiece.fandom.com/wiki/';

// const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// function wikiUrl(params) {
//   return `${API}?${new URLSearchParams({
//     origin: '*',
//     format: 'json',
//     ...params,
//   })}`;
// }

// async function wiki(params, retries = 5) {
//   for (let attempt = 1; attempt <= retries; attempt++) {
//     try {
//       const res = await fetch(wikiUrl(params), {
//         headers: { 'User-Agent': 'OnePieceStrongest/1.0 personal fan project' },
//       });

//       if (!res.ok) throw new Error(`HTTP ${res.status}`);
//       return await res.json();
//     } catch (err) {
//       console.log(`Fetch failed ${attempt}/${retries}: ${err.message}`);
//       if (attempt === retries) throw err;
//       await sleep(2500 * attempt);
//     }
//   }
// }

// function cleanText(value) {
//   if (!value) return null;

//   return String(value)
//     .replace(/\s*\[\/wiki\/[^\]]+\]/g, '')
//     .replace(/\[\s*\d+\s*\]/g, '')
//     .replace(/\?/g, '')
//     .replace(/\s+/g, ' ')
//     .replace(/\s*;\s*/g, '; ')
//     .trim() || null;
// }

// function cleanWiki(value) {
//   if (!value) return null;

//   return String(value)
//     .replace(/<!--[\s\S]*?-->/g, '')
//     .replace(/<ref[\s\S]*?<\/ref>/gi, '')
//     .replace(/<ref[^>]*\/>/gi, '')
//     .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, '$2')
//     .replace(/\[\[([^\]]+)\]\]/g, '$1')
//     .replace(/'''/g, '')
//     .replace(/''/g, '')
//     .replace(/<br\s*\/?>/gi, '; ')
//     .replace(/\{\{!}}/g, '|')
//     .replace(/\{\{Shipwright\}\}/gi, 'shipwright')
//     .replace(/\{\{Navigator\}\}/gi, 'navigator')
//     .replace(/\{\{Sniper\}\}/gi, 'sniper')
//     .replace(/\{\{Cook\}\}/gi, 'cook')
//     .replace(/\{\{Doctor\}\}/gi, 'doctor')
//     .replace(/\{\{Archaeologist\}\}/gi, 'archaeologist')
//     .replace(/\{\{Musician\}\}/gi, 'musician')
//     .replace(/\{\{Helmsman\}\}/gi, 'helmsman')
//     .replace(/\{\{Combatant\}\}/gi, 'combatant')
//     .replace(/\{\{Swordsman\}\}/gi, 'swordsman')
//     .replace(/\{\{First Mate\}\}/gi, 'first mate')
//     .replace(/\{\{[^{}]*\}\}/g, '')
//     .replace(/\s+/g, ' ')
//     .replace(/\s*;\s*/g, '; ')
//     .trim() || null;
// }

// function splitList(value) {
//   if (!value) return [];

//   return String(value)
//     .split(/;|\n/)
//     .map((x) => cleanText(x))
//     .filter(Boolean)
//     .map((x) => x.replace(/\s*\(former\)/i, ' (former)').trim())
//     .filter(Boolean);
// }

// function getRenderedStat(plain, heading) {
//   const headings = Array.isArray(heading) ? heading : [heading];

//   for (const h of headings) {
//     const regex = new RegExp(
//       `${h}\\s*(?:\\[\\/wiki\\/[^\\]]+\\])?:\\s*\\n+([\\s\\S]*?)(?=\\n\\n[A-Z][A-Z '\\-/()]+(?:\\s*\\[\\/wiki\\/[^\\]]+\\])?:\\s*\\n|\\n\\nPORTRAYAL|\\n\\nDEVIL FRUIT|\\n\\nABILITIES|$)`,
//       'i'
//     );

//     const match = plain.match(regex);
//     if (match?.[1]) return cleanText(match[1]);
//   }

//   return null;
// }

// function getInfoboxField(source, fieldName) {
//   const regex = new RegExp(
//     `\\|\\s*${fieldName}\\s*=\\s*([\\s\\S]*?)(?=\\n\\|\\s*[a-zA-Z0-9_ -]+\\s*=|\\n}})`,
//     'i'
//   );

//   const match = source.match(regex);
//   return cleanWiki(match?.[1]);
// }

// function getInfoboxFieldsByPrefix(source, prefix) {
//   const regex = new RegExp(
//     `\\|\\s*(${prefix}\\d*)\\s*=\\s*([\\s\\S]*?)(?=\\n\\|\\s*[a-zA-Z0-9_ -]+\\s*=|\\n}})`,
//     'gi'
//   );

//   return [...source.matchAll(regex)]
//     .map((match) => ({
//       key: match[1].trim().toLowerCase(),
//       value: cleanWiki(match[2]),
//     }))
//     .filter((item) => item.value);
// }

// function normaliseStatus(value, categories) {
//   const raw = cleanText(value);

//   if (hasCategory(categories, [/Deceased Characters/i])) return 'Deceased';
//   if (hasCategory(categories, [/Living Characters/i])) return 'Alive';

//   if (raw === '1') return 'Alive';
//   if (raw === '2') return 'Deceased';
//   if (raw === '3') return 'Unknown';

//   if (!raw) return null;

//   const lower = raw.toLowerCase();
//   if (lower.includes('deceased') || lower.includes('dead')) return 'Deceased';
//   if (lower.includes('alive') || lower.includes('living')) return 'Alive';

//   return raw;
// }

// function normaliseGender(value) {
//   if (!value) return null;

//   const lower = value.toLowerCase();
//   if (lower.includes('female')) return 'Female';
//   if (lower.includes('male')) return 'Male';

//   return cleanText(value);
// }

// function normaliseRace(value) {
//   if (!value) return null;

//   return cleanText(value)
//     ?.replace(/\s*\(.*?\)\s*/g, '')
//     .trim() || null;
// }

// function pickPreferredEnglishFruitName(value) {
//   if (!value) return null;

//   const parts = value
//     .split(';')
//     .map((x) => x.trim())
//     .filter(Boolean)
//     .map((x) => x.replace(/\s*\(VIZ\)/gi, '').trim());

//   return parts.at(-1) || null;
// }

// function extractBountyFromText(value) {
//   if (!value) return null;

//   const text = String(value)
//     .replace(/<s>|<\/s>|<strike>|<\/strike>/gi, '')
//     .replace(/\{\{Bounty\|([^}|]+).*?\}\}/gi, '$1')
//     .replace(/\{\{Beli\|([^}|]+).*?\}\}/gi, '$1')
//     .replace(/\{\{Berry\|([^}|]+).*?\}\}/gi, '$1')
//     .replace(/\d{14}/g, '')
//     .replace(/\d{12}/g, '');

//   const matches = [...text.matchAll(/\d[\d,]{3,}/g)]
//     .map((m) => Number(m[0].replaceAll(',', '')))
//     .filter((n) => Number.isFinite(n))
//     .filter((n) => n >= 1000 && n < 10000000000);

//   if (!matches.length) return null;

//   return Math.max(...matches);
// }

// function extractBounty(source, plain) {
//   const infoboxBounty =
//     getInfoboxField(source, 'bounty') ||
//     getInfoboxField(source, 'bounty1');

//   const fromInfobox = extractBountyFromText(infoboxBounty);
//   if (fromInfobox) return fromInfobox;

//   const bountyBlock = getRenderedStat(plain, 'BOUNTY');
//   return extractBountyFromText(bountyBlock);
// }

// function extractFruitFromRenderedText(plain) {
//   const compact = plain
//     .replace(/\r/g, '')
//     .replace(/\n{3,}/g, '\n\n');

//   const match =
//     compact.match(
//       /DEVIL FRUIT[\s\S]{0,800}?JAPANESE NAME:\s*\n+\s*([^\n]+)[\s\S]{0,400}?(?:OFFICIAL ENGLISH NAME|ENGLISH NAME):\s*\n+\s*([^\n]+)/i
//     ) ||
//     compact.match(
//       /Devil Fruit[\s\S]{0,800}?Japanese Name:\s*\n+\s*([^\n]+)[\s\S]{0,400}?(?:Official English Name|English Name):\s*\n+\s*([^\n]+)/i
//     );

//   if (!match) {
//     return {
//       devilFruitName: null,
//       devilFruitEnglishName: null,
//     };
//   }

//   return {
//     devilFruitName: cleanText(match[1]),
//     devilFruitEnglishName: cleanText(match[2]),
//   };
// }

// function hasCategory(categories, patterns) {
//   return categories.some((cat) =>
//     patterns.some((pattern) => pattern.test(cat))
//   );
// }

// function extractHakiTypesFromCategories(categories) {
//   const haki = [];

//   if (hasCategory(categories, [/Observation Haki Users/i, /Kenbunshoku Haki Users/i])) {
//     haki.push('Observation');
//   }

//   if (hasCategory(categories, [/Armament Haki Users/i, /Busoshoku Haki Users/i])) {
//     haki.push('Armament');
//   }

//   if (hasCategory(categories, [/Supreme King Haki Users/i, /Conqueror'?s Haki Users/i, /Haoshoku Haki Users/i])) {
//     haki.push('Conquerors');
//   }

//   return [...new Set(haki)];
// }

// function extractDevilFruitTypeFromCategories(categories) {
//   if (hasCategory(categories, [/Mythical Zoan Devil Fruit Users/i])) return 'Mythical Zoan';
//   if (hasCategory(categories, [/Ancient Zoan Devil Fruit Users/i])) return 'Ancient Zoan';
//   if (hasCategory(categories, [/Logia Devil Fruit Users/i])) return 'Logia';
//   if (hasCategory(categories, [/Paramecia Devil Fruit Users/i])) return 'Paramecia';
//   if (hasCategory(categories, [/Zoan Devil Fruit Users/i])) return 'Zoan';

//   return null;
// }

// function isAnimeCharacter(source, plain, categories) {
//   if (hasCategory(categories, [/Anime Characters/i])) return true;

//   const debut =
//     getInfoboxField(source, 'debut') ||
//     getInfoboxField(source, 'anime') ||
//     getInfoboxField(source, 'anime debut') ||
//     getInfoboxField(source, 'debut anime') ||
//     getRenderedStat(plain, 'DEBUT');

//   return /Episode\s+\d+/i.test(debut || '');
// }

// function extractLeadBio(plain, title) {
//   const name = title.replaceAll('_', ' ');

//   const paragraphs = plain
//     .split(/\n\s*\n/)
//     .map((s) => cleanText(s))
//     .filter(Boolean)
//     .filter((s) => s.length > 120)
//     .filter((s) => !s.includes('Featured Article'))
//     .filter((s) => !s.includes('Ahoy!'))
//     .filter((s) => !s.includes('data:image'))
//     .filter((s) => !s.includes('Advertisement'))
//     .filter((s) => !s.includes('For other uses'))
//     .filter((s) => !s.includes('Template:'))
//     .filter((s) => !s.includes('action=edit'));

//   return (
//     paragraphs.find((s) =>
//       s.toLowerCase().includes(name.toLowerCase().split(' ')[0])
//     ) ||
//     paragraphs[0] ||
//     null
//   )?.slice(0, 1600) || null;
// }

// async function getWikiData(title) {
//   const [parseData, imageData, sourceData, categoryData, extractData] = await Promise.all([
//     wiki({
//       action: 'parse',
//       page: title,
//       prop: 'text',
//       redirects: '1',
//     }),
//     wiki({
//       action: 'query',
//       titles: title,
//       prop: 'pageimages',
//       piprop: 'original',
//       redirects: '1',
//     }),
//     wiki({
//       action: 'parse',
//       page: title,
//       prop: 'wikitext',
//       redirects: '1',
//     }),
//     wiki({
//       action: 'query',
//       titles: title,
//       prop: 'categories',
//       cllimit: '500',
//       redirects: '1',
//     }),
//     wiki({
//       action: 'query',
//       titles: title,
//       prop: 'extracts',
//       exintro: '1',
//       explaintext: '1',
//       redirects: '1',
//     }),
//   ]);

//   const html = parseData.parse?.text?.['*'] || '';
//   const source = sourceData.parse?.wikitext?.['*'] || '';

//   const plain = htmlToText(html, {
//     wordwrap: false,
//     selectors: [
//       { selector: '.navbox', format: 'skip' },
//       { selector: '.toc', format: 'skip' },
//       { selector: 'script', format: 'skip' },
//       { selector: 'style', format: 'skip' },
//     ],
//   })
//     .replace(/\n{3,}/g, '\n\n')
//     .trim();

//   const imagePages = imageData.query?.pages || {};
//   const imagePage = Object.values(imagePages)[0] || {};

//   const categoryPages = categoryData.query?.pages || {};
//   const categoryPage = Object.values(categoryPages)[0] || {};
//   const categories = (categoryPage.categories || [])
//     .map((c) => c.title.replace(/^Category:/, '').trim())
//     .filter(Boolean);

//   const active = isAnimeCharacter(source, plain, categories);

//   const introSource = source.split(/^==/m)[0];

//   const introWithoutInfobox = introSource
//     .replace(/^\s*\{\{Character[\s\S]*?\n\}\}/i, '')
//     .replace(/^\s*\{\{Tabs[\s\S]*?\n\}\}/i, '')
//     .replace(/^\s*\{\{Character Tabs[\s\S]*?\n\}\}/i, '');

//   const introWithoutTemplates = introWithoutInfobox
//     .replace(/\{\{Featured Article[\s\S]*?\}\}/gi, '')
//     .replace(/\{\{FA[\s\S]*?\}\}/gi, '')
//     .replace(/\{\{For\|[\s\S]*?\}\}/gi, '')
//     .replace(/\{\{About\|[\s\S]*?\}\}/gi, '')
//     .replace(/\{\{[^{}]*\}\}/g, '')
//     .trim();

//   const introPlain = cleanWiki(introWithoutTemplates);

//   let cleanedBio = introPlain
//     ?.replace(/^:\s*The subject of this article is sometimes called.*?\.\s*/i, '')
//     ?.replace(/^:\s*For other uses.*?\.\s*/i, '')
//     ?.replace(/^:\s*/, '');

//   const titleWords = title
//     .replaceAll('_', ' ')
//     .split(/\s+/)
//     .filter((word) => word.length > 1);

//   const bioStart = cleanedBio?.search(
//     new RegExp(titleWords.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i')
//   );

//   cleanedBio =
//     bioStart !== undefined && bioStart >= 0
//       ? cleanedBio.slice(bioStart)
//       : cleanedBio;

//   const protectedIntro = cleanedBio
//     ?.replace(/\bMr\./g, 'Mr§')
//     ?.replace(/\bMrs\./g, 'Mrs§')
//     ?.replace(/\bMs\./g, 'Ms§')
//     ?.replace(/\bDr\./g, 'Dr§')
//     ?.replace(/\bD\./g, 'D§');

//   const shortBio =
//     protectedIntro
//       ?.match(/[^.!?]*[.!?]/)?.[0]
//       ?.replace(/\bMr§/g, 'Mr.')
//       ?.replace(/\bMrs§/g, 'Mrs.')
//       ?.replace(/\bMs§/g, 'Ms.')
//       ?.replace(/\bDr§/g, 'Dr.')
//       ?.replace(/\bD§/g, 'D.')
//       ?.trim() ||
//     cleanedBio ||
//     null;

//   const affiliations =
//     splitList(getInfoboxField(source, 'affiliation') || getInfoboxField(source, 'affiliations')).length
//       ? splitList(getInfoboxField(source, 'affiliation') || getInfoboxField(source, 'affiliations'))
//       : splitList(getRenderedStat(plain, 'AFFILIATIONS'));

//   const origin =
//     getInfoboxField(source, 'origin') ||
//     cleanText(getRenderedStat(plain, 'ORIGIN'));

//   const status = normaliseStatus(
//     getInfoboxField(source, 'status') || getRenderedStat(plain, 'STATUS'),
//     categories
//   );

//   const gender =
//     normaliseGender(getInfoboxField(source, 'gender')) ||
//     normaliseGender(getRenderedStat(plain, ['GENDER', 'SEX']));

//   const race =
//     normaliseRace(getInfoboxField(source, 'race') || getInfoboxField(source, 'species')) ||
//     normaliseRace(getRenderedStat(plain, ['RACE', 'SPECIES']));

//   const bounty = extractBounty(source, plain);

//   let devilFruitName = null;
//   let devilFruitEnglishName = null;

//   const dfNameFields = getInfoboxFieldsByPrefix(source, 'dfname');
//   const dfEnglishFields = getInfoboxFieldsByPrefix(source, 'dfename');

//   if (dfNameFields.length) {
//     const fruitNames = dfNameFields.map((item) => item.value);

//     const englishNames = dfNameFields.map((nameField, index) => {
//       const suffix = nameField.key.replace('dfname', '');

//       const matchingEnglish =
//         dfEnglishFields.find((item) => item.key === `dfename${suffix}`) ||
//         dfEnglishFields[index];

//       return pickPreferredEnglishFruitName(matchingEnglish?.value);
//     });

//     devilFruitName = fruitNames.filter(Boolean).join('; ') || null;
//     devilFruitEnglishName = englishNames.filter(Boolean).join('; ') || null;
//   }

//   if (!devilFruitName || !devilFruitEnglishName) {
//     const renderedFruit = extractFruitFromRenderedText(plain);
//     devilFruitName = devilFruitName || renderedFruit.devilFruitName;
//     devilFruitEnglishName = devilFruitEnglishName || renderedFruit.devilFruitEnglishName;
//   }

//   const devilFruitType =
//     getInfoboxField(source, 'dftype') ||
//     getInfoboxField(source, 'df type') ||
//     extractDevilFruitTypeFromCategories(categories);

//   const hakiTypes = extractHakiTypesFromCategories(categories);

//   const devilFruitUser =
//     Boolean(devilFruitName) ||
//     hasCategory(categories, [/Devil Fruit Users/i]);

//   const swordsman = hasCategory(categories, [
//     /Swordsmen/i,
//     /Swordsman/i,
//     /Sword Users/i,
//   ]);

//   if (process.env.DEBUG_TITLE) {
//     console.log('\n==============================');
//     console.log(`DEBUG: ${title}`);
//     console.log('==============================');
//     console.log('Active anime character:', active);
//     console.log('Categories:', categories);
//     console.log('Bio:', shortBio);
//     console.log('Affiliations:', affiliations);
//     console.log('Origin:', origin);
//     console.log('Status:', status);
//     console.log('Bounty:', bounty);
//     console.log('Devil Fruit:', {
//       devilFruitName,
//       devilFruitEnglishName,
//       devilFruitType,
//       devilFruitUser,
//     });
//     console.log('Haki:', hakiTypes);
//     console.log('Swordsman:', swordsman);
//     console.log('==============================\n');
//   }

//   return {
//     active,
//     image_url: imagePage.original?.source || null,
//     description: shortBio,

//     affiliations,
//     origin,
//     status,
//     gender,
//     race,
//     bounty,

//     swordsman,
//     haki_user: hakiTypes.length > 0,
//     haki_types: hakiTypes,

//     devil_fruit_user: devilFruitUser,
//     devil_fruit_name: devilFruitName,
//     devil_fruit_english_name: devilFruitEnglishName,
//     devil_fruit_type: devilFruitType,

//     tags: categories,
//   };
// }

// async function main() {
//   const debugTitle = process.env.DEBUG_TITLE;

//   let query = supabase
//     .from('characters')
//     .select(`
//       id,
//       name,
//       wiki_title,
//       wiki_url,
//       needs_enrichment
//     `)
//     .order('name');

//   if (debugTitle) {
//     query = supabase
//       .from('characters')
//       .select(`
//         id,
//         name,
//         wiki_title,
//         wiki_url,
//         needs_enrichment
//       `)
//       .or(`name.ilike.%${debugTitle}%,wiki_title.ilike.%${debugTitle}%`)
//       .order('name');
//   }

//   const { data: characters, error } = await query;

//   if (error) throw error;

//   console.log(`Enriching ${characters.length} characters from wiki`);

//   for (const character of characters) {
//     const title = character.wiki_title || character.name;

//     try {
//       console.log(`Fetching ${title}`);

//       const wikiData = await getWikiData(title);

//       const update = {
//         wiki_title: title,
//         wiki_url:
//           character.wiki_url ||
//           `${WIKI_BASE}${encodeURIComponent(title.replaceAll(' ', '_'))}`,
//         active: wikiData.active,
//         last_synced_at: new Date().toISOString(),
//         needs_enrichment: false,

//         affiliations: wikiData.affiliations || [],
//         origin: wikiData.origin,
//         status: wikiData.status,
//         gender: wikiData.gender,
//         race: wikiData.race,
//         bounty: wikiData.bounty,

//         swordsman: wikiData.swordsman,
//         haki_user: wikiData.haki_user,
//         haki_types: wikiData.haki_types || [],

//         devil_fruit_user: wikiData.devil_fruit_user,
//         devil_fruit_name: wikiData.devil_fruit_name,
//         devil_fruit_english_name: wikiData.devil_fruit_english_name,
//         devil_fruit_type: wikiData.devil_fruit_type,

//         tags: wikiData.tags || [],
//       };

//       if (wikiData.image_url) update.image_url = wikiData.image_url;
//       if (wikiData.description) update.description = wikiData.description;

//       const { error: updateError } = await supabase
//         .from('characters')
//         .update(update)
//         .eq('id', character.id);

//       if (updateError) {
//         console.error(`Supabase update failed for ${title}:`, updateError.message);
//       } else if (!wikiData.active) {
//         console.log(`Hidden ${title}: no anime appearance detected`);
//       } else {
//         console.log(`Updated ${title}`);
//       }

//       if (!debugTitle) {
//         await sleep(1800);
//       }
//     } catch (err) {
//       console.error(`Failed ${title}:`, err.message);
//     }
//   }

//   console.log('Done.');
// }

// main().catch((err) => {
//   console.error(err);
//   process.exit(1);
// });



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
    .replace(/\s*\[https?:\/\/[^\]]+\]/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*;\s*/g, '; ')
    .replace(/\((disbanded|former|defected|unknown status)\)/gi, ' ($1)')
    .replace(/\s+\(/g, ' (')
    .trim() || null;
}

function cleanWiki(value) {
  if (!value) return null;

  return String(value)
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<ref[\s\S]*?<\/ref>/gi, '')
    .replace(/<ref[^>]*\/>/gi, '')
    .replace(/\{\{Qref[\s\S]*?(?:\}\}|$)/gi, '')
    .replace(/\{\{Cite[\s\S]*?(?:\}\}|$)/gi, '')

    // Keep useful visible text from common templates BEFORE deleting templates
    .replace(/\{\{W\|[^|}]+\|([^}]+)\}\}/gi, '$1')
    .replace(/\{\{W\|([^|}]+)\}\}/gi, '$1')
    .replace(/\{\{Nihongo\|\[\[[^\]|]+\|([^\]]+)\]\]\|[^}]*\}\}/gi, '$1')
    .replace(/\{\{Nihongo\|\[\[([^\]]+)\]\]\|[^}]*\}\}/gi, '$1')
    .replace(/\{\{Nihongo\|([^|}]+)\|[^}]*\}\}/gi, '$1')

    .replace(/<small>\s*\((.*?)\)\s*<\/small>/gi, '($1)')
    .replace(/<small>(.*?)<\/small>/gi, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/'''/g, '')
    .replace(/''/g, '')
    .replace(/<br\s*\/?>/gi, '; ')
    .replace(/\{\{!}}/g, '|')
    .replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/\s*\[https?:\/\/[^\]]+\]/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*;\s*/g, '; ')
    .replace(/\s+,/g, ',')
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
  if (raw === '3') return 'Alive';

  if (!raw) return null;

  const lower = raw.toLowerCase();
  if (lower.includes('deceased') || lower.includes('dead')) return 'Deceased';
  if (lower.includes('alive') || lower.includes('living')) return 'Alive';

  return raw;
}

function normaliseGender(value, categories = []) {
  const raw = cleanText(value);

  if (raw) {
    const lower = raw.toLowerCase();

    if (
      lower.includes('female') ||
      lower.includes('woman') ||
      lower.includes('girl')
    ) {
      return 'Female';
    }

    if (
      lower.includes('male') ||
      lower.includes('man') ||
      lower.includes('boy')
    ) {
      return 'Male';
    }
  }

  if (hasCategory(categories, [
    /Female Characters/i,
    /Women/i,
    /Girls/i,
  ])) {
    return 'Female';
  }

  if (hasCategory(categories, [
    /Male Characters/i,
    /Men/i,
    /Boys/i,
  ])) {
    return 'Male';
  }

  return raw || null;
}


function normaliseGenderFromCategories(categories) {
  if (hasCategory(categories, [/Female Characters/i, /Women/i])) return 'Female';
  if (hasCategory(categories, [/Male Characters/i, /Men/i])) return 'Male';
  return null;
}

const CURATED_COMBAT_PROFILES = {
  'Monkey D. Luffy': ['Gear 5 freedom', 'Reckless fighter', 'Gomu Gomu no Bajrang Gun'],
  'Roronoa Zoro': ['Swordsmanship, Haki', 'Poor direction', 'King of Hell Three Sword Style'],
  'Nami': ['Weather control', 'Low durability', 'Thunderbolt Tempo'],
  'Usopp': ['Sniping, tricks', 'Fearful under pressure', 'Special Attack Green Star'],
  'Sanji': ['Speed, flames', 'Won’t hit women', 'Ifrit Jambe'],
  'Tony Tony Chopper': ['Monster Point', 'Naive in combat', 'Monster Point'],
  'Nico Robin': ['Giant limbs', 'Needs visibility', 'Demonio Fleur'],
  'Franky': ['Cyborg weapons', 'Back weakness', 'Franky Radical Beam'],
  'Brook': ['Soul, speed', 'Fragile bones', 'Soul Solid'],
  'Jinbe': ['Fish-Man Karate', 'Less mobile on land', 'Vagabond Drill'],
  'Trafalgar D. Water Law': ['Room manipulation', 'Weak crew support', 'ROOM'],
  'Eustass Kid': ['Magnetism', 'Overcommits', 'Punk Clash'],
  'Shanks': ['Supreme Haki', 'One arm', 'Divine Departure'],
  'Dracule Mihawk': ['World-class swordsmanship', 'Solo fighter', 'Black Blade slash'],
  'Marshall D. Teach': ['Two Devil Fruits', 'Takes extra pain', 'Black Vortex'],
  'Edward Newgate': ['Quake power', 'Age, illness', 'Island-splitting quake'],
  'Gol D. Roger': ['Supreme Haki', 'No fruit shown', 'Divine Departure'],
  'Silvers Rayleigh': ['Advanced Haki', 'Older stamina', 'Haki-coated sword'],
  'Kaido': ['Dragon durability', 'Overconfident', 'Thunder Bagua'],
  'Charlotte Linlin': ['Soul homies', 'Emotional hunger', 'Maser Saber'],
  'Buggy': ['Blade immunity', 'Cowardly tactics', 'Chop-Chop Festival'],
  'Crocodile': ['Sand Logia', 'Water weakness', 'Desert Spada'],
  'Donquixote Doflamingo': ['String control', 'Arrogance', 'Birdcage'],
  'Boa Hancock': ['Petrification', 'Needs attraction', 'Slave Arrow'],
  'Bartholomew Kuma': ['Paw repulsion', 'Lost free will', 'Ursus Shock'],
  'Portgas D. Ace': ['Fire Logia', 'Hot-headed', 'Fire Fist'],
  'Sabo': ['Dragon Claw, fire', 'Protective instincts', 'Dragon Breath'],
  'Monkey D. Dragon': ['Storm mystery', 'Unknown limits', 'Unknown'],
  'Sakazuki': ['Magma offense', 'Rigid tactics', 'Ryusei Kazan'],
  'Kuzan': ['Ice Logia', 'Lower aggression', 'Ice Age'],
  'Borsalino': ['Light speed', 'Casual attitude', 'Yasakani no Magatama'],
  'Issho': ['Gravity control', 'Self-blinded', 'Gravity Blade'],
  'Aramaki': ['Forest Logia', 'Overconfidence', 'Forest vines'],
  'Monkey D. Garp': ['Raw Haki power', 'Age', 'Galaxy Impact'],
  'Sengoku': ['Buddha shockwaves', 'Age', 'Shockwave palm'],
  'Koby': ['Honesty Impact', 'Inexperience', 'Honesty Impact'],
  'Rob Lucci': ['Rokushiki, Zoan', 'Cruel tunnel vision', 'Rokuogan'],
  'Enel': ['Lightning Logia', 'Rubber counter', 'Raigo'],
  'Magellan': ['Venom', 'Stomach issues', 'Venom Demon'],
  'Shiryu': ['Invisible swordsman', 'Treacherous', 'Invisible slash'],
  'Marco': ['Phoenix regeneration', 'Limited offence', 'Phoenix Brand'],
  'King': ['Lunarian durability', 'Speed mode risk', 'Imperial Flaming Wings'],
  'Queen': ['Cyborg plague weapons', 'Clumsy ego', 'Brachio Bomber'],
  'Jack': ['Mammoth stamina', 'Predictable', 'Mammoth charge'],
  'Charlotte Katakuri': ['Future sight', 'Calm can break', 'Mochi Thrust'],
  'Yamato': ['Mythical Zoan', 'Protective focus', 'Thunder Bagua'],
  'Kozuki Oden': ['Legendary swordsman', 'Too trusting', 'Togen Totsuka'],
};

function getCuratedCombatProfile(title) {
  const key = title.replaceAll('_', ' ');
  const profile = CURATED_COMBAT_PROFILES[key];
  if (!profile) return null;
  return {
    strength_summary: profile[0],
    weakness_summary: profile[1],
    signature_move: profile[2],
  };
}

function inferCombatProfile({ title, devilFruitName, devilFruitEnglishName, devilFruitType, hakiTypes, swordsman, race, affiliations }) {
  const curated = getCuratedCombatProfile(title);
  if (curated) return curated;

  const strengths = [];
  if (devilFruitEnglishName || devilFruitName) strengths.push(devilFruitEnglishName || devilFruitName);
  if (devilFruitType) strengths.push(devilFruitType);
  if (hakiTypes?.length) strengths.push(`${hakiTypes[0]} Haki`);
  if (swordsman) strengths.push('Swordsmanship');
  if (!strengths.length && race) strengths.push(race);

  const weakness = devilFruitName
    ? 'Sea weakness'
    : affiliations?.length <= 1
      ? 'Limited support'
      : 'Unknown limits';

  const signature = devilFruitEnglishName || devilFruitName || (swordsman ? 'Sword attack' : hakiTypes?.length ? 'Haki attack' : 'Unknown');

  return {
    strength_summary: strengths.slice(0, 2).join(', ') || 'Unknown',
    weakness_summary: weakness,
    signature_move: signature,
  };
}

function normaliseRace(value) {
  if (!value) return null;

  return cleanText(value)
    ?.replace(/\s*\(.*?\)\s*/g, '')
    .trim() || null;
}

function cleanEnglishFruitName(value) {
  if (!value) return null;

  let cleaned = cleanWiki(value) || cleanText(value);
  if (!cleaned) return null;

  cleaned = cleaned
    .replace(/\s*\((?:VIZ|Viz|Funimation|4Kids|VIZ and Funimation|Funimation dub|One Piece Official YouTube Channel|Crunchy subs)[^)]*\)/gi, '')
    .replace(/;+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  cleaned = cleaned.replace(
    /(Fish-Fish Fruit, Model: Azure Dragon)Fish-Fish Fruit, Azure Dragon Model/i,
    '$1'
  );

  cleaned = cleaned.replace(
    /(Tweet-Tweet Fruit, Phoenix Model).*?(Bird-Bird Fruit, Model: Phoenix)/i,
    '$2'
  );

  cleaned = cleaned.replace(
    /(Snake-Snake Fruit Anaconda Model).*?(Snake-Snake Fruit: Model Anaconda)/i,
    '$1'
  );

  cleaned = cleaned.replace(
    /(Snake-Snake Fruit King Cobra Model).*?(Snake-Snake Fruit: Model King Cobra)/i,
    '$1'
  );

  cleaned = cleaned.replace(
    /Cat-Cat Fruit Leopard Model/i,
    'Cat-Cat Fruit, Model: Leopard'
  );

  cleaned = cleaned.replace(/(Fruit|Jutsu)(?=[A-Z][a-z]+-[A-Z])/g, '$1|||');

  cleaned = cleaned
  .replace(/Snake-Snake Fruit King Cobra Model/i, 'Snake-Snake Fruit, Model: King Cobra')
  .replace(/Snake-Snake Fruit Anaconda Model/i, 'Snake-Snake Fruit, Model: Anaconda')
  .replace(/Ox-Ox Fruit Bison Model/i, 'Ox-Ox Fruit, Model: Bison');

  const parts = cleaned
    .split(/\|\|\||;|, formerly| formerly/i)
    .map((x) => x.trim())
    .filter(Boolean)
    .filter((x) => /fruit|jutsu/i.test(x));
    

  return parts[0] || cleaned || null;
}

function pickPreferredEnglishFruitName(value) {
  return cleanEnglishFruitName(value);
}

function getCrossGuildBountyDisplay(bounty) {
  if (!bounty) {
    return {
      bountyRank: null,
      bountySymbol: null,
    };
  }

  if (bounty >= 1000000000) {
    return {
      bountyRank: Math.floor(bounty / 1000000000),
      bountySymbol: 'crown',
    };
  }

  return {
    bountyRank: Math.floor(bounty / 100000000),
    bountySymbol: 'star',
  };
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

  const renderedBounty = getRenderedStat(plain, 'BOUNTY');
  const bountyText = `${infoboxBounty || ''} ${renderedBounty || ''}`;
  const bounty = extractBountyFromText(bountyText);

  const lower = String(bountyText || '').toLowerCase();

  const renderedCrownCount = (String(renderedBounty || '').match(/crown/gi) || []).length;
  const renderedStarCount = (String(renderedBounty || '').match(/★/g) || []).length;

  const infoboxCrownCount = (String(infoboxBounty || '').match(/crown/gi) || []).length;
  const infoboxStarCount = (String(infoboxBounty || '').match(/★/g) || []).length;

  const crownCount = renderedCrownCount || infoboxCrownCount;
  const starCount = renderedStarCount || infoboxStarCount;
  const bountyType =
    crownCount > 0 || starCount > 0
      ? 'Cross Guild'
      : bounty
        ? 'World Government'
        : null;

  let bountyRank = null;
  let bountySymbol = null;

  if (crownCount > 0) {
    bountyRank = crownCount;
    bountySymbol = 'crown';
  }

  if (starCount > 0) {
    bountyRank = starCount;
    bountySymbol = 'star';
  }

  return {
    bounty,
    bountyType,
    bountyRank,
    bountySymbol,
  };
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
  if (hasCategory(categories, [/Artificial Devil Fruit Users/i]) &&
      hasCategory(categories, [/Mythical Zoan Devil Fruit Users/i])) {
    return 'Mythical Zoan (Artificial)';
  }
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
function isNonIntroBio(text) {
  if (!text) return true;

  const lower = text.toLowerCase();

  return (
    lower.includes('has authority over') ||
    lower.includes('lower-ranking members') ||
    lower.includes('powerful combatant') ||
    lower.includes('skilled combatant') ||
    lower.includes('fighting style') ||
    lower.includes('has demonstrated') ||
    lower.includes('abilities and powers') ||
    lower.includes('in battle') ||
    lower.includes('notably,') ||
    lower.includes('appears in a panel') ||
    lower.includes('romance dawn')
  );
}
function isBadBio(text) {
  if (!text) return true;

  const lower = text.toLowerCase();

  return (
    isNonIntroBio(text) ||
    /^\s*\|/.test(text) ||
    lower.includes('{{char box') ||
    text.length < 25 ||
    /^\s*\|/.test(text) ||
    lower.includes('| rname =') ||
    lower.includes('| affiliation =') ||
    lower.includes('| occupation =') ||
    lower.includes('| birth =') ||
    lower.includes('| blood type =') ||
    lower.includes('| dfname =') ||
    lower.includes('| dfename =') ||
    lower.includes('| rname =') ||
    lower.includes('| affiliation =') ||
    lower.includes('| occupation =') ||
    lower.includes('| birth =') ||
    lower.includes('| blood type =') ||
    lower.includes('static.wikia') ||
    lower.includes('nocookie.net') ||
    lower.includes('fandom logo') ||
    lower.includes('toggle section') ||
    lower.includes('anime [') ||
    lower.includes('manga [') ||
    lower.includes('revision/latest') ||
    lower.includes('scale-to-width') ||
    lower.includes('infobox.png') ||
    lower.includes('help:japanese') ||
    lower.includes('featured article') ||
    lower.includes('has been featured') ||
    lower.includes('article of interest') ||
    lower.includes('data:image') ||
    lower.includes('supporting antagonist') ||
    lower.includes('cover story') ||
    lower.includes('ahoy!') ||
    lower.includes('for the chapter') ||
    lower.includes('for other uses') ||
    lower.includes('see chapter') ||
    lower.includes('template:') ||
    lower.includes('topaction=edit') ||
    lower.includes(' v · e ') ||
    lower.includes('affiliations') ||

    lower.includes('donquixote pirates') ||

    lower.includes('fandom logo') ||
    lower.includes('toggle section') ||
    lower.includes('provided by: fandom') ||
    lower.startsWith('the subject of this article') ||
    /^what led to/i.test(text) ||
    /^due to his actions/i.test(text) ||
    /^["“][^”"]+["”]\s*\([^)]*\)\s*$/i.test(text) ||
    /^[A-Z\s.'-]+\[\s*V\s*·\s*E/i.test(text)
  );
}

function scoreBioCandidate(text, title) {
  const name = title.replaceAll('_', ' ');
  const lower = text.toLowerCase();
  const nameLower = name.toLowerCase();

  let score = 0;

  if (lower.includes(nameLower)) score += 50;
  if (/\b(is|was|are|were)\b/i.test(text)) score += 25;
  if (/\b(is|was)\s+(a|an|the)\b/i.test(text)) score += 30;
  if (text.length >= 80 && text.length <= 260) score += 20;
  if (text.split(';').length > 2) score -= 50;
  if (lower.includes('resulted from')) score -= 30;
  if (/\b(is|was)\s+(a|an|the)\b/i.test(text)) score += 40;

  if (lower.includes('pirate')) score += 20;
  if (lower.includes('marine')) score += 20;
  if (lower.includes('revolutionary')) score += 20;
  if (lower.includes('captain')) score += 15;
  if (lower.includes('officer')) score += 10;
  if (lower.includes('cook')) score += 10;

  if (isNonIntroBio(text)) score -= 100;

  return score;
}


function getBestBio(extractData, plain, title) {
  const extract = cleanText(
    Object.values(extractData.query?.pages || {})[0]?.extract
  );

  const candidates = [
    ...(extract ? extract.split(/(?<=[.!?])\s+/) : []),
  ]
    .map((s) => cleanText(s))
    .filter(Boolean)
    .filter((s) => !isBadBio(s))
    .map((text) => ({
      text,
      score: scoreBioCandidate(text, title),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.text || null;
}

function stripLeadingNonBioTemplates(text) {
  let s = text.trimStart();

  while (s.startsWith('{{')) {
    const nameMatch = s.match(/^\{\{\s*([^|}\n]+)/);
    const templateName = nameMatch?.[1]?.trim() || '';

    const removable =
      templateName === 'Char Box' ||
      templateName === 'Character' ||
      templateName === 'Character Tabs' ||
      templateName === 'Tabs' ||
      templateName === 'Featured Article' ||
      templateName === 'FA' ||
      templateName === 'For' ||
      templateName === 'About' ||
      templateName === 'Quote' ||
      /Tabs Top$/i.test(templateName);

    if (!removable) break;

    let depth = 0;
    let end = -1;

    for (let i = 0; i < s.length - 1; i++) {
      if (s[i] === '{' && s[i + 1] === '{') {
        depth++;
        i++;
      } else if (s[i] === '}' && s[i + 1] === '}') {
        depth--;
        i++;
        if (depth === 0) {
          end = i + 1;
          break;
        }
      }
    }

    if (end === -1) break;

    s = s.slice(end + 1).trimStart();
  }

  return s;
}


function formatBounty(character) {
  if (!character.bounty) return null;

  const amount = character.bounty.toLocaleString();

  if (character.bounty_type === 'Cross Guild') {
    const symbol =
      character.bounty_symbol === 'crown'
        ? '♛'
        : '★';

    return `${symbol.repeat(character.bounty_rank || 1)} ${amount}`;
  }

  return `฿ ${amount}`;
}

function firstCleanSentence(text) {
  if (!text) return null;

  const protectedText = text
    .replace(/\bMr\./g, 'Mr§')
    .replace(/\bMrs\./g, 'Mrs§')
    .replace(/\bMs\./g, 'Ms§')
    .replace(/\bDr\./g, 'Dr§')
    .replace(/\bD\./g, 'D§');

  return protectedText
    .match(/[^.!?]*[.!?]/)?.[0]
    ?.replace(/\bMr§/g, 'Mr.')
    ?.replace(/\bMrs§/g, 'Mrs.')
    ?.replace(/\bMs§/g, 'Ms.')
    ?.replace(/\bDr§/g, 'Dr.')
    ?.replace(/\bD§/g, 'D.')
    ?.trim() || text;
}

function buildBioFromInfobox(title, source) {
  const name = title.replaceAll('_', ' ');

  const occupation = splitList(getInfoboxField(source, 'occupation'));
  const affiliation = splitList(
    getInfoboxField(source, 'affiliation') ||
    getInfoboxField(source, 'affiliations')
  );

  if (!occupation.length && !affiliation.length) return null;

  const roles = occupation
    .map((x) => x.toLowerCase())
    .filter((x) =>
      !x.includes('former') &&
      !x.includes('unknown') &&
      !x.includes('prisoner') &&
      !x.includes('slave')
    )
    .map((x) =>
      x
        .replace(/^queen of newkama land$/i, 'queen')
        .replace(/^king of .*$/i, 'king')
        .replace(/^captain of .*$/i, 'captain')
        .trim()
    )
    .filter(Boolean);

  const mainAffiliation = affiliation[0];

  if (roles.length && mainAffiliation) {
    const roleText =
      roles.length === 1
        ? roles[0]
        : `${roles.slice(0, -1).join(', ')}, and ${roles.at(-1)}`;

    const article = /^[aeiou]/i.test(roleText) ? 'an' : 'a';
    return `${name} is ${article} ${roleText} of ${mainAffiliation}.`;
  }

  if (roles.length) {
    const roleText =
      roles.length === 1
        ? roles[0]
        : `${roles.slice(0, -1).join(', ')}, and ${roles.at(-1)}`;

    const article = /^[aeiou]/i.test(roleText) ? 'an' : 'a';
    return `${name} is ${article} ${roleText}.`;
  }

  if (mainAffiliation) {
    return `${name} is affiliated with ${mainAffiliation}.`;
  }

  return null;
}

function extractIntroBioFromSource(source, title) {
  let introSource = source.split(/^==/m)[0];

  // Remove complete leading templates safely
  introSource = stripLeadingNonBioTemplates(introSource);

  // If any infobox tail remains, cut everything before the final closing braces
  if (/^\s*\|/.test(introSource)) {
    introSource = introSource.replace(/^[\s\S]*?\}\}\s*/, '');
  }

  const cleaned = cleanWiki(introSource)
    .replace(/\{For\|[^}]+\}\}/gi, '')
    .replace(/\{\{For\|[^}]+\}\}/gi, '')
    ?.replace(/^:\s*The subject of this article is sometimes called.*?\.\s*/i, '')
    ?.replace(/^:\s*The subject of this article is often called.*?\.\s*/i, '')
    ?.replace(/^:\s*For other uses.*?\.\s*/i, '')
    ?.replace(/^:\s*/, '')
    ?.trim();

  return firstCleanSentence(cleaned);
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

  let shortBio = extractIntroBioFromSource(source, title);

  if (!shortBio || isBadBio(shortBio)) {
    shortBio = getBestBio(extractData, plain, title);
  }

  if (!shortBio || isBadBio(shortBio)) {
    shortBio = buildBioFromInfobox(title, source);
  }

  if (!shortBio || isBadBio(shortBio)) {
    shortBio = null;
  }

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
    normaliseGender(getInfoboxField(source, 'gender'), categories) ||
    normaliseGender(getRenderedStat(plain, ['GENDER', 'SEX']), categories) ||
    normaliseGenderFromCategories(categories);

  const race =
    normaliseRace(getInfoboxField(source, 'race') || getInfoboxField(source, 'species')) ||
    normaliseRace(getRenderedStat(plain, ['RACE', 'SPECIES']));

  const { bounty, bountyType, bountyRank, bountySymbol } = extractBounty(source, plain);

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
  devilFruitEnglishName = cleanEnglishFruitName(devilFruitEnglishName);
  const rawDevilFruitType =
    cleanWiki(getInfoboxField(source, 'dftype')) ||
    cleanWiki(getInfoboxField(source, 'df type'));

  const devilFruitType =
    extractDevilFruitTypeFromCategories(categories) ||
    (
      rawDevilFruitType &&
      rawDevilFruitType.length < 40 &&
      !rawDevilFruitType.includes('}}') &&
      !rawDevilFruitType.includes('==')
        ? rawDevilFruitType
        : null
    );

  const hakiTypes = extractHakiTypesFromCategories(categories);

  const devilFruitUser =
    Boolean(devilFruitName) ||
    hasCategory(categories, [/Devil Fruit Users/i]);

  const swordsman = hasCategory(categories, [
    /Swordsmen/i,
    /Swordsman/i,
    /Sword Users/i,
  ]);

  const combatProfile = inferCombatProfile({
    title,
    devilFruitName,
    devilFruitEnglishName,
    devilFruitType,
    hakiTypes,
    swordsman,
    race,
    affiliations,
  });

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
    console.log('RAW INFOBOX BOUNTY:', getInfoboxField(source, 'bounty'));
    console.log('RAW INFOBOX BOUNTY1:', getInfoboxField(source, 'bounty1'));
    console.log('RENDERED BOUNTY BLOCK:', getRenderedStat(plain, 'BOUNTY'));
    console.log('Bounty Type:', bountyType);
    console.log('Bounty Rank:', bountyRank);
    console.log('Bounty Symbol:', bountySymbol);
    console.log('Devil Fruit:', {
      devilFruitName,
      devilFruitEnglishName,
      devilFruitType,
      devilFruitUser,
    });
    console.log('Haki:', hakiTypes);
    console.log('Swordsman:', swordsman);
    console.log('Combat:', combatProfile);
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
    bounty_type: bountyType,
    bounty_rank: bountyRank,
    bounty_symbol: bountySymbol,

    swordsman,
    haki_user: hakiTypes.length > 0,
    haki_types: hakiTypes,

    devil_fruit_user: devilFruitUser,
    devil_fruit_name: devilFruitName,
    devil_fruit_english_name: devilFruitEnglishName,
    devil_fruit_type: devilFruitType,

    strength_summary: combatProfile.strength_summary,
    weakness_summary: combatProfile.weakness_summary,
    signature_move: combatProfile.signature_move,

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
    const title = decodeURIComponent(character.wiki_title || character.name);

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
        bounty_type: wikiData.bounty_type,
        bounty_rank: wikiData.bounty_rank,
        bounty_symbol: wikiData.bounty_symbol,

        swordsman: wikiData.swordsman,
        haki_user: wikiData.haki_user,
        haki_types: wikiData.haki_types || [],

        devil_fruit_user: wikiData.devil_fruit_user,
        devil_fruit_name: wikiData.devil_fruit_name,
        devil_fruit_english_name: wikiData.devil_fruit_english_name,
        devil_fruit_type: wikiData.devil_fruit_type,

        strength_summary: wikiData.strength_summary,
        weakness_summary: wikiData.weakness_summary,
        signature_move: wikiData.signature_move,

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