import Link from "next/link";
import { saveCategory } from "@/app/admin/actions";
import { ActionForm } from "@/app/components/action-form";
import { getCategories, type Product } from "@/lib/admin";
import { money } from "@/lib/format";
import { requireOwner } from "@/lib/supabase";

export const metadata = { title: "Productos" };

export default async function ProductsPage() {
  const db = await requireOwner();
  const [categories, products] = await Promise.all([
    getCategories(),
    db.from("products").select("id,code,name,price,category_id,published,archived").order("archived").order("name")
      .returns<Pick<Product, "id" | "code" | "name" | "price" | "category_id" | "published" | "archived">[]>(),
  ]);
  if (products.error) throw new Error("No se pudieron cargar los productos");
  const names = new Map(categories.map(({ id, name }) => [id, name]));
  return <>
    <div className="workspace-title">
      <h1>Productos</h1>
      <Link className="button" href="/admin/productos/nuevo">Nuevo producto</Link>
    </div>
    <section className="panel">
      {products.data.length ? <div className="table-wrap"><table>
        <thead><tr><th>Producto</th><th>Categoría</th><th>Precio</th><th>Visibilidad</th></tr></thead>
        <tbody>{products.data.map((item) => <tr key={item.id}>
          <td><Link href={`/admin/productos/${item.id}`}>{item.name}</Link><br /><span className="subtle">{item.code}</span></td>
          <td>{names.get(item.category_id)}</td>
          <td>{money(item.price)}</td>
          <td>{item.archived ? "Archivado" : item.published ? "Publicado" : "Oculto"}</td>
        </tr>)}</tbody>
      </table></div> : <p>Aún no hay productos registrados.</p>}
    </section>
    <section className="panel">
      <h2>Categorías</h2>
      <ActionForm action={saveCategory} label="Agregar categoría">
        <label>Nombre de la categoría <input name="name" required maxLength={80} /></label>
      </ActionForm>
      {categories.map((category) => (
        <details key={category.id}>
          <summary>{category.name}</summary>
          <div className="flow">
            <ActionForm action={saveCategory} label="Renombrar" secondary>
              <input type="hidden" name="id" value={category.id} />
              <label>Nombre <input name="name" required maxLength={80} defaultValue={category.name} /></label>
            </ActionForm>
            <ActionForm action={saveCategory} label="Eliminar categoría" danger confirm={`¿Eliminar la categoría ${category.name}?`}>
              <input type="hidden" name="id" value={category.id} />
              <input type="hidden" name="mode" value="delete" />
            </ActionForm>
          </div>
        </details>
      ))}
    </section>
  </>;
}
