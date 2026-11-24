import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { getBrand } from "@/lib/catalog";
import { mediaUrl } from "@/lib/format";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrand();
  return {
    title: { default: brand.name, template: "%s | " + brand.name },
    description: "Catálogo de confecciones y arreglos del taller.",
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const brand = await getBrand();
  return (
    <html lang="es">
      <body style={{ "--brand": brand.primary_color } as CSSProperties}>
        <header className="site-header">
          <div className="shell header-inner">
            <Link className="wordmark" href="/">
              {brand.logo
                ? <img src={mediaUrl(brand.logo)} width="40" height="40" alt="" />
                : <span className="brand-mark" aria-hidden="true">✂</span>}
              <span>{brand.name}</span>
            </Link>
            <nav aria-label="Navegación principal">
              <Link href="/#catalogo">Catálogo</Link>
              <Link className="button secondary small" href="/admin">Acceso propietaria</Link>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
