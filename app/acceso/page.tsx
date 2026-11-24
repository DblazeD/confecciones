import { ActionForm } from "@/app/components/action-form";
import { signIn } from "@/app/admin/actions";

export const metadata = { title: "Acceso propietaria" };

export default function AccessPage() {
  const configured = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return (
    <main className="shell login">
      <section className="panel">
        <h1>Acceso propietaria</h1>
        {!configured && <p className="feedback error" role="status">El acceso estará disponible cuando se configure la conexión con la base de datos.</p>}
        <ActionForm action={signIn} label="Iniciar sesión">
          <label>Correo <input autoComplete="username" name="email" type="email" required /></label>
          <label>Contraseña <input autoComplete="current-password" name="password" type="password" required /></label>
        </ActionForm>
      </section>
    </main>
  );
}
