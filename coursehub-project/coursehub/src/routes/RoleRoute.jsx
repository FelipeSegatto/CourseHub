import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function RoleRoute({ allowedRoles }) {
  const { usuarioLogado, loading } = useAuth();

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p>Carregando...</p>
      </main>
    );
  }

  if (!usuarioLogado) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(usuarioLogado.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}