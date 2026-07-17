import { createContext, useContext, useEffect, useState } from "react";
import { apiFetch } from "../services/APIService";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const usuarioSalvo = localStorage.getItem("usuarioLogado");

    if (usuarioSalvo) {
      setUsuarioLogado(JSON.parse(usuarioSalvo));
    }

    setLoading(false);
  }, []);

  async function login(email, password) {
    localStorage.removeItem("usuarioLogado");
    setUsuarioLogado(null);

    const data = await apiFetch("/login", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
      }),
    });

    setUsuarioLogado(data.user);
    localStorage.setItem("usuarioLogado", JSON.stringify(data.user));

    return data.user;
  }

  function logout() {
    setUsuarioLogado(null);
    localStorage.removeItem("usuarioLogado");
  }

  return (
    <AuthContext.Provider
      value={{
        usuarioLogado,
        login,
        logout,
        loading,
        estaLogado: !!usuarioLogado,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}