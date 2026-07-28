import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import CourseHubLogo from "./logo/Logo";
import NavbarDropdown from "./NavbarDropdown";

export default function NavbarAlunos() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const studiesItems = [
    {
      label: "Atividades",
      to: "/aluno/atividades",
    },
    {
      label: "Avaliações",
      to: "/aluno/avaliacoes",
    },
    {
      label: "Notas",
      to: "/aluno/notas",
    },
    {
      label: "Calendário",
      to: "/aluno/calendario",
    },
    {
      label: "Progresso",
      to: "/aluno/progresso",
    },
  ];

  function handleLogout() {
    logout();
    navigate("/", { replace: true });
  }

  const linkClass = ({ isActive }) =>
    `text-sm transition ${
      isActive
        ? "font-semibold text-blue-600"
        : "text-gray-600 hover:text-blue-600"
    }`;

  return (
    <header
      className="
        sticky top-0 z-50 mb-6
        border-b border-gray-200
        bg-white/85 backdrop-blur-xl
      "
    >
      <div
        className="
          mx-auto grid max-w-7xl
          grid-cols-[auto_1fr_auto] justify-start text-center
          items-center gap-8
          px-6 py-4
        "
      >
        <Link
          to="/aluno/dashboard-aluno"
          className="flex items-center gap-3 justify-self-start"
        >
         

          <div>
          <CourseHubLogo />
           <p className="text-xs text-gray-500 font-sans">Learn. Build. Grow.</p>
          </div>
        </Link>

        <nav
          className="
            hidden items-center justify-center
            gap-7 md:flex
          "
          aria-label="Navegação do aluno"
        >
          <NavLink
            to="/aluno/dashboard-aluno"
            end
            className={linkClass}
          >
            Área do Aluno
          </NavLink>

          <NavLink
            to="/aluno/meus-cursos"
            className={linkClass}
          >
            Meus Cursos
          </NavLink>

          <NavbarDropdown
            title="Estudos"
            titleTo="/aluno/dashboard-aluno"
            items={studiesItems}
          />

          <NavLink
            to="/aluno/financeiro"
            className={linkClass}
          >
            Financeiro
          </NavLink>

          <NavLink
            to="/aluno/notificacoes"
            className={linkClass}
          >
            Notificações
          </NavLink>
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
                d="
                  M10.5 6H6.75
                  A2.25 2.25 0 0 0 4.5 8.25
                  v7.5
                  A2.25 2.25 0 0 0 6.75 18
                  h3.75
                  M15 15.75 18.75 12 15 8.25
                  M18.75 12H9
                "
              />
            </svg>
          </button>

          <Link
            to="/aluno/perfil"
            className="
              flex h-10 items-center gap-2
              rounded-full bg-slate-950 px-5
              text-sm font-medium text-white
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