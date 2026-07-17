import { createBrowserRouter } from "react-router-dom";

import PublicLayout from "../layouts/PublicLayout";
import AdminLayout from "../layouts/AdminLayout";
import MainLayout from "../layouts/MainLayout";
import TeacherLayout from "../layouts/TeacherLayout";

import LoginPage from "../pages/public/LoginPage";
import SignUpPage from "../pages/public/SignUpPage";
import HomePage from "../pages/public/HomePage";
import ProfilePage from "../pages/public/ProfilePage";
import CoursesPage from "../pages/public/CoursesPage";
import CoursePage from "../pages/public/CoursePage";
import Dashboard from "../pages/public/DashboardPage";

import HomeAluno from "../pages/aluno/HomeAluno";
import DashboardAluno from "../pages/aluno/DashboardAluno";
import DashboardConteudo from "../pages/aluno/CoursePlayer";
import CourseAluno from "../pages/aluno/CourseAluno";
import AtividadesAluno from "../pages/aluno/AtividadesAluno";
import NotificacoesAluno from "../pages/aluno/NotificacoesAluno";
import AvaliacoesAluno from "../pages/aluno/AvaliacoesAluno";
import NotasAluno from "../pages/aluno/NotasAluno";
import ProgressoAluno from "../pages/aluno/ProgressoAluno";
import ProfileAluno from "../pages/aluno/ProfileAluno";
import StudentActivityRunner from "../pages/aluno/StudentActivityRunner";


import HomeAdmin from "../pages/admin/HomeAdmin";
import DashboardAdmin from "../pages/admin/DashboardAdmin";
import CourseAdmin from "../pages/admin/CourseAdmin";
import StudentsAdmin from "../pages/admin/StudentsAdmin";
import TeachersAdmin from "../pages/admin/TeachersAdmin";
import EmissaoAdmin from "../pages/admin/EmissaoAdmin";
import ProfileAdmin from "../pages/admin/ProfileAdmin";

import HomeProfessor from "../pages/professor/HomeProfessor";
import DashboardProfessor from "../pages/professor/DashboardProfessor";
import MyClassesProfessor from "../pages/professor/MyClassesProfessor";
import MaterialProfessor from "../pages/professor/MaterialProfessor";
import MaterialPlayer from "../pages/professor/MaterialPlayer";
import TasksProfessor from "../pages/professor/TasksProfessor";
import ExamProfessor from "../pages/professor/ExamProfessor";
import ActivitySubmissionsProfessor from "../pages/professor/ActivitySubmissionProfessor";
import SubmissionReviewProfessor from "../pages/professor/SubmissionReviewProfessor";
import AttendanceProfessor from "../pages/professor/AttendanceProfessor";
import GradesProfessor from "../pages/professor/GradesProfessor";
import ProfileProfessor from "../pages/professor/ProfileProfessor";

import ProtectedRoute from "../auth/ProtectedRoute";
import PublicOnlyRoute from "../auth/PublicOnlyRoute";
import RoleRoute from "./RoleRoute";


export const router = createBrowserRouter([
  {
    path: "/",
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "course", element: <CoursesPage /> },
      { path: "course/:id", element: <CoursePage /> },
      { path: "dashboard", element: <Dashboard /> },
      { path: "profile", element: <ProfilePage /> },
    ],
  },

  {
    element: <PublicOnlyRoute />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <SignUpPage /> },
    ],
  },

  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <RoleRoute allowedRoles={["student"]} />,
        children: [
          {
            path: "/aluno",
            element: <MainLayout />,
            children: [
              {
                index: true,
                element: <HomeAluno />,
              },
              {
                path: "dashboard-aluno",
                element: <DashboardAluno />,
              },
              {
                path: "dashboard-aluno/courses/:id",
                element: <DashboardConteudo />,
              },
              {
                path: "meus-cursos",
                element: <CourseAluno />,
              },
              {
                path: "notificacoes",
                element: <NotificacoesAluno />,
              },

              // ============================
              // ATIVIDADES
              // ============================

              {
                path: "atividades",
                element: <AtividadesAluno />,
              },

              // NOVA PÁGINA DA ATIVIDADE
              {
                path: "atividades/:activityId",
                element: <StudentActivityRunner />,
              },

              // ============================
              // AVALIAÇÕES
              // ============================

              {
                path: "avaliacoes",
                element: <AvaliacoesAluno />,
              },
              {
                path: "avaliacoes/:activityId",
                element: <StudentActivityRunner />,
              },
              {
                path: "notas",
                element: <NotasAluno />,
              },
              {
                path: "progresso",
                element: <ProgressoAluno />,
              },

              {
                path: "perfil-aluno",
                element: <ProfileAluno />,
              },
              
            ],
          },
        ],
      },
    ],
  },

  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <RoleRoute allowedRoles={["admin"]} />,
        children: [
          {
            path: "/admin",
            element: <AdminLayout />,
            children: [
              { index: true, element: <HomeAdmin /> },
              { path: "dashboard-admin", element: <DashboardAdmin /> },
              { path: "cursos", element: <CourseAdmin /> },
              { path: "alunos", element: <StudentsAdmin /> },
              { path: "professores", element: <TeachersAdmin /> },
              { path: "emissao", element: <EmissaoAdmin /> },
              { path: "perfil", element: <ProfileAdmin /> },
            ],
          },
        ],
      },
    ],
  },

  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <RoleRoute allowedRoles={["teacher"]} />,
        children: [
          {
            path: "/professor",
            element: <TeacherLayout />,
            children: [
              { index: true, element: <HomeProfessor /> },
              { path: "dashboard-professor", element: <DashboardProfessor /> },
              { path: "minhas-turmas", element: <MyClassesProfessor /> },
              { path: "turmas/:classId", element: <TeacherClassDetails />, },
              { path: "atividades", element: <TasksProfessor /> },
              { path: "avaliacoes", element: <ExamProfessor />},
              { path: "materiais", element: <MaterialProfessor />},
              {
                path: "/professor/atividades/:activityId/envios",
                 element: <ActivitySubmissionsProfessor />,
               },
               {
                 path: "/professor/avaliacoes/:activityId/envios",
                 element: <ActivitySubmissionsProfessor />,
               },
               {
                path: "/professor/envios/:submissionId/corrigir",
                element: <SubmissionReviewProfessor />,
               },
               {
               path: "atividades/courses/:id",
               element: <MaterialPlayer />,
              },
              { path: "notas", element: <GradesProfessor /> },
              { path: "perfil-professor", element: <ProfileProfessor /> },            
              {path: "/professor/turmas/:classId/frequencia", element: <AttendanceProfessor />},
    
            ],
          },
        ],
      },
    ],
  },

  {
    path: "*",
    element: (
      <main className="flex min-h-screen flex-col items-center justify-center">
        <h1 className="text-5xl font-bold">404</h1>
        <p className="mt-4 text-gray-600">Página não encontrada.</p>
      </main>
    ),
  },
]);