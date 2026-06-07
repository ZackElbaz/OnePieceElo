# One Piece Strongest

A React + Supabase MVP for Tinder-style One Piece strength voting.

## Setup

1. Create a Supabase project.
2. Open Supabase SQL editor and run `supabase/schema.sql`.
3. Copy `.env.example` to `.env` and fill in:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Install and run:

```bash
npm install
npm run sync:wiki
npm run dev
```

## Notes

The sync script uses Fandom/MediaWiki endpoints:

- `action=query&list=categorymembers` for the character roster.
- `action=parse` for wiki page HTML/description.
- `prop=pageimages` for character images.

The script uses heuristic tags for Haki, swordsman and Devil Fruit. For a production version, improve this by parsing infobox templates and category tags.
