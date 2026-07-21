import { useState, useEffect } from "react";

export default function CourseService() {
    const [cursosAPI, setCursosAPI] = useState([]);
    
    useEffect(() => {
      async function fetchCursos() {
        try {
          const resposta = await fetch("http://localhost:3001/api/courses");
          const dados = await resposta.json();
    
          setCursosAPI(Array.isArray(dados) ? dados : []);
        } catch (error) {
          console.error("Erro ao buscar cursos:", error);
          setCursosAPI([]);
        }
      }
    
      fetchCursos();
    }, []);
    return cursosAPI;
}