const API_URL = "http://localhost:3001";

export async function apiFetch(endpoint, options = {}) {
  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(!isFormData && {
      "Content-Type": "application/json",
    }),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get("content-type");

  let data = null;

  if (contentType?.includes("application/json")) {
    data = await response.json();
  }

  if (!response.ok) {
    console.error("Resposta de erro da API:", data);

    throw new Error(
      data?.error ||
        data?.sqlMessage ||
        data?.message ||
        "Erro na requisição."
    );
  }

  return data;
}