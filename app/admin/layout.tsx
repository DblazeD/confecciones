import type { ReactNode } from "react";
import Link from "next/link";
import { requireOwner } from "@/lib/supabase";
import { RestoreSession } from "@/app/components/restore-session";
import { signOut } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireOwner();
  return (
    <main className="shell workspace">
      <RestoreSession />
      <nav className="workspace-nav" aria-label="Panel del taller">
        <Link className="button secondary small" href="/admin/pedidos">Pedidos</Link>
        <Link className="button secondary small" href="/admin/productos">Productos</Link>
        <Link className="button secondary small" href="/admin/inventario">Inventario</Link>
        <Link className="button secondary small" href="/admin/clientes">Clientes</Link>
        <Link className="button secondary small" href="/admin/configuracion">Configuración</Link>
        <form action={signOut}><button className="button secondary small">Cerrar sesión</button></form>
      </nav>
      {children}
    </main>
  );
}
