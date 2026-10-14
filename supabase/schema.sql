create extension if not exists pgcrypto;
create table months(id uuid primary key default gen_random_uuid(), label text not null,
  stage text not null default 'submitting' check (stage in ('submitting','voting','results')),
  archived boolean not null default false, created_at timestamptz default now());
create table nominations(id uuid primary key default gen_random_uuid(),
  month_id uuid references months on delete cascade, member text not null, slot int not null check (slot in (0,1)),
  tmdb_id int not null, title text, year text, poster text, director text, runtime int, genre text, synopsis text,
  unique(month_id,member,slot), unique(month_id,tmdb_id));
create table rankings(month_id uuid references months on delete cascade, member text not null,
  ord jsonb not null, primary key(month_id,member));
alter table months enable row level security; alter table nominations enable row level security; alter table rankings enable row level security;
-- No public policies: only the server (service key) can read/write, which keeps secrets secret.
create table members(name text primary key, password_hash text not null,
  is_admin boolean not null default false, active boolean not null default true, created_at timestamptz default now());
alter table members enable row level security;
alter table months add column members jsonb default '[]';
