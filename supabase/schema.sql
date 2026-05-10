create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id text primary key,
  name text not null,
  handle text not null,
  tagline text not null,
  bio text not null,
  avatar_url text not null,
  hero_image_url text not null,
  location text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null,
  hero_image_url text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bio_links (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  description text not null default '',
  href text not null,
  kind text not null default 'standard' check (kind in ('social', 'feature', 'storefront', 'standard')),
  icon text not null default 'link',
  collection_slug text references public.product_collections(slug) on update cascade on delete set null,
  is_active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  collection_slug text not null references public.product_collections(slug) on update cascade on delete cascade,
  title text not null,
  store_name text not null,
  price text not null default '',
  image_url text not null,
  href text not null,
  category text not null default 'Finds',
  is_favorite boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.product_collections enable row level security;
alter table public.bio_links enable row level security;
alter table public.products enable row level security;

drop policy if exists "Public can read profile" on public.profiles;
create policy "Public can read profile" on public.profiles
  for select using (true);

drop policy if exists "Public can read collections" on public.product_collections;
create policy "Public can read collections" on public.product_collections
  for select using (is_active = true);

drop policy if exists "Public can read links" on public.bio_links;
create policy "Public can read links" on public.bio_links
  for select using (is_active = true);

drop policy if exists "Public can read products" on public.products;
create policy "Public can read products" on public.products
  for select using (is_active = true);

drop policy if exists "Authenticated users manage profile" on public.profiles;
create policy "Authenticated users manage profile" on public.profiles
  for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated users manage collections" on public.product_collections;
create policy "Authenticated users manage collections" on public.product_collections
  for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated users manage links" on public.bio_links;
create policy "Authenticated users manage links" on public.bio_links
  for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated users manage products" on public.products;
create policy "Authenticated users manage products" on public.products
  for all to authenticated using (true) with check (true);

insert into public.profiles (
  id,
  name,
  handle,
  tagline,
  bio,
  avatar_url,
  hero_image_url,
  location
) values (
  'rita-brown',
  'Rita Brown',
  '@ritabrowne',
  'Home and lifestyle finds for calm, cozy everyday living.',
  'Sharing favorite home, lifestyle, beauty, and family finds that blend comfort, style, and simplicity.',
  'https://ugc.production.linktr.ee/02e07ec7-f0f2-4bef-ba73-9834c3185447_IMG-9417-Facetune-28-12-2024-14-54-27.jpeg?io=true&size=avatar-v3_0',
  'https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&w=1200&q=85',
  'Lifestyle creator'
) on conflict (id) do update set
  name = excluded.name,
  handle = excluded.handle,
  tagline = excluded.tagline,
  bio = excluded.bio,
  avatar_url = excluded.avatar_url,
  hero_image_url = excluded.hero_image_url,
  location = excluded.location;

insert into public.product_collections (slug, title, description, hero_image_url)
values (
  'shop-my-finds',
  'Shop My Finds',
  'Pieces Rita would save, share, and send to a friend. Add links from any store and the storefront stays polished.',
  'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=1200&q=85'
) on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  hero_image_url = excluded.hero_image_url;

insert into public.bio_links (label, description, href, kind, icon, collection_slug, sort_order)
values
  ('The Rita Brown Edit', 'Walmart storefront with cozy home and lifestyle picks.', 'https://walmrt.us', 'feature', 'sparkles', null, 1),
  ('Shop My Finds', 'A curated storefront for products from any shop.', '/store/shop-my-finds', 'storefront', 'shopping-bag', 'shop-my-finds', 2),
  ('Amazon Storefront', 'Recommended products from Rita Brown on Amazon.', 'https://www.amazon.com/shop/ritabrown', 'standard', 'store', null, 3),
  ('My Insta Moments', 'Follow along on Instagram.', 'https://www.instagram.com/ritabrowne', 'social', 'instagram', null, 4),
  ('Hi TikTok', 'Short videos, finds, and daily favorites.', 'https://www.tiktok.com/@ritabrowne', 'social', 'music', null, 5);

insert into public.products (
  collection_slug,
  title,
  store_name,
  price,
  image_url,
  href,
  category,
  is_favorite,
  sort_order
) values
  ('shop-my-finds', 'Airy Linen Blend Curtains', 'Wayfair', '$38', 'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=900&q=85', 'https://www.wayfair.com', 'Home', true, 1),
  ('shop-my-finds', 'Woven Storage Basket', 'Target', '$24', 'https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=900&q=85', 'https://www.target.com', 'Organization', false, 2),
  ('shop-my-finds', 'Soft White Ceramic Vase', 'H&M Home', '$19', 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=900&q=85', 'https://www2.hm.com/en_us/home.html', 'Decor', true, 3),
  ('shop-my-finds', 'Textured Accent Pillow', 'Shein', '$12', 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=900&q=85', 'https://us.shein.com', 'Decor', false, 4);
