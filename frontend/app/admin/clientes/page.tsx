import { getCustomers } from "@confecciones/backend/admin";
import { CustomerForm } from "./customer-form";

export default async function CustomersPage() {
  const customers = await getCustomers();
  return <>
    <h1>Clientes</h1>
    <section className="panel">
      <h2>Registrar cliente</h2>
      <CustomerForm />
    </section>
    <section className="panel">
      <h2>Clientes registrados</h2>
      {!customers.length && <p>Aún no hay clientes.</p>}
      {customers.map((customer) => <details key={customer.id}>
        <summary>{customer.name} · {customer.phone}</summary>
        <CustomerForm customer={customer} />
      </details>)}
    </section>
  </>;
}
