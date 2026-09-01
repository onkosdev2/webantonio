import type { Route } from "next";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/layout/site-header";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { loginAction, setupFirstAdminAction } from "./actions";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
    setup?: string;
    next?: string;
  }>;
};

function safeNextPath(value?: string): Route {
  return (
    value?.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\")
      ? value
      : "/panel"
  ) as Route;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = safeNextPath(params?.next);
  const currentUser = await getCurrentUser();

  if (currentUser && !currentUser.mustChangePassword) {
    redirect(next);
  }

  if (currentUser?.mustChangePassword) {
    redirect("/crear-contrasena");
  }

  const usersCount = await db.user.count();
  const isSetup = usersCount === 0;
  const hasError = Boolean(params?.error);

  return (
    <>
      <SiteHeader />
      <main className="page-chrome auth-shell">
        <section className="auth-frame" aria-labelledby="auth-title">
          <aside className="auth-context">
            <div>
              <span className="auth-context-kicker">Archivo médico de autor</span>
              <h2>Un espacio privado para cuidar cada publicación.</h2>
              <p>
                Organiza casos, actualidad, evidencia y recursos clínicos desde
                una cabina editorial coherente con la experiencia pública.
              </p>
            </div>
            <ul className="auth-context-list" aria-label="Áreas del panel">
              <li>Edición y revisión clínica</li>
              <li>Publicación y archivo</li>
              <li>Integraciones e inteligencia artificial</li>
            </ul>
          </aside>

          <div className="auth-card">
            <span className="eyebrow">
              {isSetup ? "Primer administrador" : "Acceso privado"}
            </span>
            <h1 id="auth-title">
              {isSetup ? "Crear acceso inicial" : "Iniciar sesión"}
            </h1>
            <p>
              {isSetup
                ? "Configura el primer usuario administrador para activar el panel privado."
                : "Ingresa con tu cuenta autorizada para administrar el contenido del sitio."}
            </p>

            {hasError ? (
              <div className="auth-error" role="alert">
                {isSetup
                  ? "Revisa los datos. La contraseña debe tener al menos 12 caracteres e incluir mayúsculas, minúsculas y números."
                  : "Correo o contraseña incorrectos. Verifica tus datos e inténtalo nuevamente."}
              </div>
            ) : null}

            <form action={isSetup ? setupFirstAdminAction : loginAction} className="case-form">
              <input type="hidden" name="next" value={next} />
              <div className="case-form-grid">
                {isSetup ? (
                  <label className="case-field case-field-span-2">
                    <span>Nombre</span>
                    <input name="name" autoComplete="name" required />
                  </label>
                ) : null}

                <label className="case-field case-field-span-2">
                  <span>Correo</span>
                  <input name="email" type="email" autoComplete="email" required />
                </label>

                <label className="case-field case-field-span-2">
                  <span>Contraseña</span>
                  <input
                    name="password"
                    type="password"
                    autoComplete={isSetup ? "new-password" : "current-password"}
                    minLength={12}
                    required
                  />
                </label>
              </div>

              <div className="case-form-actions auth-actions">
                <a className="auth-back-link" href="/">
                  ← Volver al sitio
                </a>
                <button className="button primary" type="submit">
                  {isSetup ? "Crear administrador" : "Entrar al panel"}
                </button>
              </div>
            </form>
          </div>
        </section>
      </main>
    </>
  );
}
