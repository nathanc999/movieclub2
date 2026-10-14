import { NextResponse } from 'next/server';
import { db, meRow, currentMonth, participants, activeNames, hash } from '@/lib/server';
const err = (e, s = 400) => NextResponse.json({ error: e }, { status: s });
const ok = () => NextResponse.json({ ok: true });
export async function POST(r) {
  const row = await meRow(); if (!row) return err('Not logged in', 401);
  const user = row.name, admin = row.is_admin, b = await r.json(), m = await currentMonth();
  if (b.type === 'start') {
    if (!admin) return err('Admin only', 403);
    if (!b.label) return err('Type a month name first');
    if (m) await db.from('months').update({ archived: true }).eq('id', m.id);
    const { error } = await db.from('months').insert({ label: b.label, members: await activeNames() });
    return error ? err('Database error: ' + error.message) : ok();
  }
  if (b.type === 'admin_addMember') {
    if (!admin) return err('Admin only', 403);
    if (!/^[A-Za-z0-9]{1,20}$/.test(b.name || '')) return err('Name: letters and numbers only, no spaces');
    if ((b.password || '').length < 4) return err('Password must be at least 4 characters');
    const { data: ex } = await db.from('members').select('active').eq('name', b.name).maybeSingle();
    if (ex?.active) return err('That member already exists');
    const { error } = await db.from('members').upsert({ name: b.name, password_hash: hash(b.password), active: true }, { onConflict: 'name' });
    return error ? err(error.message) : ok();
  }
  if (b.type === 'admin_resetPassword') {
    if (!admin) return err('Admin only', 403);
    await db.from('members').update({ password_hash: hash(b.password) }).eq('name', b.name); return ok();
  }
  if (b.type === 'admin_removeMember') {
    if (!admin) return err('Admin only', 403);
    if (b.name === user) return err("You can't remove yourself");
    await db.from('members').update({ active: false }).eq('name', b.name);
    if (m) {
      const ps = (await participants(m)).filter(n => n !== b.name);
      await db.from('nominations').delete().eq('month_id', m.id).eq('member', b.name);
      await db.from('rankings').delete().eq('month_id', m.id);
      const { count } = await db.from('nominations').select('*', { count: 'exact', head: true }).eq('month_id', m.id);
      await db.from('months').update({ members: ps, stage: count >= ps.length * 2 ? 'voting' : 'submitting' }).eq('id', m.id);
    }
    return ok();
  }
  if (!m) return err('No active month');
  const upd = v => db.from('months').update(v).eq('id', m.id);
  if (b.type.startsWith('admin_')) {
    if (!admin) return err('Admin only', 403);
    if (b.type === 'admin_stage') await upd({ stage: b.stage });
    if (b.type === 'admin_label') await upd({ label: b.label });
    if (b.type === 'admin_archive') await upd({ archived: true });
    if (b.type === 'admin_resetSub') { await db.from('nominations').delete().eq('month_id', m.id).eq('member', b.member); await db.from('rankings').delete().eq('month_id', m.id); await upd({ stage: 'submitting' }); }
    if (b.type === 'admin_resetBallot') { await db.from('rankings').delete().eq('month_id', m.id).eq('member', b.member); await upd({ stage: 'voting' }); }
    if (b.type === 'admin_removeNom') { await db.from('nominations').delete().eq('id', b.id); await db.from('rankings').delete().eq('month_id', m.id); await upd({ stage: 'submitting' }); }
    return ok();
  }
  const parts = await participants(m);
  if (!parts.includes(user)) return err('You joined after this month started. You will be in from next month.');
  const { data: noms } = await db.from('nominations').select('*').eq('month_id', m.id);
  if (b.type === 'nominate') {
    if (m.stage !== 'submitting') return err('Submissions are closed');
    if (![0, 1].includes(b.slot)) return err('Bad slot');
    if (noms.find(n => n.tmdb_id === b.tmdb_id && !(n.member === user && n.slot === b.slot)))
      return err('Someone has already nominated this movie. Pick another one.');
    const d = await (await fetch(`https://api.themoviedb.org/3/movie/${b.tmdb_id}?append_to_response=credits&api_key=${process.env.TMDB_API_KEY}`)).json();
    if (!d.id) return err('Movie not found');
    const { error } = await db.from('nominations').upsert({
      month_id: m.id, member: user, slot: b.slot, tmdb_id: d.id, title: d.title, year: (d.release_date || '').slice(0, 4),
      poster: d.poster_path && 'https://image.tmdb.org/t/p/w500' + d.poster_path, runtime: d.runtime,
      director: d.credits?.crew?.find(c => c.job === 'Director')?.name || 'Unknown',
      genre: (d.genres || []).map(g => g.name).join(', '), synopsis: d.overview }, { onConflict: 'month_id,member,slot' });
    if (error) return err('Someone has already nominated this movie. Pick another one.');
    const { count } = await db.from('nominations').select('*', { count: 'exact', head: true }).eq('month_id', m.id);
    if (count === parts.length * 2) await upd({ stage: 'voting' });
    return ok();
  }
  if (b.type === 'rank') {
    if (m.stage !== 'voting') return err('Voting is not open');
    const ids = noms.map(n => n.id).sort();
    if (!Array.isArray(b.order) || JSON.stringify([...b.order].sort()) !== JSON.stringify(ids)) return err('Rank every film exactly once');
    await db.from('rankings').upsert({ month_id: m.id, member: user, ord: b.order });
    const { count } = await db.from('rankings').select('*', { count: 'exact', head: true }).eq('month_id', m.id);
    if (count === parts.length) await upd({ stage: 'results' });
    return ok();
  }
  return err('Unknown action');
}
