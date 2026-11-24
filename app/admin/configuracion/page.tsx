import { getBrand } from "@/lib/catalog";
import { requireOwner } from "@/lib/supabase";
import { BrandForm } from "./brand-form";

export default async function SettingsPage() {
  await requireOwner();
  return <>
    <h1>Configuración</h1>
    <section className="panel"><h2>Marca y contacto</h2><BrandForm brand={await getBrand()} /></section>
  </>;
}
