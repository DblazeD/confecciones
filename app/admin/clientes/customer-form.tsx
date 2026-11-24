import { saveCustomer } from "@/app/admin/actions";
import { ActionForm } from "@/app/components/action-form";
import type { Customer } from "@/lib/admin";

export function CustomerForm({ customer }: { customer?: Customer }) {
  return <ActionForm action={saveCustomer} label="Guardar cliente" grid>
    {customer && <input type="hidden" name="id" value={customer.id} />}
    <label>Nombre <input name="name" required maxLength={120} defaultValue={customer?.name} /></label>
    <label>Teléfono <input name="phone" type="tel" required maxLength={24} defaultValue={customer?.phone} /></label>
    <label className="span">Notas <textarea name="notes" maxLength={1000} defaultValue={customer?.notes} /></label>
  </ActionForm>;
}
