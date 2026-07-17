import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function PublicOnlyRoute() {
  const { usuarioLogado, loading } = useAuth();

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p>Carregando...</p>
      </main>
    );
  }

  if (!usuarioLogado) {
    return <Outlet />;
  }

  if (usuarioLogado.role === "admin") {
    return <Navigate to="/admin" replace />;
  }

  if (usuarioLogado.role === "teacher") {
    return <Navigate to="/professor" replace />;
  }

  return <Navigate to="/aluno" replace />;
}