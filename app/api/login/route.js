import { NextResponse } from 'next/server';
import { db, seed, check, makeToken } from '@/lib/server';
export async function POST(r) {
  await seed();
  const { name, password } = await r.json();
  const { data: m } = await db.from('members').select('*').eq('name', name || '').eq('active', true).maybeSingle();
  if (!m || !password || !check(password, m.password_hash)) return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set('mc', makeToken(m.name), { httpOnly: true, maxAge: 31536000, path: '/', sameSite: 'lax' });
  return res;
}
