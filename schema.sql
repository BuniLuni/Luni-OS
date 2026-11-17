-- SETUP (free tier is fine)
-- 1. Create a project at supabase.com
-- 2. GitHub > Settings > Developer settings > OAuth Apps > New. Callback URL = the one shown in Supabase under Auth > Providers > GitHub.
--    Paste the Client ID + Secret into Supabase and enable GitHub.
-- 3. Supabase > Auth > URL Configuration: set Site URL to your GitHub Pages URL.
-- 4. Run this whole file in the SQL Editor.
-- 5. Paste Project URL + anon key into CFG at the top of index.html. (The anon key is meant to be public; the policies below protect the data.)

create table profiles(
  id uuid primary key references auth.users on delete cascade,
  login text not null, avatar text,
  role text not null default 'user' check (role in ('owner','admin','mod','user','banned')),
  created_at timestamptz default now());
create table messages(
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  login text not null,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz default now());
create table apps(
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles(id) on delete cascade,
  author_login text not null,
  name text not null check (char_length(name) <= 30),
  icon text, code text not null check (char_length(code) <= 60000),
  created_at timestamptz default now());

create function my_role() returns text language sql security definer stable set search_path=public
as $$ select role from profiles where id = auth.uid() $$;

-- New GitHub login => profile. Your GitHub username gets 'owner' automatically.
create function new_user() returns trigger language plpgsql security definer set search_path=public as $$
declare n text := coalesce(new.raw_user_meta_data->>'user_name', new.raw_user_meta_data->>'preferred_username', 'user');
begin
  insert into profiles(id, login, avatar, role)
  values (new.id, n, new.raw_user_meta_data->>'avatar_url', case when lower(n) = 'buniluni' then 'owner' else 'user' end);
  return new;
end $$;
create trigger on_signup after insert on auth.users for each row execute function new_user();

alter table profiles enable row level security;
alter table messages enable row level security;
alter table apps enable row level security;

create policy "read" on profiles for select using (true);
create policy "owner sets roles" on profiles for update using (my_role() = 'owner');

create policy "read" on messages for select using (true);
create policy "send" on messages for insert with check (auth.uid() = user_id and my_role() <> 'banned');
create policy "delete" on messages for delete using (auth.uid() = user_id or my_role() in ('owner','admin','mod'));

create policy "read" on apps for select using (true);
create policy "publish" on apps for insert with check (auth.uid() = author_id and my_role() <> 'banned');
create policy "remove" on apps for delete using (auth.uid() = author_id or my_role() in ('owner','admin','mod'));

alter publication supabase_realtime add table messages;
