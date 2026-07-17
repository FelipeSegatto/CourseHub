import { Link, NavLink } from "react-router-dom";

export default function Navbar() {
  const linkClass = ({ isActive }) =>
    isActive
      ? "text-gray-950 font-medium"
      : "text-gray-600 hover:text-gray-950 transition";

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-8">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-sm font-sansfont-bold text-white">
            C
          </div>

          <div className="leading-tight">
            <p className="text-2xl font-semibold font-sans tracking-tight text-gray-950">
              CourseHub
            </p>
            <p className="text-xs text-gray-500 font-sans">Learn. Build. Grow.</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-10 md:flex">
          <NavLink to="/" className={linkClass}>
            Cursos
          </NavLink>

          <NavLink to="/dashboard" className={linkClass}>
            Portal
          </NavLink>

          <NavLink to="/profile" className={linkClass}>
            Perfil
          </NavLink>

          <NavLink to="/about" className={linkClass}>
            Sobre
          </NavLink>
        </nav>

        <div className="flex items-center gap-5">
           <div className="flex items-center gap-1"> 
            <Link
                to="/register"
                className="hidden rounded-full border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition md:inline"
            >
                Cadastrar
            </Link>  
            <Link
                to="/login"
                className="hidden text-sm font-medium text-gray-700 hover:text-gray-950 md:inline"
            >
                Entrar
            </Link>
        </div>

          <Link
            to="/"
            className="rounded-full bg-gray-950 px-4 py-3 text-sm font-semibold text-white hover:bg-gray-800 transition"
          >
            Ver cursos
          </Link>
        </div>
      </div>
    </header>
  );
}