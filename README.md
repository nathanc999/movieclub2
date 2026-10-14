# Movie Club (plain title version). Use a NEW Supabase project so this club has its own data.
ACTION REQUIRED FROM ME
1. supabase.com → New project → SQL Editor → paste `supabase/schema.sql` → Run.
2. Supabase → Project Settings → API: copy Project URL (SUPABASE_URL) and the `service_role` key (SUPABASE_SERVICE_KEY).
3. themoviedb.org → free account → Settings → API → copy the API Key (v3) (TMDB_API_KEY).
4. Copy `.env.example` to `.env.local`, fill in everything (choose a password for each member, and a long random SESSION_SECRET).
5. Run: `npm install && npm run dev` → http://localhost:3000. Log in as Nathan, type "October 2026", click "Start new month".
Deploy: push to GitHub → vercel.com → Import repo → paste the same env vars in Project Settings → Deploy.
