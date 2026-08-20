import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useUnreadNotifications } from "../hooks/useUnreadNotifications";
import { useChatUnreadCount } from "../hooks/useChatUnreadCount";
import CourseHubLogo from "./logo/Logo";
import NavbarDropdown from "./NavbarDropdown";

export default function NavbarTeacher() {
  const navigate = useNavigate();
  const { logout, estaLogado } = useAuth();
  const { unreadCount } = useUnreadNotifications({ enabled: estaLogado });
  const { unreadCount: unreadChatCount } = useChatUnreadCount({ enabled: estaLogado });

  const teachingItems = [
    {
      label:"Minhas Turmas",
      to: "/professor/minhas-turmas"
    },
    {
      label: "Encontros",
      to: "/professor/encontros",
    },
    {
      label: "Materiais",
      to: "/professor/materiais",
    },
    {
      label: "Atividades",
      to: "/professor/atividades",
    },
    {
      label: "Avaliações",
      to: "/professor/avaliacoes"
    },
     {
      label: "Progresso",
      to: "/professor/progresso"
    },
  ];

  const myClasses = [
   {
      label: "Notas",
      to: "/professor/notas",
    },
    {
      label: "Calendário",
      to: "/professor/calendario"
    },
    {
      label: "Frequência",
      to: "/professor/frequencia"
    },
  ]

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
          grid-cols-[auto_1fr_auto]
          items-center text-center gap-8
          px-6 py-4
        "
      >
        <Link
          to="/professor/dashboard-professor"
          className="flex items-center gap-3 justify-self-start"
        >
          

          <div>            
              <CourseHubLogo />                       

            <p className="text-xs text-gray-500">
              Learn. Build. Grow.
            </p>
          </div>
        </Link>

        <nav
          className="
            hidden items-center justify-center
            gap-7 md:flex
          "
          aria-label="Navegação do professor"
        >
          <NavLink
            to="/professor/dashboard-professor"
            end
            className={linkClass}
          >
            Área do Professor
          </NavLink>

          <NavbarDropdown
          title="Secretaria"
          titleTo="/professor/notas"
          items={myClasses}>

          </NavbarDropdown>

          <NavbarDropdown
            title="Ensino"
            titleTo="/professor/dashboard-professor"
            items={teachingItems}
          />

          <NavLink
            to="/professor/notificacoes"
            className={({ isActive }) => `relative ${linkClass({ isActive })}`}
          >
            Notificações
            {unreadCount > 0 && (
              <span
                className="
                  ml-1.5 inline-flex h-5 min-w-5 items-center justify-center
                  rounded-full bg-red-600 px-1.5 text-xs font-semibold text-white
                "
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </NavLink>

          <NavLink
            to="/professor/chat"
            className={({ isActive }) => `relative ${linkClass({ isActive })}`}
          >
            Chat
            {unreadChatCount > 0 && (
              <span
                className="
                  ml-1.5 inline-flex h-5 min-w-5 items-center justify-center
                  rounded-full bg-red-600 px-1.5 text-xs font-semibold text-white
                "
              >
                {unreadChatCount > 99 ? "99+" : unreadChatCount}
              </span>
            )}
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
            to="/professor/perfil"
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
