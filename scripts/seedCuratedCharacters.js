import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const WIKI_BASE = 'https://onepiece.fandom.com/wiki/';

const characters = [
// Extra anime characters
['Pandaman', 'Pandaman'],
['Gunko', 'Gunko'],

// Buggy crew / allies
['Alvida', 'Alvida'],
['Galdino', 'Galdino'],
['Mohji', 'Mohji'],
['Cabaji', 'Cabaji'],
['Richie', 'Richie'],

// Vegapunks
['Vegapunk', 'Vegapunk'],
['Shaka', 'Shaka'],
['Lilith', 'Lilith'],
['Edison', 'Edison'],
['Pythagoras', 'Pythagoras'],
['Atlas', 'Atlas'],
['York', 'York'],

// Giants
['Dorry', 'Dorry'],
['Brogy', 'Brogy'],
['Oimo', 'Oimo'],
['Kashii', 'Kashii'],

// Fish-Man Island
['Hody Jones', 'Hody_Jones'],
['Zeo', 'Zeo'],
['Daruma', 'Daruma'],
['Dosun', 'Dosun'],
['Ikaros Much', 'Ikaros_Much'],
['Hyouzou', 'Hyouzou'],
['Hammond', 'Hammond'],
['Vander Decken IX', 'Vander_Decken_IX'],
['Wadatsumi', 'Wadatsumi'],
['Surume', 'Surume'],

// Donquixote Pirates
['Trebol', 'Trebol'],
['Diamante', 'Diamante'],
['Pica', 'Pica'],
['Vergo', 'Vergo'],
['Sugar', 'Sugar'],
['Giolla', 'Giolla'],
['Lao G', 'Lao_G'],
['Machvise', 'Machvise'],
['Senor Pink', 'Senor_Pink'],
['Dellinger', 'Dellinger'],
['Buffalo', 'Buffalo'],
['Gladius', 'Gladius'],
['Baby 5', 'Baby_5'],
['Monet', 'Monet'],
['Donquixote Rosinante', 'Donquixote_Rosinante'],

// Ancient giants
['Oars', 'Oars'],
['Little Oars Jr.', 'Little_Oars_Jr.'],

// Franky Family
['Mozu', 'Mozu'],
['Kiwi', 'Kiwi'],
['Zambai', 'Zambai'],
['Tamagon', 'Tamagon'],

// Corrida Colosseum / Dressrosa
['Hajrudin', 'Hajrudin'],
['Blue Gilly', 'Blue_Gilly'],
['Ideo', 'Ideo'],
['Abdullah', 'Abdullah'],
['Jeet', 'Jeet'],
['Suleiman', 'Suleiman'],
['Orlumbus', 'Orlumbus'],
['Elizabello II', 'Elizabello_II'],
['Dagama', 'Dagama'],
['Boo', 'Boo'],
['Kelly Funk', 'Kelly_Funk'],
['Bobby Funk', 'Bobby_Funk'],
['Tank Lepanto', 'Tank_Lepanto'],
['Ucy', 'Ucy'],
];

const unique = new Map();

for (const [name, wiki_title] of characters) {
  unique.set(wiki_title, {
    name,
    wiki_title,
    wiki_url: `${WIKI_BASE}${wiki_title}`,
    canon: true,
    active: true,
    needs_enrichment: true,
  });
}

const rows = [...unique.values()];

const { error } = await supabase
  .from('characters')
  .upsert(rows, { onConflict: 'wiki_title' });

if (error) {
  console.error(error);
  process.exit(1);
}

console.log(`Seeded ${rows.length} curated mainstream characters.`);
