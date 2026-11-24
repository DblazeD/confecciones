import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import { getBrand } from "@/lib/catalog";
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
        {children}
      </body>
    </html>
  );
}
