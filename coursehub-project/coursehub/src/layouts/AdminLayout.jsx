import NavbarAdmin from "../components/NavbarAdmin";
import { Outlet } from "react-router-dom";

export default function AdminLayout() {
  return (
    <div>
      <div className="print-hide">
        <NavbarAdmin />
      </div>
      <main className="p-6">
            <Outlet />

        <footer className="print-hide mt-12 py-6 text-center text-sm text-gray-500">
          &copy; 2024 CourseHub. Todos os direitos reservados.
        </footer>
      </main>
    </div>
  );
}