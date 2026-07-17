import { useState, useEffect } from "react";

export default function useCourseContents(id) {
    const [contentsAPI, setContentAPI] = useState([]);
    
    useEffect(() => {
      async function fetchContents() {
        try {
          const resposta = await fetch(`http://localhost:3001/courses/${id}/contents`);
          const dados = await resposta.json();
    
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