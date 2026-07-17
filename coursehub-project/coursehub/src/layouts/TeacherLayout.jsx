import NavbarProfessor from "../components/NavbarProfessor";
import { Outlet } from "react-router-dom";

export default function TeacherLayout() {
  return (
    <div>
      <NavbarProfessor />
      <main className="p-6">
            <Outlet />
       
        <footer className="mt-12 py-6 text-center text-sm text-gray-500">
          &copy; 2024 CourseHub. Todos os direitos reservados.
        </footer>
      </main>
    </div>
  );
}