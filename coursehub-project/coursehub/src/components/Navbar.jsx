import { Link, NavLink } from "react-router-dom";
import CourseHubLogo from "./logo/Logo";

export default function Navbar() {
  const linkClass = ({ isActive }) =>
    isActive
      ? "font-medium text-gray-950"
      : "text-gray-600 transition hover:text-gray-950";

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
        <Link
          to="/"
          aria-label="Ir para a página inicial"
          className="flex shrink-0 items-center"
        >
          <CourseHubLogo />
        </Link>

        <nav className="hidden items-center gap-16 lg:flex">
          <NavLink
            to="/courses"
            className={linkClass}
          >
            Cursos
          </NavLink>
          
          <NavLink
            to="/portal"
            className={linkClass}
          >
            Portal
          </NavLink>
          
        

          <NavLink
            to="/about"
            className={linkClass}
          >
            Sobre
          </NavLink>

          
        </nav>

        <div className="flex items-center gap-3">
         
          <Link
            to="/register"
            className="hidden rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 md:inline-flex"
          >
            Criar conta
          </Link>

          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-full bg-gray-950 px-5 py-2.5 text-sm font-regular text-white transition hover:bg-gray-800"
          >
            Entrar
          </Link>
        </div>
      </div>
    </header>
  );
}