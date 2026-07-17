import { Link, NavLink } from "react-router-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import LogoutButton from "./LogoutButton";
import NavbarDropdown from "./NavbarDropdown";

export default function NavbarAdmin() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const managementItems = [
  {
    label: "Dashboard",
    to: "/admin/dashboard-admin",
  },
  {
    label: "Relatórios",
    to: "/admin/relatorios",
  },
  {
    label: "Emissão",
    to: "/admin/emissao",
  },
];

const courseItems = [
  {
    label: "Cursos",
    to: "/admin/cursos",
  },
  {
    label: "Materiais",
    to: "/admin/materiais",
  },
  {
    label: "Atividades e Avaliações",
    to: "/admin/atividades",
  },
];

const studentItems = [
  {
    label: "Alunos",
    to: "/admin/alunos",
  },
  {
    label: "Matrículas",
    to: "/admin/matriculas",
  },
  {
    label: "Notas",
    to: "/admin/notas",
  },
  {
    label: "Progressão",
    to: "/admin/progressao",
  },
];

const teacherItems = [
  {
    label: "Professores",
    to: "/admin/professores",
  },
    {
    label: "Turmas",
    to: "/admin/turmas",
  },
];

  function handleLogout() {
    logout();
    navigate("/", { replace: true });
  }

  const linkClass = ({ isActive }) =>
    isActive
      ? "text-blue-600 font-semibold"
      : "text-gray-600 hover:text-blue-600 transition";

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur mb-6">
        <div className="mx-auto grid max-w-6xl grid-cols-3 items-center px-4 py-4">
            <Link to="/admin" className="flex items-center gap-2 justify-self-start">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white font-bold">
                C
            </div>

            <div>
                <p className="text-lg font-bold text-gray-900">CourseHub</p>
                <p className="text-xs text-gray-500">Learn. Build. Grow.</p>
            </div>
            </Link>
            
          
            <nav className="hidden items-center justify-center gap-8 md:flex">

                <NavbarDropdown
                    title="Administração"
                    items={managementItems}
                />

                <NavbarDropdown
                    title="Cursos"
                    items={courseItems}
                />

                <NavbarDropdown
                    title="Alunos"
                    items={studentItems}
                />

                <NavbarDropdown
                    title="Professores"
                    items={teacherItems}
                />

            </nav>

            <div className="flex items-center justify-end gap-2">
                <button
                    type="button"
                    onClick={handleLogout}
                    aria-label="Sair"
                    title="Sair"
                    className="
                    flex h-11 w-11 items-center justify-center
                    rounded-full border border-gray-200
                    bg-white text-gray-700
                    transition-all duration-200
                    hover:-translate-y-0.5
                    hover:border-red-200
                    hover:bg-red-50
                    hover:text-red-600
                    hover:shadow-sm
                    "
                >
                    <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-5 w-5"
                    >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M10.5 6H6.75A2.25 2.25 0 0 0 4.5 8.25v7.5A2.25 2.25 0 0 0 6.75 18h3.75M15 15.75 18.75 12 15 8.25M18.75 12H9"
                    />
                    </svg>
                </button>

                <Link
                    to="/admin/perfil"
                    className="
                    flex h-9 items-center gap-2 rounded-full
                    bg-slate-950 px-4
                    text-sm font-regular text-white
                    transition-all duration-200
                    hover:-translate-y-0.5
                    hover:bg-slate-800
                    hover:shadow-lg
                    hover:shadow-slate-950/15
                    "
                >
                    Meu perfil

                    <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-4 w-4"
                    >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m9 18 6-6-6-6"
                    />
                    </svg>
                </Link>
            </div>
        </div>
    </header>
  );
}