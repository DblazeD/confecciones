"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const entries = [
  ["/admin", "Panel del día"],
  ["/admin/productos", "Productos"],
  ["/admin/productos#categorias", "Categorías"],
  ["/admin/inventario", "Inventario"],
  ["/admin/pedidos", "Pedidos"],
  ["/admin/clientes", "Clientes"],
  ["/admin/configuracion", "Configuración"],
];

export function WorkspaceNav() {
  const pathname = usePathname();
  return (
    <nav className="workspace-nav" aria-label="Gestión del taller">
      {entries.map(([href, label]) => {
        const active = pathname === href || (href !== "/admin" && pathname.startsWith(href + "/"));
        return <Link key={href} href={href} aria-current={active ? "page" : undefined}>{label}</Link>;
      })}
    </nav>
  );
}
