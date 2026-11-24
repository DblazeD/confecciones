import type { ReactNode } from "react";
import { requireOwner } from "@/lib/supabase";
import { RestoreSession } from "@/app/components/restore-session";
import { WorkshopMark } from "@/app/components/workshop-mark";
import { getBrand } from "@/lib/catalog";
import { WorkspaceNav } from "./workspace-nav";
import { signOut } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireOwner();
  const brand = await getBrand();
  return (
    <div className="workspace-frame">
      <RestoreSession />
      <aside className="workspace-sidebar">
        <WorkshopMark brand={brand} />
        <WorkspaceNav />
        <form action={signOut}><button type="submit">Cerrar sesión</button></form>
      </aside>
      <div className="workspace-content">
        <header className="workspace-header">
          <span>Gestión del taller</span>
          <span className="status">Propietaria</span>
        </header>
        <main className="workspace">{children}</main>
      </div>
    </div>
  );
}
