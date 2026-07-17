import StudentActivitiesList from "../../components/students/StudentActivitiesList";

export default function AvaliacoesAluno() {
  return (
    <StudentActivitiesList
      title="Minhas Avaliações"
      description="Acompanhe provas, avaliações, prazos e resultados."
      listTitle="Lista de avaliações"
      searchPlaceholder="Buscar avaliação ou curso..."
      emptyMessage="Nenhuma avaliação encontrada."
      actionPendingLabel="Realizar avaliação"
      detailsPath="/aluno/avaliacoes"
      activityKind="exam"
      infoCards={[
        {
          title: "Avaliações pendentes",
          description:
            "São avaliações que ainda precisam ser realizadas dentro do prazo.",
        },
        {
          title: "Avaliações entregues",
          description:
            "São avaliações já enviadas e que podem estar aguardando correção.",
        },
        {
          title: "Avaliações corrigidas",
          description:
            "São avaliações que já receberam nota e feedback do professor.",
        },
      ]}
    />
  );
}