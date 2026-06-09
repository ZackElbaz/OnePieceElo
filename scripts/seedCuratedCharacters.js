import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const WIKI_BASE = 'https://onepiece.fandom.com/wiki/';

const characters = [
  // Straw Hats
  ['Monkey D. Luffy', 'Monkey_D._Luffy'],
  ['Roronoa Zoro', 'Roronoa_Zoro'],
  ['Nami', 'Nami'],
  ['Usopp', 'Usopp'],
  ['Sanji', 'Sanji'],
  ['Tony Tony Chopper', 'Tony_Tony_Chopper'],
  ['Nico Robin', 'Nico_Robin'],
  ['Franky', 'Franky'],
  ['Brook', 'Brook'],
  ['Jinbe', 'Jinbe'],

  // Red Hair Pirates
  ['Shanks', 'Shanks'],
  ['Benn Beckman', 'Benn_Beckman'],
  ['Lucky Roux', 'Lucky_Roux'],
  ['Yasopp', 'Yasopp'],
  ['Uta', 'Uta'],

  // Roger Pirates
  ['Gol D. Roger', 'Gol_D._Roger'],
  ['Silvers Rayleigh', 'Silvers_Rayleigh'],
  ['Scopper Gaban', 'Scopper_Gaban'],
  ['Crocus', 'Crocus'],

  // Whitebeard Pirates
  ['Edward Newgate', 'Edward_Newgate'],
  ['Marco', 'Marco'],
  ['Portgas D. Ace', 'Portgas_D._Ace'],
  ['Jozu', 'Jozu'],
  ['Vista', 'Vista'],
  ['Thatch', 'Thatch'],
  ['Izou', 'Izou'],
  ['Kozuki Oden', 'Kozuki_Oden'],

  // Blackbeard Pirates
  ['Marshall D. Teach', 'Marshall_D._Teach'],
  ['Jesus Burgess', 'Jesus_Burgess'],
  ['Van Augur', 'Van_Augur'],
  ['Laffitte', 'Laffitte'],
  ['Doc Q', 'Doc_Q'],
  ['Stronger', 'Stronger'],
  ['Shiryu', 'Shiryu'],
  ['Catarina Devon', 'Catarina_Devon'],
  ['Avalo Pizarro', 'Avalo_Pizarro'],
  ['Sanjuan Wolf', 'Sanjuan_Wolf'],
  ['Vasco Shot', 'Vasco_Shot'],

  // Big Mom Pirates
  ['Charlotte Linlin', 'Charlotte_Linlin'],
  ['Charlotte Katakuri', 'Charlotte_Katakuri'],
  ['Charlotte Smoothie', 'Charlotte_Smoothie'],
  ['Charlotte Cracker', 'Charlotte_Cracker'],
  ['Charlotte Perospero', 'Charlotte_Perospero'],
  ['Charlotte Oven', 'Charlotte_Oven'],
  ['Charlotte Daifuku', 'Charlotte_Daifuku'],
  ['Charlotte Pudding', 'Charlotte_Pudding'],
  ['Pekoms', 'Pekoms'],
  ['Tamago', 'Tamago'],
  ['Streusen', 'Streusen'],

  // Beast Pirates / Wano
  ['Kaido', 'Kaidou'],
  ['King', 'King'],
  ['Queen', 'Queen'],
  ['Jack', 'Jack'],
  ['Yamato', 'Yamato'],
  ['Ulti', 'Ulti'],
  ['Page One', 'Page_One'],
  ["Who's-Who", 'Who%27s-Who'],
  ['Sasaki', 'Sasaki'],
  ['Black Maria', 'Black_Maria'],
  ['X Drake', 'X_Drake'],
  ['Scratchmen Apoo', 'Scratchmen_Apoo'],
  ['Kurozumi Orochi', 'Kurozumi_Orochi'],

  // Heart / Kid / other Supernovas
  ['Trafalgar D. Water Law', 'Trafalgar_D._Water_Law'],
  ['Bepo', 'Bepo'],
  ['Eustass Kid', 'Eustass_Kid'],
  ['Killer', 'Killer'],
  ['Basil Hawkins', 'Basil_Hawkins'],
  ['Capone Bege', 'Capone_Bege'],
  ['Jewelry Bonney', 'Jewelry_Bonney'],
  ['Urouge', 'Urouge'],

  // Warlords / major pirates
  ['Dracule Mihawk', 'Dracule_Mihawk'],
  ['Crocodile', 'Crocodile'],
  ['Donquixote Doflamingo', 'Donquixote_Doflamingo'],
  ['Boa Hancock', 'Boa_Hancock'],
  ['Bartholomew Kuma', 'Bartholomew_Kuma'],
  ['Gecko Moria', 'Gecko_Moria'],
  ['Buggy', 'Buggy'],
  ['Edward Weevil', 'Edward_Weevil'],

  // Kuja Pirates
  ['Boa Sandersonia', 'Boa_Sandersonia'],
  ['Boa Marigold', 'Boa_Marigold'],
  ['Gloriosa', 'Gloriosa'],

  // Marines
  ['Sakazuki', 'Sakazuki'],
  ['Kuzan', 'Kuzan'],
  ['Borsalino', 'Borsalino'],
  ['Issho', 'Issho'],
  ['Aramaki', 'Aramaki'],
  ['Sengoku', 'Sengoku'],
  ['Monkey D. Garp', 'Monkey_D._Garp'],
  ['Tsuru', 'Tsuru'],
  ['Kong', 'Kong'],
  ['Smoker', 'Smoker'],
  ['Tashigi', 'Tashigi'],
  ['Koby', 'Koby'],
  ['Helmeppo', 'Helmeppo'],
  ['Hina', 'Hina'],
  ['T-Bone', 'T-Bone'],
  ['Sentomaru', 'Sentomaru'],
  ['Momonga', 'Momonga'],
  ['Onigumo', 'Onigumo'],
  ['Doberman', 'Doberman'],
  ['Gion', 'Gion'],
  ['Tokikake', 'Tokikake'],

  // Revolutionary Army
  ['Monkey D. Dragon', 'Monkey_D._Dragon'],
  ['Sabo', 'Sabo'],
  ['Emporio Ivankov', 'Emporio_Ivankov'],
  ['Inazuma', 'Inazuma'],
  ['Belo Betty', 'Belo_Betty'],
  ['Karasu', 'Karasu'],
  ['Morley', 'Morley'],
  ['Lindbergh', 'Lindbergh'],
  ['Koala', 'Koala'],
  ['Hack', 'Hack'],

  // CP9 / CP0
  ['Rob Lucci', 'Rob_Lucci'],
  ['Kaku', 'Kaku'],
  ['Jabra', 'Jabra'],
  ['Blueno', 'Blueno'],
  ['Kalifa', 'Kalifa'],
  ['Kumadori', 'Kumadori'],
  ['Fukurou', 'Fukurou'],
  ['Spandam', 'Spandam'],
  ['Stussy', 'Stussy'],

  // East Blue / early arcs
  ['Arlong', 'Arlong'],
  ['Hatchan', 'Hatchan'],
  ['Don Krieg', 'Don_Krieg'],
  ['Gin', 'Gin'],
  ['Kuro', 'Kuro'],
  ['Alvida', 'Alvida'],
  ['Zeff', 'Zeff'],
  ['Bell-mère', 'Bell-mère'],

  // Laboon / Reverse Mountain / Drum / Alabasta
  ['Laboon', 'Laboon'],
  ['Crocus', 'Crocus'],
  ['Nefertari Vivi', 'Nefertari_Vivi'],
  ['Nefertari Cobra', 'Nefertari_Cobra'],
  ['Karoo', 'Karoo'],
  ['Pell', 'Pell'],
  ['Chaka', 'Chaka'],
  ['Igaram', 'Igaram'],
  ['Koza', 'Koza'],
  ['Dalton', 'Dalton'],
  ['Kureha', 'Kureha'],
  ['Wapol', 'Wapol'],
  ['Bentham', 'Bentham'],
  ['Daz Bonez', 'Daz_Bonez'],
  ['Galdino', 'Galdino'],
  ['Zala', 'Zala'],

  // Skypiea
  ['Enel', 'Enel'],
  ['Gan Fall', 'Gan_Fall'],
  ['Wyper', 'Wyper'],
  ['Conis', 'Conis'],
  ['Pagaya', 'Pagaya'],
  ['Pierre', 'Pierre'],

  // Water 7 / Enies Lobby
  ['Iceburg', 'Iceburg'],
  ['Paulie', 'Paulie'],
  ['Kokoro', 'Kokoro'],
  ['Chimney', 'Chimney'],
  ['Tom', 'Tom'],

  // Ohara
  ['Clover', 'Clover'],
  ['Jaguar D. Saul', 'Jaguar_D._Saul'],
  ['Nico Olvia', 'Nico_Olvia'],

  // Thriller Bark
  ['Perona', 'Perona'],
  ['Absalom', 'Absalom'],
  ['Hogback', 'Hogback'],
  ['Ryuma', 'Shimotsuki_Ryuma'],

  // Fish-Man Island
  ['Shirahoshi', 'Shirahoshi'],
  ['Neptune', 'Neptune'],
  ['Fukaboshi', 'Fukaboshi'],
  ['Hody Jones', 'Hody_Jones'],
  ['Fisher Tiger', 'Fisher_Tiger'],
  ['Otohime', 'Otohime'],
  ['Camie', 'Camie'],
  ['Pappag', 'Pappag'],

  // Punk Hazard / Dressrosa
  ['Caesar Clown', 'Caesar_Clown'],
  ['Monet', 'Monet'],
  ['Vergo', 'Vergo'],
  ['Rebecca', 'Rebecca'],
  ['Kyros', 'Kyros'],
  ['Viola', 'Viola'],
  ['Bellamy', 'Bellamy'],
  ['Bartolomeo', 'Bartolomeo'],
  ['Cavendish', 'Cavendish'],
  ['Sai', 'Sai'],
  ['Don Chinjao', 'Chinjao'],
  ['Sugar', 'Sugar'],
  ['Trebol', 'Trebol'],
  ['Diamante', 'Diamante'],
  ['Pica', 'Pica'],

  // Zou / Wano allies
  ['Inuarashi', 'Inuarashi'],
  ['Nekomamushi', 'Nekomamushi'],
  ['Wanda', 'Wanda'],
  ['Carrot', 'Carrot'],
  ["Kin'emon", 'Kin%27emon'],
  ['Kozuki Momonosuke', 'Kozuki_Momonosuke'],
  ['Denjiro', 'Denjiro'],
  ['Ashura Doji', 'Ashura_Doji'],
  ['Kikunojo', 'Kikunojo'],
  ['Kawamatsu', 'Kawamatsu'],
  ['Raizo', 'Raizo'],
  ['Hyogoro', 'Hyogoro'],
  ['Kozuki Hiyori', 'Kozuki_Hiyori'],

  // Whole Cake / Germa
  ['Vinsmoke Judge', 'Vinsmoke_Judge'],
  ['Vinsmoke Reiju', 'Vinsmoke_Reiju'],
  ['Vinsmoke Ichiji', 'Vinsmoke_Ichiji'],
  ['Vinsmoke Niji', 'Vinsmoke_Niji'],
  ['Vinsmoke Yonji', 'Vinsmoke_Yonji'],

  // Impel Down
  ['Magellan', 'Magellan'],
  ['Hannyabal', 'Hannyabal'],
  ['Shiliew', 'Shiliew'],
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