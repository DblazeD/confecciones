import "server-only";
import { requireOwner } from "./supabase";
import type { Category } from "./catalog";

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

type ListedProduct = Pick<Product, "id" | "code" | "name" | "price" | "category_id" | "published" | "archived">;
type ListedOrder = Order & { customers: { name: string } | null };
type Upcoming = Pick<ListedOrder, "id" | "description" | "due_date" | "status" | "customers">;
type InventoryItem = Pick<Product, "id" | "code" | "name" | "stock" | "category_id" | "published">;
type Movement = { id: number; product_id: number; quantity: number; reason: string; movement_date: string };
type RecentMovement = Omit<Movement, "product_id"> & { products: { name: string } | null };
type PriceChange = { id: number; old_price: number; new_price: number; old_cost: number; new_cost: number; changed_at: string };
type OrderChange = { id: number; previous: Order | null; current_snapshot: Order; changed_at: string };
const activeStatuses = ["recibido", "en_proceso", "listo"];

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

export async function listAdminProducts() {
  const db = await requireOwner();
  const { data, error } = await db.from("products")
    .select("id,code,name,price,category_id,published,archived")
    .order("archived").order("name").returns<ListedProduct[]>();
  if (error) throw new Error("No se pudieron cargar los productos");
  return data;
}

export async function getProductEditor(id: string | null) {
  const db = await requireOwner();
  const [categories, product, prices] = await Promise.all([
    getCategories(),
    id === null ? null : db.from("products").select("*").eq("id", id).maybeSingle<Product>(),
    id === null ? null : db.from("price_history").select("*").eq("product_id", id)
      .order("id", { ascending: false }).limit(20).returns<PriceChange[]>(),
  ]);
  if (product?.error || prices?.error) throw new Error("No se pudo cargar el producto");
  return { categories, product: product?.data ?? null, prices: prices?.data ?? [] };
}

export async function getInventory() {
  const db = await requireOwner();
  const [categories, items, movements] = await Promise.all([
    getCategories(),
    db.from("products").select("id,code,name,stock,category_id,published")
      .eq("archived", false).order("name").returns<InventoryItem[]>(),
    db.from("stock_movements").select("*").order("id", { ascending: false }).limit(25).returns<Movement[]>(),
  ]);
  if (items.error || movements.error) throw new Error("No se pudo cargar el inventario");
  return { categories, items: items.data, movements: movements.data };
}

export async function listOrders(filter: string, page: number) {
  const db = await requireOwner();
  const pageSize = 25;
  let query = db.from("orders").select("*,customers(name)");
  if (filter && filter !== "todos") query = query.eq("status", filter);
  if (!filter) query = query.in("status", activeStatuses);
  const { data, error } = await query.order("urgent", { ascending: false }).order("due_date").order("id")
    .range((page - 1) * pageSize, page * pageSize).returns<ListedOrder[]>();
  if (error) throw new Error("No se pudieron cargar los pedidos");
  return { orders: data.slice(0, pageSize), more: data.length > pageSize };
}

export async function getOrderEditor(id: string | null) {
  const db = await requireOwner();
  const [customers, order, history] = await Promise.all([
    getCustomers(),
    id === null ? null : db.from("orders").select("*").eq("id", id).maybeSingle<Order>(),
    id === null ? null : db.from("order_history").select("*").eq("order_id", id)
      .order("id", { ascending: false }).limit(25).returns<OrderChange[]>(),
  ]);
  if (order?.error || history?.error) throw new Error("No se pudo cargar el pedido");
  return { customers, order: order?.data ?? null, history: history?.data ?? [] };
}

export async function getDashboard(date: string) {
  const db = await requireOwner();
  const week = new Date(Date.parse(date) + 7 * 86_400_000).toISOString().slice(0, 10);
  const [upcoming, late, noStock, movements] = await Promise.all([
    db.from("orders").select("id,description,due_date,status,customers(name)", { count: "exact" })
      .in("status", activeStatuses).gte("due_date", date).lte("due_date", week)
      .order("due_date").order("id").limit(5).returns<Upcoming[]>(),
    db.from("orders").select("id", { count: "exact", head: true }).in("status", activeStatuses).lt("due_date", date),
    db.from("products").select("id", { count: "exact", head: true }).eq("archived", false).eq("stock", 0),
    db.from("stock_movements").select("id,quantity,reason,movement_date,products(name)")
      .order("id", { ascending: false }).limit(5).returns<RecentMovement[]>(),
  ]);
  if (upcoming.error || late.error || noStock.error || movements.error) {
    throw new Error("No se pudo cargar el panel");
  }
  return {
    upcoming: upcoming.data,
    upcomingCount: upcoming.count,
    lateCount: late.count,
    noStockCount: noStock.count,
    movements: movements.data,
  };
}
