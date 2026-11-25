import Link from "next/link";
import { notFound } from "next/navigation";
import { Gallery } from "@/app/components/gallery";
import { WorkshopMark } from "@/app/components/workshop-mark";
import { getBrand, getProduct } from "@confecciones/backend/catalog";
import { first, money, whatsappLink } from "@/lib/format";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ volver?: string | string[] }> };

export default async function ProductPage({ params, searchParams }: Props) {
  const { id } = await params;
  if (!/^\d{1,12}$/.test(id)) notFound();
  const [brand, product, filters] = await Promise.all([getBrand(), getProduct(Number(id)), searchParams]);
  if (!product) notFound();
  const requestedBack = first(filters.volver);
  const back = /^\/(?:\?[^#]*)?#catalogo$/.test(requestedBack) ? requestedBack : "/#catalogo";
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const contact = whatsappLink(brand.whatsapp, `Hola, me interesa ${product.name} (${product.code}): ${new URL("/producto/" + id, base)}`);
  return (
    <>
      <header className="site-header"><div className="shell header-inner"><WorkshopMark brand={brand} /></div></header>
      <main className="shell detail">
      <Link className="back-link" href={back}>Volver al catálogo</Link>
      <div className="detail-grid">
        <Gallery photos={product.photos} name={product.name} />
        <div className="detail-copy">
          <p className="eyebrow">{product.category} · {product.code}</p>
          <h1>{product.name}</h1>
          <p className="detail-price">{money(product.price)}</p>
          <p><span className={product.available ? "status available" : "status"}>{product.available ? "Disponible" : "Agotado"}</span></p>
          <p className="preserve">{product.description}</p>
          <dl>
            {product.fabric && <div><dt>Tela</dt><dd>{product.fabric}</dd></div>}
            {product.color && <div><dt>Color</dt><dd>{product.color}</dd></div>}
            {product.size && <div><dt>Talla</dt><dd>{product.size}</dd></div>}
          </dl>
          {contact && <a className="button contact-button" href={contact} target="_blank" rel="noreferrer">Consultar por WhatsApp</a>}
        </div>
      </div>
      </main>
    </>
  );
}
