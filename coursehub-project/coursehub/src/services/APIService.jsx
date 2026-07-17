const API_URL = "http://localhost:3001";

export async function apiFetch(endpoint, options = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Resposta de erro da API:");
    console.log(data);

    throw new Error(
      data.error ||
      data.sqlMessage ||
      data.message ||
      "Erro na requisição."
    );
  }

  return data;
}