import Link from "next/link";
import { notFound } from "next/navigation";
import { changePhoto, saveProduct, toggleArchive } from "@confecciones/backend/actions";
import { ActionForm } from "@/app/components/action-form";
import { getProductEditor } from "@confecciones/backend/admin";
import { mediaUrl, money } from "@/lib/format";

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === "nuevo";
  if (!isNew && !/^\d{1,12}$/.test(id)) notFound();
  const { categories, product, prices } = await getProductEditor(isNew ? null : id);
  if (!isNew && !product) notFound();
  const availability = product?.availability_override == null ? "auto" : product.availability_override ? "available" : "unavailable";
  return <>
    <Link className="back-link" href="/admin/productos">Volver a productos</Link>
    <div className="workspace-title">
      <h1>{product?.name ?? "Nuevo producto"}</h1>
      {product && <span className="status">{product.code}</span>}
    </div>
    <section className="panel">
      <ActionForm action={saveProduct} label="Guardar producto" grid>
        {product && <input type="hidden" name="id" value={product.id} />}
        <label>Nombre <input name="name" defaultValue={product?.name} required maxLength={120} /></label>
        <label>Categoría <select name="category" defaultValue={product?.category_id ?? ""} required>
          <option value="">Selecciona una categoría</option>
          {categories.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
        </select></label>
        <label className="span">Descripción <textarea name="description" defaultValue={product?.description} maxLength={2000} /></label>
        <label>Tela o calidad <input name="fabric" defaultValue={product?.fabric} maxLength={120} /></label>
        <label>Color <input name="color" defaultValue={product?.color} maxLength={80} /></label>
        <label>Talla <input name="size" defaultValue={product?.size} maxLength={80} /></label>
        <label>Disponibilidad <select name="availability" defaultValue={availability}>
          <option value="auto">Según existencias</option><option value="available">Disponible</option><option value="unavailable">Agotado</option>
        </select></label>
        <label>Precio de venta (COP) <input name="price" type="number" min="0" step=".01" required defaultValue={product?.price} /></label>
        <label>Precio de compra (COP) <input name="cost" type="number" min="0" step=".01" defaultValue={product?.cost} /></label>
        <label className="check"><input name="published" type="checkbox" defaultChecked={product?.published} /> Publicar en el catálogo</label>
        {product && <p>Margen actual: <strong>{money(product.price - product.cost)}</strong></p>}
      </ActionForm>
    </section>
    {product && <>
      <section className="panel">
        <h2>Fotos</h2>
        <div className="media-manager">
          {product.photos.map((photo, position) => <figure key={photo}>
            <img src={mediaUrl(photo)} loading="lazy" alt={`Foto ${position + 1} de ${product.name}`} />
            <figcaption>{position === 0 ? "Foto principal" : `Foto ${position + 1}`}</figcaption>
            <div className="inline-actions">
              {[
                { mode: "cover", label: "Hacer principal", visible: position > 0 },
                { mode: "up", label: "Mover antes", visible: position > 1 },
                { mode: "down", label: "Mover después", visible: position < product.photos.length - 1 },
                { mode: "remove", label: "Eliminar foto", visible: true },
              ].filter(({ visible }) => visible).map(({ mode, label }) => (
                <ActionForm key={mode} action={changePhoto} label={label} secondary confirm={mode === "remove" ? "¿Eliminar esta foto?" : undefined}>
                  <input type="hidden" name="id" value={product.id} />
                  <input type="hidden" name="name" value={photo} />
                  <input type="hidden" name="mode" value={mode} />
                </ActionForm>
              ))}
            </div>
          </figure>)}
        </div>
        {product.photos.length < 8 && <ActionForm action={changePhoto} label="Subir foto">
          <input type="hidden" name="id" value={product.id} />
          <input type="hidden" name="mode" value="add" />
          <label>Elegir archivo <input type="file" name="photo" accept="image/jpeg,image/png,image/webp,image/avif" required /></label>
        </ActionForm>}
      </section>
      {!!prices.length && <section className="panel">
        <h2>Cambios de precio</h2>
        <div className="table-wrap"><table>
          <thead><tr><th>Fecha</th><th>Compra</th><th>Venta</th></tr></thead>
          <tbody>{prices.map((change) => <tr key={change.id}>
            <td>{new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", dateStyle: "short" }).format(new Date(change.changed_at))}</td>
            <td>{money(change.old_cost)} → {money(change.new_cost)}</td>
            <td>{money(change.old_price)} → {money(change.new_price)}</td>
          </tr>)}</tbody>
        </table></div>
      </section>}
      <section className="panel">
        <ActionForm action={toggleArchive} label={product.archived ? "Restaurar producto" : "Archivar producto"}
          secondary confirm={product.archived ? undefined : "¿Archivar este producto y quitarlo del catálogo?"}>
          <input type="hidden" name="id" value={product.id} />
          <input type="hidden" name="mode" value={product.archived ? "restore" : "archive"} />
        </ActionForm>
      </section>
    </>}
  </>;
}
