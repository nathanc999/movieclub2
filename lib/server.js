import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { cookies } from 'next/headers';
export const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const sig = v => crypto.createHmac('sha256', process.env.SESSION_SECRET).update(v).digest('hex');
export const makeToken = n => n + '.' + sig(n);
export const hash = p => { const s = crypto.randomBytes(16).toString('hex'); return s + ':' + crypto.scryptSync(p, s, 32).toString('hex'); };
export const check = (p, h) => { const [s, x] = h.split(':'); return x === crypto.scryptSync(p, s, 32).toString('hex'); };
export async function seed() { // first run only: create the original four from your PASS_ variables
  const { count } = await db.from('members').select('*', { count: 'exact', head: true });
  if (count) return;
  await db.from('members').insert((process.env.MEMBERS || 'Nathan,Ethan,Max,Jordan').split(',').map(x => x.trim()).filter(Boolean).map((n, i) => ({
    name: n, is_admin: i === 0, password_hash: hash(process.env['PASS_' + n.toUpperCase()] || 'changeme') })));
}
export async function meRow() {
  const [n, s] = ((await cookies()).get('mc')?.value || '').split('.');
  if (!n || s !== sig(n)) return null;
  const { data } = await db.from('members').select('name,is_admin').eq('name', n).eq('active', true).maybeSingle();
  return data;
}
export const me = async () => (await meRow())?.name || null;
export async function activeNames() {
  const { data } = await db.from('members').select('name').eq('active', true).order('created_at');
  return (data || []).map(x => x.name);
}
export const participants = async m => (m?.members?.length ? m.members : await activeNames());
export async function currentMonth() {
  const { data } = await db.from('months').select('*').eq('archived', false).order('created_at', { ascending: false }).limit(1);
  return data?.[0] || null;
}
