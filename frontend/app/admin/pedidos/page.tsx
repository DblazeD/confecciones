import Link from "next/link";
import { listOrders, statuses } from "@confecciones/backend/admin";
import { deadlineClass, first, money, today } from "@/lib/format";

type Filters = Promise<Record<string, string | string[] | undefined>>;

export default async function OrdersPage({ searchParams }: { searchParams: Filters }) {
  const params = await searchParams;
  const requested = first(params.estado);
  const filter = Object.hasOwn(statuses, requested) || requested === "todos" ? requested : "";
  const page = Math.min(10_000, Math.max(1, Math.trunc(Number(first(params.pagina))) || 1));
  const { orders, more } = await listOrders(filter, page);
  const date = today();
  const pageHref = (next: number) => "/admin/pedidos?" + new URLSearchParams({ estado: filter, pagina: String(next) });
  return <>
    <div className="workspace-title">
      <h1>Pedidos</h1>
      <Link className="button" href="/admin/pedidos/nuevo">Nuevo pedido</Link>
    </div>
    <section className="panel">
      <form className="filters">
        <label>Estado <select name="estado" defaultValue={filter}>
          <option value="">Agenda activa</option><option value="todos">Todos los pedidos</option>
          {Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>
        <button className="button secondary">Filtrar</button>
      </form>
      {!orders.length ? <p>No hay pedidos para mostrar.</p> : <div className="table-wrap"><table>
        <thead><tr><th>Pedido</th><th>Cliente</th><th>Fecha requerida</th><th>Estado</th><th>Precio</th></tr></thead>
        <tbody>{orders.map((order) => {
          const alert = ["entregado", "cancelado"].includes(order.status) ? "" : deadlineClass(order.due_date, date);
          return <tr key={order.id}>
            <td><Link href={`/admin/pedidos/${order.id}`}>{order.description.slice(0, 100)}</Link><br />
              {order.urgent && <span className="status urgent">Urgente</span>}</td>
            <td>{order.customers?.name}</td>
            <td>{order.due_date}{alert && <><br /><span className="deadline">{alert}</span></>}</td>
            <td>{statuses[order.status]}</td><td>{money(order.price)}</td>
          </tr>;
        })}</tbody>
      </table></div>}
      {(page > 1 || more) && <nav className="pager" aria-label="Páginas de pedidos">
        {page > 1 && <Link href={pageHref(page - 1)} className="button secondary">Anterior</Link>}
        <span>Página {page}</span>
        {more && <Link href={pageHref(page + 1)} className="button secondary">Siguiente</Link>}
      </nav>}
    </section>
  </>;
}
