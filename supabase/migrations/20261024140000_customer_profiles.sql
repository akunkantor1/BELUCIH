create table if not exists public.customer_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  avatar_url text,
  phone text,
  updated_at timestamptz not null default now()
);

alter table public.customer_profiles enable row level security;

drop policy if exists "Customers read own profile" on public.customer_profiles;
create policy "Customers read own profile"
on public.customer_profiles for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "Customers insert own profile" on public.customer_profiles;
create policy "Customers insert own profile"
on public.customer_profiles for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Customers update own profile" on public.customer_profiles;
create policy "Customers update own profile"
on public.customer_profiles for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('customer-avatars', 'customer-avatars', false)
on conflict (id) do nothing;

drop policy if exists "Customers read own avatar" on storage.objects;
create policy "Customers read own avatar"
on storage.objects for select to authenticated
using (
  bucket_id = 'customer-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Customers upload own avatar" on storage.objects;
create policy "Customers upload own avatar"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'customer-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Customers update own avatar" on storage.objects;
create policy "Customers update own avatar"
on storage.objects for update to authenticated
using (
  bucket_id = 'customer-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'customer-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Customers delete own avatar" on storage.objects;
create policy "Customers delete own avatar"
on storage.objects for delete to authenticated
using (
  bucket_id = 'customer-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
