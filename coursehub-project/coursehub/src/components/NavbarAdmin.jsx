import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useUnreadNotifications } from "../hooks/useUnreadNotifications";
import { useChatUnreadCount } from "../hooks/useChatUnreadCount";

import CourseHubLogo from "./logo/Logo";
import NavbarDropdown from "./NavbarDropdown";

export default function NavbarAdmin() {
  const navigate = useNavigate();
  const { logout, estaLogado } = useAuth();
  const { unreadCount } = useUnreadNotifications({ enabled: estaLogado });
  const { unreadCount: unreadChatCount } = useChatUnreadCount({ enabled: estaLogado });

  const linkClass = ({ isActive }) =>
    `text-sm transition ${
      isActive
        ? "font-semibold text-blue-600"
        : "text-gray-600 hover:text-blue-600"
    }`;

  const managementItems = [
    {
      label: "Dashboard",
      to: "/admin/dashboard-admin",
    },
    {
      label: "Usuários",
      to: "/admin/usuarios",
    },
    {
      label: "Relatórios",
      to: "/admin/relatorios",
    },
    {
      label: "Emissão",
      to: "/admin/emissao",
    },
    {
      label: "Calendário",
      to: "/admin/calendario",
    },
    {
      label: "Moderação",
      to: "/admin/moderacao",
    },
    {
      label: "Status do sistema",
      to: "/admin/sistema",
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
      label: "Atividades",
      to: "/admin/atividades",
    },
    {
      label: "Avaliações",
      to: "/admin/avaliacoes",
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
      label: "Frequência",
      to: "/admin/frequencia",
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

  const financialItems = [
    {
      label: "Financeiro",
      to: "/admin/financeiro",
    },
    {
      label: "Contratos",
      to: "/admin/financeiro/contratos",
    },
    {
      label: "Faturas",
      to: "/admin/financeiro/cobrancas"
    },
  ];

  function handleLogout() {
    logout();
    navigate("/", { replace: true });
  }

  return (
    <header className="sticky top-0 z-50 mb-6 border-b border-gray-200 bg-white/80 backdrop-blur">
      <div className="mx-auto grid w-full max-w-[1500px] grid-cols-[auto_1fr_auto] items-center gap-8 px-6 py-4">
        {/* Logo */}
        <Link
          to="/admin"
          className="flex items-center gap-2 justify-self-start"
        >
          <CourseHubLogo />
        </Link>

        {/* Menu central */}
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

          <NavbarDropdown
            title="Financeiro"
            items={financialItems}
          />

          <NavLink
            to="/admin/notificacoes"
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
            to="/admin/chat"
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

        {/* Área direita */}
        <div className="flex items-center justify-end gap-2">
          {/* Botão de logout */}
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

                  M15 15.75
                  18.75 12
                  15 8.25

                  M18.75 12H9
                "
              />
            </svg>
          </button>

          {/* Link para o perfil */}
          <Link
            to="/admin/perfil"
            className="
              flex h-9 items-center gap-2 rounded-full
              bg-slate-950 px-4
              text-sm font-normal text-white
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