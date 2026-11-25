import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, before, test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
const owner = "8dfdb44f-667f-4d3a-8efd-cdd7b89e65be";
const other = "e4c2ad15-2f36-41e2-a0c4-eed0753df430";
const photo = "d14aef0f-e0f1-4113-a42b-a8fe7c32aaa5.webp";

async function role(name, user = "") {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user]);
  await db.exec("set role " + name);
}

before(async () => {
  // Emulate the Supabase roles and schemas used by the migration.
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create schema storage;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid
      language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create table storage.buckets (
      id text primary key, name text, public boolean, file_size_limit integer, allowed_mime_types text[]
    );
    create table storage.objects (
      bucket_id text references storage.buckets, name text, primary key (bucket_id, name)
    );
    alter table storage.objects enable row level security;
    grant usage on schema auth, storage to anon, authenticated;
    grant select on storage.objects to anon, authenticated;
    grant insert, update, delete on storage.objects to authenticated;
  `);
  await db.exec(await readFile(new URL("../supabase/migrations/202611230001_fase_1.sql", import.meta.url), "utf8"));
  await db.query("insert into auth.users (id) values ($1), ($2)", [owner, other]);
  await db.query("insert into public.owners (user_id) values ($1)", [owner]);
  await role("authenticated", owner);
  await db.exec(`
    insert into public.products (category_id, name, price, cost, published)
    values (1, 'Pañuelo clásico', 20000, 8000, true),
           (2, 'Borrador', 10000, 5000, false);
  `);
});

after(async () => db.close());

test("el catálogo público solo expone productos publicados e información comercial", async () => {
  await role("authenticated", owner);
  assert.equal((await db.query("select public.is_owner()")).rows[0].is_owner, true);
  await db.query("insert into storage.objects values ('catalog-media', $1)", [photo]);
  await db.query("select public.change_product_photo(1, 'add', $1)", [photo]);
  await role("anon");
  const catalog = await db.query("select code, available from public.search_catalog('CLASICO', null)");
  assert.deepEqual(catalog.rows, [{ code: "PRE-1", available: false }]);
  assert.equal((await db.query("select * from public.catalog_categories")).rows.length, 1);
  assert.equal((await db.query("select * from storage.objects")).rows.length, 1);
  await assert.rejects(db.query("select cost from public.catalog_products"), { code: "42703" });
  await assert.rejects(db.query("select * from public.products"), { code: "42501" });
  await assert.rejects(db.query("select * from public.customers"), { code: "42501" });

  await role("authenticated", owner);
  await db.exec("update public.products set published = false where id = 1");
  await role("anon");
  assert.equal((await db.query("select * from public.catalog_products")).rows.length, 0);
  assert.equal((await db.query("select * from storage.objects")).rows.length, 0);

  await role("authenticated", other);
  assert.equal((await db.query("select public.is_owner()")).rows[0].is_owner, false);
  assert.equal((await db.query("select * from public.products")).rows.length, 0);
  assert.equal((await db.query("select * from storage.objects")).rows.length, 0);
  await assert.rejects(db.query("select public.move_stock(1, 1, 'Compra', current_date)"), { code: "42501" });
});

test("los cambios de stock son atómicos y los precios conservan su historial", async () => {
  await role("authenticated", owner);
  await db.query("select public.move_stock(1, 5, 'Compra', current_date)");
  await db.query("select public.move_stock(1, -2, 'Venta', current_date)");
  await assert.rejects(db.query("select public.move_stock(1, -4, 'Venta', current_date)"), { code: "22023" });
  await assert.rejects(db.query("select public.move_stock(1, -1, '', current_date)"), { code: "23514" });
  await assert.rejects(db.query("update public.products set stock = 90 where id = 1"), { code: "42501" });
  await db.exec("update public.products set price = 22000, published = true where id = 1");
  assert.equal((await db.query("select stock from public.products where id = 1")).rows[0].stock, 3);
  assert.equal((await db.query("select * from public.stock_movements")).rows.length, 2);
  assert.equal((await db.query("select * from public.price_history")).rows.length, 1);
  await assert.rejects(db.query("delete from public.categories where id = 1"), (error) => ["23001", "23503"].includes(error.code));
  await role("anon");
  assert.equal((await db.query("select available from public.catalog_products where id = 1")).rows[0].available, true);
});

test("los pedidos registran entregas y exigen motivo de cancelación", async () => {
  await role("authenticated", owner);
  await db.exec("insert into public.customers (name, phone) values ('Cliente de prueba','3000000000')");
  await assert.rejects(db.query("insert into public.customers (name, phone) values ('Duplicado','3000000000')"), { code: "23505" });
  const insert = "insert into public.orders (customer_id, description, kind, received_date, due_date, price) values (1, 'Arreglo', 'arreglo', '2026-11-23', $1, 30000) returning id";
  await assert.rejects(db.query(insert, ["2026-11-22"]), { code: "23514" });
  const { rows: [{ id }] } = await db.query(insert, ["2026-11-24"]);
  await db.query("update public.orders set status = 'entregado' where id = $1", [id]);
  assert.equal((await db.query("select delivered_date is not null as delivered from public.orders where id = $1", [id])).rows[0].delivered, true);
  await assert.rejects(db.query("update public.orders set status = 'cancelado' where id = $1", [id]), { code: "23514" });
  await db.query("update public.orders set status = 'cancelado', cancellation_reason = 'Solicitud del cliente' where id = $1", [id]);
  assert.equal((await db.query("select * from public.order_history where order_id = $1", [id])).rows.length, 3);
});
