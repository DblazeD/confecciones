import Link from "next/link";
import { notFound } from "next/navigation";
import { saveOrder, updateStatus } from "@/app/admin/actions";
import { CustomerForm } from "@/app/admin/clientes/customer-form";
import { ActionForm } from "@/app/components/action-form";
import { getCustomers, kinds, statuses, type Order } from "@/lib/admin";
import { money, today } from "@/lib/format";
import { requireOwner } from "@/lib/supabase";

type History = { id: number; previous: Order | null; current_snapshot: Order; changed_at: string };
const time = new Intl.DateTimeFormat("es-CO", { dateStyle: "short", timeStyle: "short", timeZone: "America/Bogota" });

function describeChange(oldOrder: Order | null, order: Order) {
  if (!oldOrder) return "Pedido registrado";
  const changes: string[] = [];
  if (oldOrder.status !== order.status) changes.push(statuses[oldOrder.status] + " → " + statuses[order.status]);
  if (oldOrder.customer_id !== order.customer_id) changes.push("Cliente actualizado");
  if (oldOrder.description !== order.description) changes.push("Descripción actualizada");
  if (oldOrder.kind !== order.kind) changes.push("Tipo actualizado");
  if (oldOrder.urgent !== order.urgent) changes.push(order.urgent ? "Marcado como urgente" : "Urgencia retirada");
  if (oldOrder.received_date !== order.received_date) changes.push("Recepción actualizada al " + order.received_date);
  if (oldOrder.due_date !== order.due_date) changes.push("Entrega actualizada al " + order.due_date);
  if (oldOrder.price !== order.price) changes.push(money(oldOrder.price) + " → " + money(order.price));
  if (order.cancellation_reason && oldOrder.cancellation_reason !== order.cancellation_reason) changes.push(order.cancellation_reason);
  return changes.join(" · ") || "Pedido actualizado";
}

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === "nuevo";
  if (!isNew && !/^\d{1,12}$/.test(id)) notFound();
  const db = await requireOwner();
  const [customers, result, history] = await Promise.all([
    getCustomers(),
    isNew ? null : db.from("orders").select("*").eq("id", id).maybeSingle<Order>(),
    isNew ? null : db.from("order_history").select("*").eq("order_id", id)
      .order("id", { ascending: false }).limit(25).returns<History[]>(),
  ]);
  if (result?.error || history?.error) throw new Error("No se pudo cargar el pedido");
  const order = result?.data;
  if (!isNew && !order) notFound();
  return <>
    <Link className="back-link" href="/admin/pedidos">Volver a pedidos</Link>
    <div className="workspace-title"><h1>{order ? "Pedido " + order.id : "Nuevo pedido"}</h1>
      {order && <span className="status">{statuses[order.status]}</span>}
    </div>
    <section className="panel">
      {customers.length ? <ActionForm action={saveOrder} label="Guardar pedido" grid>
        {order && <input type="hidden" name="id" value={order.id} />}
        <label>Cliente <select name="customer" required defaultValue={order?.customer_id ?? ""}>
          <option value="">Selecciona un cliente</option>
          {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} · {customer.phone}</option>)}
        </select></label>
        <label>Tipo <select name="kind" defaultValue={order?.kind}>
          {Object.entries(kinds).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>
        <label className="span">Descripción <textarea name="description" required maxLength={2000} defaultValue={order?.description} /></label>
        <label>Fecha de recepción <input type="date" name="received" required defaultValue={order?.received_date ?? today()} /></label>
        <label>Fecha requerida <input type="date" name="due" required defaultValue={order?.due_date} /></label>
        <label>Precio (COP) <input type="number" name="price" min="0" step=".01" required defaultValue={order?.price} /></label>
        <label className="check"><input type="checkbox" name="urgent" defaultChecked={order?.urgent} /> Urgente</label>
      </ActionForm> : <p>Registra al cliente para crear su pedido.</p>}
      <details open={!customers.length}>
        <summary>Registrar cliente desde el pedido</summary>
        <CustomerForm />
      </details>
    </section>
    {order && <>
      <section className="panel">
        <h2>Estado</h2>
        {order.delivered_date && <p>Entregado el {order.delivered_date}</p>}
        {order.cancellation_reason && <p>Motivo de cancelación: {order.cancellation_reason}</p>}
        <ActionForm action={updateStatus} label="Actualizar estado" grid>
          <input type="hidden" name="id" value={order.id} />
          <label>Estado <select name="status" defaultValue={order.status}>
            {Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
          <label>Motivo si cancelas <input name="reason" maxLength={500} defaultValue={order.cancellation_reason} /></label>
        </ActionForm>
      </section>
      {!!history?.data?.length && <section className="panel">
        <h2>Historial del pedido</h2>
        <ul className="stack">
          {history.data.map((change) => <li key={change.id}>
            <span className="subtle">{time.format(new Date(change.changed_at))}</span><br />
            {describeChange(change.previous, change.current_snapshot)}
          </li>)}
        </ul>
      </section>}
    </>}
  </>;
}
