import { useState, useEffect } from "react";
import { apiFetch } from "../services/APIService";

export default function useEnrollment(userId) {
  const [matriculas, setMatriculas] = useState([]);

  useEffect(() => {
    async function fetchMatricula() {
      try {
        const dados = await apiFetch(
          `/students/by-user/${userId}/courses`
        );

        console.log("Dados da matrícula:", dados);

        setMatriculas(Array.isArray(dados) ? dados : []);
      } catch (error) {
        console.error("Erro ao buscar cursos matriculados:", error);
        setMatriculas([]);
      }
    }

    if (userId) {
      fetchMatricula();
    }
  }, [userId]);

  return matriculas;
}