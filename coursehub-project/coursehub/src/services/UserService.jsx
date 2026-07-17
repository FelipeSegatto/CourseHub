import { useState, useEffect } from "react";


export default function UserService() {
    const [usersAPI, setUsersAPI] = useState([]);
    
    useEffect(() => {
      async function fetchUsers() {
        try {
          const resposta = await fetch("http://localhost:3001/users");
          const dados = await resposta.json();
    
          setUsersAPI(Array.isArray(dados) ? dados : []);
        } catch (error) {
          console.error("Erro ao buscar usuários:", error);
          setUsersAPI([]);
        }
      }
    
      fetchUsers();
    }, []);
    return usersAPI;
}