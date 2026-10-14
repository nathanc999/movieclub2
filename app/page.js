'use client';
import { useEffect, useState } from 'react';
const api = (u, body) => fetch(u, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}).then(r => r.json());
const Poster = ({ m, onClick, cls = '' }) => (
  <div className={'card ' + cls} onClick={onClick}><img src={m.poster || ''} alt="" /><div><b>{m.title}</b><br /><span className="mut">{m.year} · {m.runtime}m<br />{m.genre}</span></div></div>);

export default function Home() {
  const [s, setS] = useState(null), [msg, setMsg] = useState(''), [info, setInfo] = useState(null);
  const load = () => api('/api/state').then(setS);
  useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, []);
  const act = async b => { const r = await api('/api/action', b); setMsg(r.error || ''); load(); };
  if (!s) return <main>Loading…</main>;
  if (!s.user) return <Login onDone={load} members={s.members || []} />;
  const m = s.month;
  return (<main>
    <div className="row" style={{ justifyContent: 'space-between' }}><h1>MOVIE CLUB</h1><span className="mut">{s.user} · <a href="#" onClick={async e => { e.preventDefault(); await fetch('/api/logout', { method: 'POST' }); load(); }}>log out</a></span></div>
    {!m ? <h2>No active month yet</h2> : <>
      <h2>{m.label}</h2>
      {m.stage === 'submitting' && <Submit s={s} act={act} />}
      {m.stage === 'voting' && <Ballot s={s} act={act} setInfo={setInfo} />}
      {m.stage === 'results' && <Results s={s} setInfo={setInfo} />}
    </>}
    {msg && <p className="err">{msg}</p>}
    {s.admin && <Admin s={s} act={act} />}
    {info && <div className="modal" onClick={() => setInfo(null)}><div><h2>{info.title} ({info.year})</h2><p className="mut">Dir. {info.director} · {info.runtime}m · {info.genre}</p><p>{info.synopsis}</p></div></div>}
  </main>);
}

function Login({ onDone, members }) {
  const [name, setName] = useState(members[0] || ''), [password, setPw] = useState(''), [e, setE] = useState('');
  const go = async () => { const r = await api('/api/login', { name, password }); r.error ? setE(r.error) : onDone(); };
  return (<main><h1>MOVIE CLUB</h1><h2>Who's watching?</h2>
    <div className="row">{members.map(n => <button key={n} className={n === name ? 'p' : ''} onClick={() => setName(n)}>{n}</button>)}</div><br />
    <div className="row"><input type="password" placeholder="Password" value={password} onChange={x => setPw(x.target.value)} onKeyDown={x => x.key === 'Enter' && go()} /><button className="p" onClick={go}>Enter</button></div><p className="err">{e}</p></main>);
}

function Submit({ s, act }) {
  const [q, setQ] = useState(''), [res, setRes] = useState([]), [slot, setSlot] = useState(0);
  const search = async () => setRes(await api('/api/search?q=' + encodeURIComponent(q)));
  return (<>
    <h3>Submit your two movies</h3>
    <p className="mut">{s.members.map(n => `${n}: ${s.subs[n]}/2`).join('  ·  ')}</p>
    <div className="grid">{[0, 1].map(i => { const n = s.mine.find(x => x.slot === i);
      return n ? <Poster key={i} m={n} cls={slot === i ? 'win' : ''} onClick={() => setSlot(i)} /> : <div key={i} className="card" onClick={() => setSlot(i)}><div>Pick #{i + 1}</div></div>; })}</div>
    <h3>Searching for pick #{slot + 1}</h3>
    <div className="row"><input placeholder="Search TMDB…" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} /><button onClick={search}>Search</button></div><br />
    <div className="grid">{res.map(r => <Poster key={r.id} m={r} onClick={async () => { await act({ type: 'nominate', tmdb_id: r.id, slot }); setRes([]); }} />)}</div>
  </>);
}

function Ballot({ s, act, setInfo }) {
  const [order, setOrder] = useState(s.myOrder || s.ballot.map(b => b.id)), [drag, setDrag] = useState(null);
  const by = Object.fromEntries(s.ballot.map(b => [b.id, b]));
  const drop = i => { if (drag === null) return; const o = [...order]; const [x] = o.splice(drag, 1); o.splice(i, 0, x); setOrder(o); setDrag(null); };
  return (<>
    <h3>The ballot is open — drag to rank (1 = most want to watch)</h3>
    <p className="mut">{s.members.map(n => `${n}: ${s.voted[n] ? 'Voted' : 'Waiting'}`).join('  ·  ')}</p>
    {order.map((id, i) => <div key={id} className="rank" draggable onDragStart={() => setDrag(i)} onDragOver={e => e.preventDefault()} onDrop={() => drop(i)}>
      <b>{i + 1}</b><img src={by[id].poster} alt="" /><span style={{ flex: 1 }}>{by[id].title} <span className="mut">({by[id].year})</span></span>
      <button onClick={() => setInfo(by[id])}>Info</button>
      <button onClick={() => i > 0 && (setOrder(o => { const n = [...o];[n[i - 1], n[i]] = [n[i], n[i - 1]]; return n; }))}>↑</button></div>)}
    <button className="p" onClick={() => act({ type: 'rank', order })}>{s.myOrder ? 'Update my ranking' : 'Submit my ranking'}</button>
  </>);
}

function Results({ s, setInfo }) {
  const top = s.results.slice(0, 4), cut = s.results.slice(4);
  return (<>
    <h3>The results are in</h3><h2>Movie Club picks</h2>
    <div className="grid">{top.map((m, i) => <div key={m.id}><Poster m={m} cls="win" onClick={() => setInfo(m)} /><p>#{i + 1} · {m.points} pts<br /><span className="mut">Submitted by {m.member}</span></p></div>)}</div>
    <h3>The cut</h3>
    <div className="grid">{cut.map((m, i) => <div key={m.id} style={{ opacity: .6 }}><Poster m={m} onClick={() => setInfo(m)} /><p>#{i + 5} · {m.points} pts<br /><span className="mut">Submitted by {m.member}</span></p></div>)}</div>
  </>);
}

function Admin({ s, act }) {
  const [label, setLabel] = useState(''), [nm, setNm] = useState(''), [pw, setPw] = useState('');
  return (<><hr style={{ margin: '40px 0 16px' }} /><h3>Admin: this month</h3>
    <div className="row"><input placeholder="e.g. October 2026" value={label} onChange={e => setLabel(e.target.value)} />
      <button className="p" onClick={() => act({ type: 'start', label })}>Start new month</button>
      {s.month && <><button onClick={() => act({ type: 'admin_label', label })}>Rename</button>
        {['submitting', 'voting', 'results'].map(st => <button key={st} onClick={() => act({ type: 'admin_stage', stage: st })}>Set: {st}</button>)}
        <button onClick={() => act({ type: 'admin_archive' })}>Archive</button>
        {s.members.map(n => <span key={n}><button onClick={() => act({ type: 'admin_resetSub', member: n })}>Reset {n}'s picks</button> <button onClick={() => act({ type: 'admin_resetBallot', member: n })}>Reset {n}'s ballot</button></span>)}</>}
    </div>
    <h3>Admin: members</h3>
    {(s.roster || []).map(r => <div key={r.name} className="row" style={{ margin: '6px 0' }}>
      <b>{r.name}</b>{!r.active && <span className="mut">(removed)</span>}
      {r.active && !r.is_admin && <button onClick={() => confirm('Remove ' + r.name + '?') && act({ type: 'admin_removeMember', name: r.name })}>Remove</button>}
      {r.active && <button onClick={() => { const p = prompt('New password for ' + r.name); if (p) act({ type: 'admin_resetPassword', name: r.name, password: p }); }}>Reset password</button>}
    </div>)}
    <div className="row"><input placeholder="Name (letters only)" value={nm} onChange={e => setNm(e.target.value)} />
      <input placeholder="Password" value={pw} onChange={e => setPw(e.target.value)} />
      <button className="p" onClick={async () => { await act({ type: 'admin_addMember', name: nm, password: pw }); setNm(''); setPw(''); }}>Add member</button></div>
  </>);
}
