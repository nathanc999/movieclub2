import { NextResponse } from 'next/server';
import { db, meRow, seed, currentMonth, participants, activeNames } from '@/lib/server';
export async function GET() {
  await seed();
  const row = await meRow();
  if (!row) return NextResponse.json({ user: null, members: await activeNames() });
  const user = row.name, m = await currentMonth();
  const out = { user, admin: row.is_admin, month: m, members: await participants(m) };
  if (row.is_admin) out.roster = (await db.from('members').select('name,active,is_admin').order('created_at')).data;
  if (!m) return NextResponse.json(out);
  const { data: noms } = await db.from('nominations').select('*').eq('month_id', m.id);
  const { data: rks } = await db.from('rankings').select('*').eq('month_id', m.id);
  out.subs = Object.fromEntries(out.members.map(n => [n, noms.filter(x => x.member === n).length]));
  out.voted = Object.fromEntries(out.members.map(n => [n, rks.some(x => x.member === n)]));
  if (m.stage === 'submitting') out.mine = noms.filter(n => n.member === user);
  else if (m.stage === 'voting') {
    out.ballot = noms.map(({ member, slot, ...rest }) => rest).sort((a, b) => a.title.localeCompare(b.title));
    out.myOrder = rks.find(r => r.member === user)?.ord || null;
  } else {
    const pts = Object.fromEntries(noms.map(n => [n.id, 0]));
    rks.forEach(r => r.ord.forEach((id, i) => { if (id in pts) pts[id] += noms.length - i; }));
    out.results = noms.map(n => ({ ...n, points: pts[n.id] })).sort((a, b) => b.points - a.points);
    out.rankings = rks;
  }
  return NextResponse.json(out);
}
