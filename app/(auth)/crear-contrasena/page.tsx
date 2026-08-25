import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/layout/site-header";
import { getCurrentUser } from "@/lib/auth/session";
import { changeInitialPasswordAction } from "./actions";

type ChangePasswordPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function ChangePasswordPage({
  searchParams
}: ChangePasswordPageProps) {
  const user = await getCurrentUser();
  const params = await searchParams;

  if (!user) {
    redirect("/login");
  }

  if (!user.mustChangePassword) {
    redirect("/panel");
  }

  return (
    <>
      <SiteHeader />
      <main className="page-chrome auth-shell">
        <section className="auth-card">
          <span className="eyebrow">Primer inicio</span>
          <h1>Crear nueva contraseña</h1>
          <p>
            Para continuar al panel, define una contraseña personal. Debe tener
            al menos 8 caracteres.
          </p>

          {params?.error ? (
            <div className="auth-error">
              Las contraseñas no coinciden o no cumplen el mínimo requerido.
            </div>
          ) : null}

          <form action={changeInitialPasswordAction} className="case-form">
            <div className="case-form-grid">
              <label className="case-field case-field-span-2">
                <span>Nueva contraseña</span>
                <input
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>

              <label className="case-field case-field-span-2">
                <span>Confirmar contraseña</span>
                <input
                  name="confirmation"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>
            </div>

            <div className="case-form-actions auth-actions">
              <button className="button primary" type="submit">
                Guardar y entrar
              </button>
            </div>
          </form>
        </section>
      </main>
    </>
  );
}
