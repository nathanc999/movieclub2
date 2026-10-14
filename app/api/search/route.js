import { NextResponse } from 'next/server';
import { me } from '@/lib/server';
export async function GET(r) {
  if (!(await me())) return NextResponse.json([], { status: 401 });
  const q = new URL(r.url).searchParams.get('q') || '';
  const j = await (await fetch(`https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(q)}&api_key=${process.env.TMDB_API_KEY}`)).json();
  return NextResponse.json((j.results || []).slice(0, 8).map(m => ({
    id: m.id, title: m.title, year: (m.release_date || '').slice(0, 4),
    poster: m.poster_path && 'https://image.tmdb.org/t/p/w342' + m.poster_path })));
}
