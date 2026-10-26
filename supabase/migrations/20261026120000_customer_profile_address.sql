alter table public.customer_profiles
add column if not exists address text not null default '';
