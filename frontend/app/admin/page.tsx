import Link from "next/link";
import { getDashboard, statuses } from "@confecciones/backend/admin";
import { today } from "@/lib/format";

export default async function AdminHome() {
  const { upcoming, upcomingCount, lateCount, noStockCount, movements } = await getDashboard(today());
  const summary = [
    { title: "Pedidos por entregar", value: upcomingCount, detail: "Próximos 7 días", href: "/admin/pedidos" },
    { title: "Pedidos vencidos", value: lateCount, detail: "En la agenda activa", href: "/admin/pedidos" },
    { title: "Productos sin existencias", value: noStockCount, detail: "En el inventario", href: "/admin/inventario" },
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
        {!upcoming.length && <p>No hay entregas programadas para los próximos 7 días.</p>}
        <ul className="dashboard-list">
          {upcoming.map((order) => <li key={order.id}>
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
        {!movements.length && <p>Aún no hay movimientos.</p>}
        <ul className="dashboard-list">
          {movements.map((movement) => <li key={movement.id}>
            <span className="status">{movement.quantity > 0 ? "+" : ""}{movement.quantity}</span>
            <div><strong>{movement.products?.name}</strong><br /><span className="subtle">{movement.reason}</span></div>
            <time dateTime={movement.movement_date}>{movement.movement_date}</time>
          </li>)}
        </ul>
      </section>
    </div>
  </>;
}
