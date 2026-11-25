import Link from "next/link";
import { ActionForm } from "@/app/components/action-form";
import { signIn } from "@confecciones/backend/actions";
import { WorkshopMark } from "@/app/components/workshop-mark";
import { getBrand } from "@confecciones/backend/catalog";
import { isSupabaseConfigured } from "@confecciones/backend/supabase";

export const metadata = { title: "Acceso propietaria" };

export default async function AccessPage() {
  const configured = isSupabaseConfigured();
  const brand = await getBrand();
  return (
    <main className="login">
      <aside className="login-intro">
        <WorkshopMark brand={brand} />
        <Link href="/" className="login-back">Volver al inicio</Link>
        <div className="login-message">
          <p className="eyebrow">Espacio privado</p>
          <p className="login-title">Administra tu taller con tranquilidad.</p>
          <p>Controla tus pedidos, productos e inventario desde un solo lugar.</p>
        </div>
      </aside>
      <section className="login-main" aria-labelledby="login-heading">
        <div className="login-form">
          <span className="login-symbol" aria-hidden="true">⚙</span>
          <p className="eyebrow">Panel administrativo</p>
          <h1 id="login-heading">Iniciar sesión</h1>
          <ActionForm action={signIn} label="Ingresar al panel">
            <label>Correo electrónico <input autoComplete="username" name="email" type="email" required /></label>
            <label>Contraseña <input autoComplete="current-password" name="password" type="password" required /></label>
          </ActionForm>
          {!configured && <p className="login-status" role="status">El acceso estará disponible cuando se conecte la base de datos.</p>}
        </div>
      </section>
    </main>
  );
}
