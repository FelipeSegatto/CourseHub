import { useState, useEffect } from "react";
import { apiFetch } from "../services/APIService";

export default function useCourseContents(id) {
    const [contentsAPI, setContentAPI] = useState([]);

    useEffect(() => {
      async function fetchContents() {
        try {
          const dados = await apiFetch(`/api/courses/${id}/contents`);

          setContentsAPI(Array.isArray(dados) ? dados : []);
        } catch (error) {
          console.error("Erro ao buscar cursos:", error);
          setCursosAPI([]);
        }
      }
    
      fetchContents();
    }, []);
    return contentsAPI;
}