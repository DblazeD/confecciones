begin;

create table public.owners (
  user_id uuid primary key references auth.users on delete cascade
);

create function public.is_owner()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.owners where user_id = (select auth.uid()));
$$;

create table public.categories (
  id bigint generated always as identity primary key,
  name text not null check (length(btrim(name)) between 1 and 80)
);
create unique index categories_lower_name on public.categories (lower(name));
insert into public.categories (name) values
  ('Mascotas'), ('Ajuares de bebé'), ('Vestidos de dama'),
  ('Ropa de niña'), ('Pijamas'), ('Bolsas ecológicas');

create table public.products (
  id bigint generated always as identity primary key,
  code text generated always as ('PRE-' || id::text) stored unique,
  category_id bigint not null references public.categories on delete restrict,
  name text not null check (length(btrim(name)) between 1 and 120),
  description text not null default '' check (length(description) <= 2000),
  fabric text not null default '' check (length(fabric) <= 120),
  color text not null default '' check (length(color) <= 80),
  size text not null default '' check (length(size) <= 80),
  cost numeric(12,2) not null default 0 check (cost >= 0),
  price numeric(12,2) not null check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  availability_override boolean,
  published boolean not null default false,
  archived boolean not null default false,
  photos text[] not null default '{}' check (cardinality(photos) <= 8)
);
create index products_category on public.products (category_id);
create index products_visible on public.products (id) where published and not archived;

create table public.price_history (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products,
  old_price numeric(12,2) not null,
  new_price numeric(12,2) not null,
  old_cost numeric(12,2) not null,
  new_cost numeric(12,2) not null,
  changed_at timestamptz not null default now()
);

create table public.stock_movements (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products,
  quantity integer not null check (quantity <> 0),
  reason text not null check (length(btrim(reason)) between 1 and 300),
  movement_date date not null,
  created_at timestamptz not null default now()
);

create table public.customers (
  id bigint generated always as identity primary key,
  name text not null check (length(btrim(name)) between 1 and 120),
  phone text not null unique check (phone ~ '^[0-9]{7,15}$'),
  notes text not null default '' check (length(notes) <= 1000)
);

create type public.order_kind as enum ('confeccion', 'arreglo', 'otro');
create type public.order_status as enum ('recibido', 'en_proceso', 'listo', 'entregado', 'cancelado');

create table public.orders (
  id bigint generated always as identity primary key,
  customer_id bigint not null references public.customers,
  description text not null check (length(btrim(description)) between 1 and 2000),
  kind public.order_kind not null,
  received_date date not null,
  due_date date not null check (due_date >= received_date),
  price numeric(12,2) not null check (price >= 0),
  urgent boolean not null default false,
  status public.order_status not null default 'recibido',
  delivered_date date,
  cancellation_reason text not null default '' check (length(cancellation_reason) <= 500),
  check (status <> 'cancelado' or length(btrim(cancellation_reason)) > 0),
  check (status <> 'entregado' or delivered_date is not null)
);
create index orders_priority on public.orders (status, urgent desc, due_date);

create table public.order_history (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders,
  previous jsonb,
  current_snapshot jsonb not null,
  changed_at timestamptz not null default now()
);

create table public.brand_settings (
  id integer primary key default 1 check (id = 1),
  name text not null check (length(btrim(name)) between 1 and 100),
  logo text not null default '',
  primary_color text not null check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  phone text not null default '' check (phone = '' or phone ~ '^[0-9]{7,15}$'),
  whatsapp text not null default '' check (whatsapp = '' or whatsapp ~ '^[0-9]{10,15}$'),
  payment_methods text not null default '' check (length(payment_methods) <= 300)
);
insert into public.brand_settings (name, primary_color) values ('Taller de Doña Ana', '#54314f');

create function public.log_price_change()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if (old.price, old.cost) is distinct from (new.price, new.cost) then
    insert into public.price_history (product_id, old_price, new_price, old_cost, new_cost)
    values (new.id, old.price, new.price, old.cost, new.cost);
  end if;
  return new;
end;
$$;
create trigger product_price_changed after update of cost, price on public.products
for each row execute function public.log_price_change();

create function public.set_delivery_date()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.status = 'entregado' and old.status <> 'entregado' then
    new.delivered_date := (now() at time zone 'America/Bogota')::date;
  elsif new.status <> 'entregado' then
    new.delivered_date := null;
  end if;
  if new.status <> 'cancelado' then
    new.cancellation_reason := '';
  end if;
  return new;
end;
$$;
create trigger order_delivery_date before update on public.orders
for each row execute function public.set_delivery_date();

create function public.log_order_change()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or old is distinct from new then
    insert into public.order_history (order_id, previous, current_snapshot)
    values (new.id, to_jsonb(old), to_jsonb(new));
  end if;
  return new;
end;
$$;
create trigger order_changed after insert or update on public.orders
for each row execute function public.log_order_change();

create function public.move_stock(product bigint, amount integer, reason text, movement_date date)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  available integer;
begin
  if not public.is_owner() then
    raise exception 'Permiso insuficiente' using errcode = '42501';
  end if;
  if amount is null or amount = 0 then
    raise exception 'Indica una cantidad mayor que cero' using errcode = '22023';
  end if;
  select stock into available from public.products where id = product and not archived for update;
  if not found then
    raise exception 'Producto no encontrado' using errcode = '22023';
  end if;
  if available + amount < 0 then
    raise exception 'Existencias insuficientes' using errcode = '22023';
  end if;
  update public.products set stock = available + amount where id = product;
  insert into public.stock_movements (product_id, quantity, reason, movement_date)
  values (product, amount, reason, movement_date);
end;
$$;

create function public.change_product_photo(product bigint, operation text, photo text)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  queue text[];
  position integer;
  target integer;
begin
  if not public.is_owner() then
    raise exception 'Permiso insuficiente' using errcode = '42501';
  end if;
  select photos into queue from public.products where id = product for update;
  if not found then
    raise exception 'Producto no encontrado' using errcode = '22023';
  end if;
  position := array_position(queue, photo);
  if operation = 'add' then
    if cardinality(queue) >= 8 or position is not null then
      raise exception 'Puedes guardar hasta ocho fotos distintas' using errcode = '22023';
    end if;
    if not exists (select 1 from storage.objects where bucket_id = 'catalog-media' and name = photo) then
      raise exception 'Foto no encontrada' using errcode = '22023';
    end if;
    queue := array_append(queue, photo);
  else
    if position is null then
      raise exception 'Foto no encontrada' using errcode = '22023';
    end if;
    case operation
      when 'remove' then queue := array_remove(queue, photo);
      when 'cover' then queue := array_prepend(photo, array_remove(queue, photo));
      when 'up', 'down' then
        target := position + case when operation = 'up' then -1 else 1 end;
        if target between 1 and cardinality(queue) then
          queue[position] := queue[target];
          queue[target] := photo;
        end if;
      else raise exception 'Acción de foto inválida' using errcode = '22023';
    end case;
  end if;
  update public.products set photos = queue where id = product;
end;
$$;

alter table public.owners enable row level security;
revoke all on public.owners from anon, authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['categories','products','price_history','stock_movements','customers','orders','order_history','brand_settings']
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from anon, authenticated', table_name);
    execute format('create policy owner_access on public.%I to authenticated using ((select public.is_owner())) with check ((select public.is_owner()))', table_name);
    execute format('grant select on public.%I to authenticated', table_name);
  end loop;
end;
$$;

grant insert, update, delete on public.categories to authenticated;
grant insert (category_id, name, description, fabric, color, size, cost, price, published, availability_override),
  update (category_id, name, description, fabric, color, size, cost, price, published, availability_override, archived)
  on public.products to authenticated;
grant insert, update on public.customers to authenticated;
grant insert (customer_id, description, kind, received_date, due_date, price, urgent),
  update (customer_id, description, kind, received_date, due_date, price, urgent, status, cancellation_reason)
  on public.orders to authenticated;
grant update on public.brand_settings to authenticated;

revoke execute on function public.is_owner() from public, anon;
grant execute on function public.is_owner() to authenticated;
revoke execute on function public.move_stock(bigint, integer, text, date) from public, anon;
grant execute on function public.move_stock(bigint, integer, text, date) to authenticated;
revoke execute on function public.change_product_photo(bigint, text, text) from public, anon;
grant execute on function public.change_product_photo(bigint, text, text) to authenticated;
revoke execute on function public.log_price_change(), public.log_order_change(), public.set_delivery_date() from public, anon, authenticated;

-- The anonymous surface exposes only published fields. Internal stock, costs and customers stay behind RLS.
create view public.catalog_products with (security_barrier = true) as
select p.id, p.code, p.name, p.description, p.fabric, p.color, p.size, p.price, p.photos,
       p.category_id, c.name as category, coalesce(p.availability_override, p.stock > 0) as available
from public.products p join public.categories c on c.id = p.category_id
where p.published and not p.archived;

create view public.catalog_categories with (security_barrier = true) as
select distinct category_id as id, category as name from public.catalog_products;

create view public.catalog_brand as
select name, logo, primary_color, phone, whatsapp, payment_methods from public.brand_settings;

create function public.search_catalog(term text, category_filter bigint)
returns setof public.catalog_products language sql stable security invoker set search_path = ''
as $$
  select p.* from public.catalog_products p
  where (category_filter is null or p.category_id = category_filter)
    and strpos(
      translate(lower(p.name || ' ' || p.code), 'áéíóúü', 'aeiouu'),
      translate(lower(btrim(left(coalesce(term, ''), 120))), 'áéíóúü', 'aeiouu')
    ) > 0;
$$;
revoke execute on function public.search_catalog(text, bigint) from public;
grant execute on function public.search_catalog(text, bigint) to anon, authenticated;

grant select on public.catalog_products, public.catalog_categories, public.catalog_brand to anon, authenticated;
revoke insert, update, delete, truncate, references, trigger
on public.catalog_products, public.catalog_categories, public.catalog_brand from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('catalog-media', 'catalog-media', false, 200000, array['image/webp']);

create policy public_catalog_media on storage.objects for select to anon, authenticated
using (
  bucket_id = 'catalog-media' and (
    exists (select 1 from public.catalog_products p where storage.objects.name = any(p.photos))
    or exists (select 1 from public.catalog_brand b where b.logo = storage.objects.name)
  )
);
create policy owner_catalog_media on storage.objects for all to authenticated
using (bucket_id = 'catalog-media' and (select public.is_owner()))
with check (bucket_id = 'catalog-media' and (select public.is_owner()));

commit;
