const extensionByType = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export function getImageBucketName() {
  return process.env.SUPABASE_IMAGE_BUCKET || 'character-images';
}

export function isCachedImage(url, bucketName = getImageBucketName()) {
  return Boolean(url && url.includes(`/storage/v1/object/public/${bucketName}/`));
}

function slugify(value) {
  return String(value || 'character')
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'character';
}

async function downloadImage(url) {
  const response = await fetch(url, {
    headers: {
      accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'user-agent': 'Mozilla/5.0 OnePiecePowerRanking image cache',
    },
  });

  if (!response.ok) {
    throw new Error(`download failed ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type')?.split(';')[0]?.toLowerCase() || 'image/jpeg';
  const extension = extensionByType[contentType] || 'jpg';
  const bytes = Buffer.from(await response.arrayBuffer());

  return { bytes, contentType, extension };
}

export async function cacheCharacterImage({
  supabase,
  characterId,
  name,
  imageUrl,
  updateCharacter = true,
  bucketName = getImageBucketName(),
}) {
  if (!imageUrl || isCachedImage(imageUrl, bucketName)) return imageUrl;

  const { bytes, contentType, extension } = await downloadImage(imageUrl);
  const path = `characters/${slugify(name)}-${characterId}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(path, bytes, {
      contentType,
      upsert: true,
    });

  if (uploadError) throw uploadError;

  const { data: publicUrl } = supabase.storage.from(bucketName).getPublicUrl(path);
  const cachedUrl = publicUrl.publicUrl;

  if (updateCharacter) {
    const { error: updateError } = await supabase
      .from('characters')
      .update({ image_url: cachedUrl })
      .eq('id', characterId);

    if (updateError) throw updateError;
  }

  return cachedUrl;
}
