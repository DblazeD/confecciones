import "server-only";
import { cache } from "react";
import { publicClient } from "@/lib/supabase";

export type Brand = {
  name: string;
  logo: string;
  primary_color: string;
  phone: string;
  whatsapp: string;
  payment_methods: string;
};

export type Category = { id: number; name: string };

export type CatalogProduct = {
  id: number;
  code: string;
  name: string;
  description: string;
  fabric: string;
  color: string;
  size: string;
  price: number;
  photos: string[];
  category_id: number;
  category: string;
  available: boolean;
};

type CatalogPage = {
  products: CatalogProduct[];
  categories: Category[];
  more: boolean;
  unavailable: boolean;
};

const fallbackBrand: Brand = {
  name: "Taller de Doña Ana",
  logo: "",
  primary_color: "#a95138",
  phone: "",
  whatsapp: "",
  payment_methods: "",
};

export const getBrand = cache(async (): Promise<Brand> => {
  const db = publicClient();
  if (!db) return fallbackBrand;
  const { data, error } = await db.from("catalog_brand").select("*").single<Brand>();
  if (error) console.error("No se pudo leer la configuración del catálogo", error.code);
  return data ?? fallbackBrand;
});

export async function listCatalog(query: string, category: string, page: number): Promise<CatalogPage> {
  const db = publicClient();
  if (!db) return { products: [], categories: [], more: false, unavailable: false };
  const limit = 12;
  const from = (page - 1) * limit;
  const [items, groups] = await Promise.all([
    db.rpc("search_catalog", { term: query, category_filter: category ? Number(category) : null })
      .order("name").order("id").range(from, from + limit),
    db.from("catalog_categories").select("*").order("name").returns<Category[]>(),
  ]);
  if (items.error || groups.error) {
    console.error("No se pudo cargar el catálogo", items.error?.code ?? groups.error?.code);
  }
  const products: CatalogProduct[] = Array.isArray(items.data) ? items.data : [];
  return {
    products: products.slice(0, limit),
    categories: groups.data ?? [],
    more: products.length > limit,
    unavailable: Boolean(items.error || groups.error),
  };
}

export async function getProduct(id: number) {
  const db = publicClient();
  if (!db) return null;
  const { data, error } = await db.from("catalog_products").select("*").eq("id", id).maybeSingle<CatalogProduct>();
  if (error) throw new Error("No se pudo consultar el producto");
  return data;
}
