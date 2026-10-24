-- Lume Moda — esquema do Supabase
-- Como usar (nesta ordem):
--   1) Authentication > Sign In / Providers: desligue "Allow new users to sign up";
--   2) Authentication > Users > Add user: crie o usuário do lojista (marque Auto Confirm User);
--   3) SQL Editor > New query > cole tudo > Run.
-- ATENÇÃO: todo usuário que existir em Authentication > Users no momento em que este script rodar vira administrador.
-- Por isso o cadastro público precisa estar desligado (passo 1) e, ao rodar de novo, confira antes que só existem
-- usuários que devem ser administradores. Rodar de novo não apaga peças, fotos nem configurações.

-- ---------------------------------------------------------------- admins
create table if not exists public.admins (
  email text primary key
);

-- Todo usuário que já existe em Authentication > Users vira administrador agora (leia o aviso no topo do arquivo).
insert into public.admins (email)
select lower(email) from auth.users where email is not null
on conflict do nothing;
-- Para liberar outro e-mail depois: insert into public.admins (email) values ('outro@email.com');

alter table public.admins enable row level security;   -- sem políticas: ninguém lê pela API
revoke all on public.admins from anon, authenticated;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admins a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- -------------------------------------------------------------- products
create table if not exists public.products (
  id               uuid primary key default gen_random_uuid(),
  name             text not null check (length(trim(name)) > 0),
  description      text not null default '',
  price            numeric(10,2) not null check (price >= 0),
  compare_at_price numeric(10,2) check (compare_at_price is null or compare_at_price > price),
  category         text not null default '',
  colors           text[] not null default '{}',
  images           text[] not null default '{}',
  -- [{"size":"P","qty":2},{"size":"M","qty":0}]  (peça sem grade: [{"size":"Único","qty":5}])
  sizes            jsonb not null default '[]'::jsonb,
  featured         boolean not null default false,
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

alter table public.products enable row level security;

drop policy if exists "products_select" on public.products;
drop policy if exists "products_insert" on public.products;
drop policy if exists "products_update" on public.products;
drop policy if exists "products_delete" on public.products;

create policy "products_select" on public.products for select using (active or public.is_admin());
create policy "products_insert" on public.products for insert with check (public.is_admin());
create policy "products_update" on public.products for update using (public.is_admin()) with check (public.is_admin());
create policy "products_delete" on public.products for delete using (public.is_admin());

-- -------------------------------------------------------------- settings
create table if not exists public.settings (
  id                 int primary key default 1 check (id = 1),
  store_name         text not null default 'Minha Loja',
  tagline            text not null default '',
  whatsapp           text not null default '',   -- só dígitos, com DDI (ex.: 5573999999999)
  instagram          text not null default '',   -- sem @
  address            text not null default '',
  hours              text not null default '',
  announcement       text not null default '',
  free_shipping_min  numeric(10,2),
  hero_title         text not null default '',
  hero_subtitle      text not null default '',
  hero_image         text not null default '',
  logo_url           text not null default ''
);

insert into public.settings (id) values (1) on conflict do nothing;

-- Permissões básicas de acesso. Quem decide, linha a linha, o que cada pessoa pode ver ou mudar são as políticas (RLS) abaixo.
-- O revoke limpa o que o Supabase concede por padrão a tabelas novas; os grant devolvem só o necessário.
revoke all on public.products, public.settings from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on public.products, public.settings to anon, authenticated;
grant insert, update, delete on public.products, public.settings to authenticated;

alter table public.settings enable row level security;

drop policy if exists "settings_select" on public.settings;
drop policy if exists "settings_update" on public.settings;
drop policy if exists "settings_insert" on public.settings;

create policy "settings_select" on public.settings for select using (true);
create policy "settings_insert" on public.settings for insert with check (public.is_admin());
create policy "settings_update" on public.settings for update using (public.is_admin()) with check (public.is_admin());

-- --------------------------------------------------------------- storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('produtos', 'produtos', true, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = true, file_size_limit = 5242880,
      allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png'];

drop policy if exists "produtos_img_select" on storage.objects;
drop policy if exists "produtos_img_insert" on storage.objects;
drop policy if exists "produtos_img_update" on storage.objects;
drop policy if exists "produtos_img_delete" on storage.objects;

-- leitura pública das imagens funciona pela URL pública do bucket; esta política é só do painel
create policy "produtos_img_select" on storage.objects for select
  using (bucket_id = 'produtos' and public.is_admin());
create policy "produtos_img_insert" on storage.objects for insert
  with check (bucket_id = 'produtos' and public.is_admin());
create policy "produtos_img_update" on storage.objects for update
  using (bucket_id = 'produtos' and public.is_admin()) with check (bucket_id = 'produtos' and public.is_admin());
create policy "produtos_img_delete" on storage.objects for delete
  using (bucket_id = 'produtos' and public.is_admin());

-- Confira: a lista abaixo deve mostrar o e-mail do lojista. Se vier vazia, crie o usuário em Authentication > Users e rode este script de novo.
select email as administradores from public.admins;
