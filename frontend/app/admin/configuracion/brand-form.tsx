"use client";

import { useState } from "react";
import { saveBrand } from "@confecciones/backend/actions";
import { ActionForm } from "@/app/components/action-form";
import type { Brand } from "@confecciones/backend/catalog";
import { mediaUrl } from "@/lib/format";

export function BrandForm({ brand }: { brand: Brand }) {
  const [color, setColor] = useState(brand.primary_color);
  return <ActionForm action={saveBrand} label="Guardar configuración" grid>
    <label>Nombre del taller <input name="name" defaultValue={brand.name} required maxLength={100} /></label>
    <label>Color principal <input type="color" name="color" value={color} onChange={(event) => setColor(event.target.value)} /></label>
    <p className="span preview-color" style={{ borderColor: color, background: color + "1a" }}>Vista previa del color</p>
    {brand.logo && <img src={mediaUrl(brand.logo)} height="75" width="75" alt="Logo actual" />}
    <label className="span">Logo <input type="file" name="logo" accept="image/jpeg,image/png,image/webp,image/avif" /></label>
    {brand.logo && <label className="span check"><input type="checkbox" name="removeLogo" /> Quitar logo actual</label>}
    <label>Teléfono <input name="phone" type="tel" defaultValue={brand.phone} maxLength={22} /></label>
    <label>WhatsApp con indicativo <input name="whatsapp" type="tel" defaultValue={brand.whatsapp} placeholder="+57 300 000 0000" maxLength={22} /></label>
    <label className="span">Medios de pago visibles en el catálogo
      <textarea name="payments" defaultValue={brand.payment_methods} maxLength={300} />
    </label>
  </ActionForm>;
}
