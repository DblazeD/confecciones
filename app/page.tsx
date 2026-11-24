import Image from "next/image";
import Link from "next/link";
import { getBrand, listCatalog } from "@/lib/catalog";
import { first, mediaUrl, money, whatsappLink } from "@/lib/format";

type Filters = Promise<{ q?: string | string[]; categoria?: string | string[]; pagina?: string | string[] }>;

export default async function Home({ searchParams }: { searchParams: Filters }) {
  const filters = await searchParams;
  const q = first(filters.q).trim().slice(0, 120);
  const category = first(filters.categoria);
  const page = Math.min(10000, Math.max(1, Math.trunc(Number(first(filters.pagina))) || 1));
  const [brand, catalog] = await Promise.all([getBrand(), listCatalog(q, /^\d{1,12}$/.test(category) ? category : "", page)]);
  const contact = whatsappLink(brand.whatsapp, "Hola, me gustaría consultar por las confecciones del taller.");

  function catalogHref(values: Record<string, string>) {
    const query = new URLSearchParams(Object.entries(values).filter(([, value]) => value));
    return (query.size ? "/?" + query : "/") + "#catalogo";
  }
  const returnTo = catalogHref({ q, categoria: category, pagina: page > 1 ? String(page) : "" });

  return (
    <main>
      <section className="hero shell">
        <div className="hero-copy">
          <p className="eyebrow">Confección y arreglos</p>
          <h1>El oficio de<br />hacer a mano.</h1>
          <p className="hero-note">Conoce el catálogo del taller y consulta por las prendas que te interesan.</p>
          <Link className="button" href="#catalogo">Explorar el catálogo</Link>
        </div>
        <Image src="/taller.webp" alt="Máquina de coser, hilos y telas sobre una mesa de trabajo" width={1180} height={787} priority />
      </section>

      <section className="shell catalog" id="catalogo">
        <div className="section-head"><h2>Catálogo</h2></div>
        <form className="filters" action="/#catalogo">
          <label>Buscar prenda <input type="search" name="q" defaultValue={q} placeholder="Nombre o referencia" maxLength={120} /></label>
          <label>Categoría <select name="categoria" defaultValue={category}>
            <option value="">Todas las categorías</option>
            {catalog.categories.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
          </select></label>
          <button className="button" type="submit">Buscar</button>
          {(q || category) && <Link className="button secondary" href="/#catalogo">Ver todo</Link>}
        </form>
        {catalog.unavailable ? <p className="empty" role="status">El catálogo no está disponible por el momento. Intenta de nuevo en unos minutos.</p> : (
          catalog.products.length ? <div className="product-grid">
            {catalog.products.map((product) => (
              <Link className="product-card" key={product.id} href={`/producto/${product.id}?volver=${encodeURIComponent(returnTo)}`}>
                {product.photos[0] ? <img src={mediaUrl(product.photos[0])} alt="" loading="lazy" /> : <div className="photo-placeholder">Sin foto</div>}
                <div className="product-caption">
                  <p className="subtle">{product.category} · {product.code}</p>
                  <h3>{product.name}</h3>
                  <div className="product-meta"><strong>{money(product.price)}</strong>
                    <span className={product.available ? "status available" : "status"}>{product.available ? "Disponible" : "Agotado"}</span></div>
                </div>
              </Link>
            ))}
          </div> : <div className="empty">
            <p>{q || category ? "No encontramos prendas con esos filtros." : "Aún no hay prendas publicadas."}</p>
            {contact && <a href={contact} target="_blank" rel="noreferrer">Consultar por WhatsApp</a>}
          </div>
        )}
        {(page > 1 || catalog.more) && <nav className="pager" aria-label="Páginas del catálogo">
          {page > 1 && <Link className="button secondary" href={catalogHref({ q, categoria: category, pagina: String(page - 1) })}>Anterior</Link>}
          <span>Página {page}</span>
          {catalog.more && <Link className="button secondary" href={catalogHref({ q, categoria: category, pagina: String(page + 1) })}>Siguiente</Link>}
        </nav>}
      </section>
      <footer className="site-footer"><div className="shell footer-inner">
        <div><strong>{brand.name}</strong>{brand.phone && <p>Teléfono <a href={`tel:${brand.phone}`}>{brand.phone}</a></p>}</div>
        {brand.payment_methods && <div><strong>Medios de pago</strong><p>{brand.payment_methods}</p></div>}
        {contact && <a className="button secondary" href={contact} target="_blank" rel="noreferrer">Contáctanos por WhatsApp</a>}
      </div></footer>
    </main>
  );
}
