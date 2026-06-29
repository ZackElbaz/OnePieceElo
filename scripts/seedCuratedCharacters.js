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

// Cross Guild
['Dracule Mihawk', 'Dracule_Mihawk'],
['Crocodile', 'Crocodile'],
['Daz Bonez', 'Daz_Bonez'],

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

// SWORD / Marines / World Government
['Koby', 'Koby'],
['Helmeppo', 'Helmeppo'],
['X Drake', 'X_Drake'],
['Hibari', 'Hibari'],
['Prince Grus', 'Prince_Grus'],
['Kujaku', 'Kujaku'],
['Monkey D. Garp', 'Monkey_D._Garp'],
['Bogard', 'Bogard'],
['Tsuru', 'Tsuru'],
['Smoker', 'Smoker'],
['Tashigi', 'Tashigi'],
['Hina', 'Hina'],
['Sentomaru', 'Sentomaru'],
['Kong', 'Kong'],
['Saint Jaygarcia Saturn', 'Jaygarcia_Saturn'],
['Saint Marcus Mars', 'Marcus_Mars'],
['Saint Topman Warcury', 'Topman_Warcury'],
['Saint Ethanbaron V. Nusjuro', 'Ethanbaron_V._Nusjuro'],
['Saint Shepherd Ju Peter', 'Shepherd_Ju_Peter'],

// Roger Pirates
['Silvers Rayleigh', 'Silvers_Rayleigh'],
['Scopper Gaban', 'Scopper_Gaban'],
['Crocus', 'Crocus'],
['Kozuki Oden', 'Kozuki_Oden'],
['Shanks', 'Shanks'],
['Buggy', 'Buggy'],

// Whitebeard Pirates
['Marco', 'Marco'],
['Jozu', 'Jozu'],
['Vista', 'Vista'],
['Thatch', 'Thatch'],
['Izo', 'Izo'],
['Namur', 'Namur'],
['Fossa', 'Fossa'],
['Haruta', 'Haruta'],
['Speed Jiru', 'Speed_Jiru'],
['Squard', 'Squard'],

// Heart Pirates
['Trafalgar D. Water Law', 'Trafalgar_D._Water_Law'],
['Bepo', 'Bepo'],
['Shachi', 'Shachi'],
['Penguin', 'Penguin'],
['Jean Bart', 'Jean_Bart'],

// Kid Pirates
['Eustass Kid', 'Eustass_Kid'],
['Killer', 'Killer'],

// Big Mom Pirates / Charlotte Family
['Charlotte Linlin', 'Charlotte_Linlin'],
['Charlotte Katakuri', 'Charlotte_Katakuri'],
['Charlotte Perospero', 'Charlotte_Perospero'],
['Charlotte Smoothie', 'Charlotte_Smoothie'],
['Charlotte Cracker', 'Charlotte_Cracker'],
['Charlotte Oven', 'Charlotte_Oven'],
['Charlotte Daifuku', 'Charlotte_Daifuku'],
['Charlotte Brulee', 'Charlotte_Brulee'],
['Charlotte Mont-d\'Or', 'Charlotte_Mont-d\'Or'],
['Charlotte Opera', 'Charlotte_Opera'],
['Tamago', 'Tamago'],
['Pekoms', 'Pekoms'],

// Kuja Pirates
['Boa Hancock', 'Boa_Hancock'],
['Boa Sandersonia', 'Boa_Sandersonia'],
['Boa Marigold', 'Boa_Marigold'],
['Gloriosa', 'Gloriosa'],

// Beasts Pirates
['Ulti', 'Ulti'],
['Page One', 'Page_One'],

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

// Arabasta
['Karoo', 'Karoo'],

// Franky Family
['Mozu', 'Mozu'],
['Kiwi', 'Kiwi'],
['Zambai', 'Zambai'],

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
  unique.set(name, {
    name,
    wiki_title,
    wiki_url: `${WIKI_BASE}${wiki_title}`,
    canon: true,
    active: true,
    needs_enrichment: true,
  });
}

const rows = [...unique.values()];

const { data: existingCharacters, error: existingError } = await supabase
  .from('characters')
  .select('name');

if (existingError) {
  console.error(existingError);
  process.exit(1);
}

const existingNames = new Set((existingCharacters || []).map(character => character.name));
const newRows = rows.filter(row => !existingNames.has(row.name));

if (!newRows.length) {
  console.log('No new curated characters to seed.');
  process.exit(0);
}

const { error } = await supabase
  .from('characters')
  .insert(newRows);

if (error) {
  console.error(error);
  process.exit(1);
}

console.log(`Seeded ${newRows.length} new curated mainstream characters.`);
