import { UserRole } from "@prisma/client";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireUserManagementSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  createUserAction,
  resetUserPasswordAction,
  setUserPasswordAction,
  toggleUserActiveAction
} from "./actions";

type UsersPageProps = {
  searchParams?: Promise<{
    error?: string;
    ok?: string;
  }>;
};

function getMessage(error?: string, ok?: string) {
  if (ok === "created") return "Usuario creado. Deberá crear una nueva contraseña en su primer ingreso.";
  if (ok === "password") return "Contraseña temporal asignada. El usuario deberá cambiarla al ingresar.";
  if (ok === "status") return "Estado del usuario actualizado.";
  if (error === "duplicate") return "Ya existe un usuario con ese correo.";
  if (error === "password") return "La contraseña debe tener al menos 12 caracteres e incluir mayúsculas, minúsculas y números.";
  if (error === "self") return "No puedes desactivar tu propio usuario.";
  if (error) return "No se pudo completar la acción. Revisa los datos.";
  return null;
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  await requireUserManagementSession();

  const params = await searchParams;
  const message = getMessage(params?.error, params?.ok);
  const users = await db.user.findMany({
    orderBy: [{ role: "asc" }, { createdAt: "desc" }]
  });

  return (
    <AdminShell
      title="Manejo de usuarios"
      subtitle="Administra accesos al panel, asigna contraseñas temporales y fuerza el cambio de contraseña en el primer inicio."
    >
      <div className="admin-content-grid">
        <section className="admin-panel admin-section-span">
          <div className="admin-panel-heading">
            <div>
              <span className="kicker">Nuevo acceso</span>
              <h2>Crear usuario</h2>
              <p>
                El usuario recibirá una contraseña temporal y deberá crear una
                nueva contraseña personal al iniciar sesión.
              </p>
            </div>
          </div>

          {message ? (
            <div className={params?.error ? "auth-error" : "auth-success"}>
              {message}
            </div>
          ) : null}

          <form action={createUserAction} className="case-form">
            <div className="case-form-grid">
              <label className="case-field">
                <span>Nombre</span>
                <input name="name" autoComplete="name" required />
              </label>

              <label className="case-field">
                <span>Correo</span>
                <input name="email" type="email" autoComplete="email" required />
              </label>

              <label className="case-field">
                <span>Rol</span>
                <select name="role" defaultValue={UserRole.EDITOR}>
                  <option value={UserRole.EDITOR}>Editor</option>
                  <option value={UserRole.ADMIN}>Administrador</option>
                </select>
              </label>

              <label className="case-field">
                <span>Contraseña temporal</span>
                <input
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>
            </div>

            <div className="case-form-actions auth-actions">
              <button className="button primary" type="submit">
                Crear usuario
              </button>
            </div>
          </form>
        </section>

        <section className="admin-panel admin-section-span">
          <div className="admin-panel-heading">
            <div>
              <span className="kicker">Accesos registrados</span>
              <h2>Usuarios del panel</h2>
            </div>
          </div>

          <div className="user-management-list">
            {users.map((user) => (
              <article key={user.id} className="user-management-card">
                <div className="user-management-head">
                  <div>
                    <span className="case-status-badge">{user.role}</span>
                    <h3>{user.name}</h3>
                    <p>{user.email}</p>
                  </div>
                  <div className="user-status-stack">
                    <span>{user.active ? "Activo" : "Inactivo"}</span>
                    <span>
                      {user.mustChangePassword
                        ? "Debe crear nueva contraseña"
                        : "Contraseña vigente"}
                    </span>
                  </div>
                </div>

                <div className="user-action-grid">
                  <form
                    action={setUserPasswordAction.bind(null, user.id)}
                    className="user-password-form"
                  >
                    <label className="case-field">
                      <span>Asignar contraseña</span>
                      <input
                        name="password"
                        type="password"
                        autoComplete="new-password"
                        minLength={8}
                        placeholder="Contraseña temporal"
                        required
                      />
                    </label>
                    <button className="button secondary" type="submit">
                      Asignar
                    </button>
                  </form>

                  <form
                    action={resetUserPasswordAction.bind(null, user.id)}
                    className="user-password-form"
                  >
                    <label className="case-field">
                      <span>Reiniciar contraseña</span>
                      <input
                        name="password"
                        type="password"
                        autoComplete="new-password"
                        minLength={8}
                        placeholder="Nueva temporal"
                        required
                      />
                    </label>
                    <button className="button secondary" type="submit">
                      Reiniciar
                    </button>
                  </form>

                  <form action={toggleUserActiveAction.bind(null, user.id)}>
                    <button className="button secondary" type="submit">
                      {user.active ? "Desactivar" : "Activar"}
                    </button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
