import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { cacheCharacterImage, getImageBucketName, isCachedImage } from './lib/imageCache.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucketName = getImageBucketName();

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

async function main() {
  const { data: characters, error } = await supabase
    .from('characters')
    .select('id,name,image_url')
    .not('image_url', 'is', null)
    .order('name');

  if (error) throw error;

  let cached = 0;
  let skipped = 0;
  let failed = 0;

  for (const character of characters || []) {
    if (!character.image_url || isCachedImage(character.image_url)) {
      skipped += 1;
      continue;
    }

    try {
      await cacheCharacterImage({
        supabase,
        characterId: character.id,
        name: character.name,
        imageUrl: character.image_url,
        bucketName,
      });
      cached += 1;
      console.log(`Cached ${character.name}`);
    } catch (err) {
      failed += 1;
      console.warn(`Could not cache ${character.name}: ${err.message}`);
    }
  }

  console.log(`Done. Cached ${cached}, skipped ${skipped}, failed ${failed}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
