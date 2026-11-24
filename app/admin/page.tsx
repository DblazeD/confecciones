import Link from "next/link";
import { statuses, type Order } from "@/lib/admin";
import { today } from "@/lib/format";
import { requireOwner } from "@/lib/supabase";

type Upcoming = Pick<Order, "id" | "description" | "due_date" | "status"> & { customers: { name: string } | null };
type Movement = { id: number; quantity: number; reason: string; movement_date: string; products: { name: string } | null };
const active = ["recibido", "en_proceso", "listo"];

export default async function AdminHome() {
  const db = await requireOwner();
  const date = today();
  const week = new Date(Date.parse(date) + 7 * 86_400_000).toISOString().slice(0, 10);
  const [upcoming, late, noStock, movements] = await Promise.all([
    db.from("orders").select("id,description,due_date,status,customers(name)", { count: "exact" })
      .in("status", active).gte("due_date", date).lte("due_date", week)
      .order("due_date").order("id").limit(5).returns<Upcoming[]>(),
    db.from("orders").select("id", { count: "exact", head: true }).in("status", active).lt("due_date", date),
    db.from("products").select("id", { count: "exact", head: true }).eq("archived", false).eq("stock", 0),
    db.from("stock_movements").select("id,quantity,reason,movement_date,products(name)")
      .order("id", { ascending: false }).limit(5).returns<Movement[]>(),
  ]);
  if (upcoming.error || late.error || noStock.error || movements.error) {
    throw new Error("No se pudo cargar el panel");
  }
  const summary = [
    { title: "Pedidos por entregar", value: upcoming.count, detail: "Próximos 7 días", href: "/admin/pedidos" },
    { title: "Pedidos vencidos", value: late.count, detail: "En la agenda activa", href: "/admin/pedidos" },
    { title: "Productos sin existencias", value: noStock.count, detail: "En el inventario", href: "/admin/inventario" },
  ];

  return <>
    <div className="workspace-title">
      <h1>Panel del día</h1>
      <Link className="button" href="/admin/pedidos/nuevo">Nuevo pedido</Link>
    </div>
    <div className="dashboard-summary">
      {summary.map((item) => <Link className="dashboard-card" href={item.href} key={item.title}>
        <span>{item.title}</span>
        <strong>{item.value ?? 0}</strong>
        <small>{item.detail}</small>
      </Link>)}
    </div>
    <div className="dashboard-grid">
      <section className="panel">
        <div className="workspace-title">
          <h2>Próximos a entregar</h2>
          <Link href="/admin/pedidos">Ver pedidos</Link>
        </div>
        {!upcoming.data.length && <p>No hay entregas programadas para los próximos 7 días.</p>}
        <ul className="dashboard-list">
          {upcoming.data.map((order) => <li key={order.id}>
            <time dateTime={order.due_date}>{order.due_date}</time>
            <div><Link href={`/admin/pedidos/${order.id}`}>{order.customers?.name ?? "Ver pedido"}</Link><br />
              <span className="subtle">{order.description}</span></div>
            <span className="status">{statuses[order.status]}</span>
          </li>)}
        </ul>
      </section>
      <section className="panel">
        <div className="workspace-title">
          <h2>Movimientos de inventario</h2>
          <Link href="/admin/inventario">Ver inventario</Link>
        </div>
        {!movements.data.length && <p>Aún no hay movimientos.</p>}
        <ul className="dashboard-list">
          {movements.data.map((movement) => <li key={movement.id}>
            <span className="status">{movement.quantity > 0 ? "+" : ""}{movement.quantity}</span>
            <div><strong>{movement.products?.name}</strong><br /><span className="subtle">{movement.reason}</span></div>
            <time dateTime={movement.movement_date}>{movement.movement_date}</time>
          </li>)}
        </ul>
      </section>
    </div>
  </>;
}
