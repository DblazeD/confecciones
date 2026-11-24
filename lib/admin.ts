import "server-only";
import { requireOwner } from "@/lib/supabase";
import type { Category } from "@/lib/catalog";

export type Product = {
  id: number;
  code: string;
  category_id: number;
  name: string;
  description: string;
  fabric: string;
  color: string;
  size: string;
  cost: number;
  price: number;
  stock: number;
  availability_override: boolean | null;
  published: boolean;
  archived: boolean;
  photos: string[];
};

export type Customer = { id: number; name: string; phone: string; notes: string };
export const statuses = {
  recibido: "Recibido",
  en_proceso: "En proceso",
  listo: "Listo",
  entregado: "Entregado",
  cancelado: "Cancelado",
};
export const kinds = { confeccion: "Confección", arreglo: "Arreglo", otro: "Otro" };

export type Order = {
  id: number;
  customer_id: number;
  description: string;
  kind: keyof typeof kinds;
  status: keyof typeof statuses;
  received_date: string;
  due_date: string;
  delivered_date: string | null;
  cancellation_reason: string;
  price: number;
  urgent: boolean;
};

export async function getCategories() {
  const db = await requireOwner();
  const { data, error } = await db.from("categories").select("*").order("name").returns<Category[]>();
  if (error) throw new Error("No se pudieron cargar las categorías");
  return data;
}

export async function getCustomers() {
  const db = await requireOwner();
  const { data, error } = await db.from("customers").select("*").order("name").returns<Customer[]>();
  if (error) throw new Error("No se pudieron cargar los clientes");
  return data;
}
