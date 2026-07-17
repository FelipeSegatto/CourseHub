import { Outlet } from "react-router-dom";
import NavbarAlunos from "../components/NavbarAlunos";

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
        <NavbarAlunos />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
        <footer className="mt-12 py-6 text-center text-sm text-gray-500">
          &copy; 2024 CourseHub. Todos os direitos reservados.
        </footer>
      </main>
    </div>
  );
}