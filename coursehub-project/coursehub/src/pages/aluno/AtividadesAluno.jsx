import StudentActivitiesList from "../../components/students/StudentActivitiesList";

export default function AtividadesAluno() {
  return (
    <StudentActivitiesList
      title="Minhas Atividades"
      description="Acompanhe tarefas pendentes, entregas, prazos e notas."
      listTitle="Lista de atividades"
      searchPlaceholder="Buscar atividade ou curso..."
      emptyMessage="Nenhuma atividade encontrada."
      actionPendingLabel="Realizar atividade"
      detailsPath="/aluno/atividades"
      activityKind="activity"
      infoCards={[
        {
          title: "Atividades pendentes",
          description:
            "São tarefas que ainda precisam ser feitas e enviadas dentro do prazo.",
        },
        {
          title: "Atividades entregues",
          description:
            "São tarefas já enviadas, mas que ainda podem estar aguardando correção.",
        },
        {
          title: "Atividades corrigidas",
          description:
            "São tarefas que já receberam nota e feedback do professor.",
        },
      ]}
    />
  );
}