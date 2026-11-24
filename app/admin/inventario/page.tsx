import Link from "next/link";
import { moveStock } from "@/app/admin/actions";
import { ActionForm } from "@/app/components/action-form";
import { getCategories, type Product } from "@/lib/admin";
import { first, today } from "@/lib/format";
import { requireOwner } from "@/lib/supabase";

type Movement = { id: number; product_id: number; quantity: number; reason: string; movement_date: string };
type Item = Pick<Product, "id" | "code" | "name" | "stock" | "category_id" | "published">;
type Filters = Promise<Record<string, string | string[] | undefined>>;
const normalize = (value: string) => value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();

export default async function InventoryPage({ searchParams }: { searchParams: Filters }) {
  const params = await searchParams;
  const q = first(params.q).slice(0, 120);
  const category = first(params.categoria);
  const sort = first(params.orden);
  const db = await requireOwner();
  const [categories, items, movements] = await Promise.all([
    getCategories(),
    db.from("products").select("id,code,name,stock,category_id,published").eq("archived", false).order("name").returns<Item[]>(),
    db.from("stock_movements").select("*").order("id", { ascending: false }).limit(25).returns<Movement[]>(),
  ]);
  if (items.error || movements.error) throw new Error("No se pudo cargar el inventario");
  const nameById = new Map(items.data.map((item) => [item.id, item.name]));
  const categoryNames = new Map(categories.map(({ id, name }) => [id, name]));
  const visible = items.data.filter((item) =>
    (!category || String(item.category_id) === category) && normalize(item.name + " " + item.code).includes(normalize(q)),
  );
  if (sort === "menor") visible.sort((a, b) => a.stock - b.stock);
  if (sort === "mayor") visible.sort((a, b) => b.stock - a.stock);

  return <>
    <h1>Inventario</h1>
    <section className="panel">
      <h2>Registrar movimiento</h2>
      {!items.data.length ? <p>Agrega un <Link href="/admin/productos/nuevo">producto</Link> para registrar existencias.</p> :
        <ActionForm action={moveStock} label="Registrar movimiento" grid>
          <label>Producto <select name="product" required defaultValue="">
            <option value="">Selecciona un producto</option>
            {items.data.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.code}</option>)}
          </select></label>
          <label>Tipo <select name="direction"><option value="in">Entrada</option><option value="out">Salida</option></select></label>
          <label>Unidades <input name="quantity" type="number" min="1" max="1000000" required /></label>
          <label>Fecha <input name="date" type="date" required defaultValue={today()} /></label>
          <label className="span">Motivo <input name="reason" maxLength={300} required /></label>
        </ActionForm>}
    </section>
    <section className="panel">
      <h2>Existencias</h2>
      <form className="filters">
        <label>Buscar <input type="search" name="q" placeholder="Nombre o referencia" defaultValue={q} /></label>
        <label>Categoría <select name="categoria" defaultValue={category}>
          <option value="">Todas</option>
          {categories.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
        </select></label>
        <label>Orden <select name="orden" defaultValue={sort}>
          <option value="">Nombre</option><option value="menor">Menor cantidad</option><option value="mayor">Mayor cantidad</option>
        </select></label>
        <button className="button secondary">Filtrar</button>
      </form>
      {!visible.length ? <p>No hay productos para mostrar.</p> : <div className="table-wrap"><table>
        <thead><tr><th>Producto</th><th>Categoría</th><th>Unidades</th><th>Visibilidad</th></tr></thead>
        <tbody>{visible.map((item) => <tr key={item.id}>
          <td><Link href={`/admin/productos/${item.id}`}>{item.name}</Link><br /><span className="subtle">{item.code}</span></td>
          <td>{categoryNames.get(item.category_id)}</td>
          <td>{item.stock || "0 · Sin existencias"}</td>
          <td>{item.published ? "Publicado" : "Oculto"}</td>
        </tr>)}</tbody>
      </table></div>}
    </section>
    <section className="panel">
      <h2>Movimientos recientes</h2>
      {!movements.data.length ? <p>Aún no hay movimientos.</p> : <div className="table-wrap"><table>
        <thead><tr><th>Fecha</th><th>Producto</th><th>Unidades</th><th>Motivo</th></tr></thead>
        <tbody>{movements.data.map((item) => <tr key={item.id}>
          <td>{item.movement_date}</td><td>{nameById.get(item.product_id) ?? "PRE-" + item.product_id}</td>
          <td>{item.quantity > 0 ? "+" : ""}{item.quantity}</td><td>{item.reason}</td>
        </tr>)}</tbody>
      </table></div>}
    </section>
  </>;
}
