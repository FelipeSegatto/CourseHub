import { apiFetch } from "./APIService";

function buildQueryString(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    const shouldIgnore = value === undefined || value === null || value === "";

    if (!shouldIgnore) {
      query.append(key, String(value));
    }
  });

  return query.toString();
}

export async function listAcademicProgress(params = {}) {
  const queryString = buildQueryString(params);

  return apiFetch(
    queryString ? `/api/admin/academic-progress?${queryString}` : "/api/admin/academic-progress"
  );
}
