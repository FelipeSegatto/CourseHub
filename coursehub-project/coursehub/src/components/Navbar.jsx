import { Link, NavLink } from "react-router-dom";
import CourseHubLogo from "./logo/Logo";

export default function Navbar() {
  const linkClass = ({ isActive }) =>
    `text-sm transition ${
      isActive
        ? "font-semibold text-blue-600"
        : "text-gray-600 hover:text-blue-600"
    }`;

  return (
    <header className="sticky top-0 z-50 mb-6 border-b border-gray-200 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto grid max-w-[1500px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-8 px-5 py-4">
        <Link
          to="/"
          aria-label="Ir para a página inicial"
          className="flex items-center gap-3 justify-self-start"
        >
          <div>
            <CourseHubLogo />

            <p className="-mt-2 text-center text-xs text-gray-500">
              Learn. Build. Grow.
            </p>
          </div>
        </Link>

        <nav className="hidden w-full items-center justify-center gap-12 lg:flex">
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

          <NavLink
            to="/fale-conosco"
            className={linkClass}
          >
            Fale conosco
          </NavLink>
        </nav>

        <div className="flex font-pt text-semibold items-center gap-3">
         
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