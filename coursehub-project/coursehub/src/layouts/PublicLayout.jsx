import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";


export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main>
        <Outlet />
        <footer className="mt-12 py-6 text-center text-sm text-gray-500">
          &copy; 2024 CourseHub. Todos os direitos reservados.
        </footer>
      </main>
    </div>
  );
}