import { apiFetch, API_URL } from "./APIService";

function buildEndpoints(basePath) {
  return {
    request: () => apiFetch(basePath, { method: "POST" }),
    status: () => apiFetch(basePath),
    downloadUrl: `${API_URL}${basePath}/download`,
  };
}

function buildEndpointsWithQuery(basePath, query) {
  const queryString = query ? `?${new URLSearchParams(query).toString()}` : "";

  return {
    request: () => apiFetch(`${basePath}${queryString}`, { method: "POST" }),
    status: () => apiFetch(`${basePath}${queryString}`),
    downloadUrl: `${API_URL}${basePath}/download${queryString}`,
  };
}

// Admin -- emissão (mountRequestRoute ativo do lado do backend)
export function getAdminEnrollmentDeclarationEndpoints(enrollmentId) {
  return buildEndpoints(`/api/admin/academic-documents/enrollments/${enrollmentId}/declarations/enrollment`);
}

export function getAdminAttendanceDeclarationEndpoints(enrollmentId, period) {
  return buildEndpointsWithQuery(
    `/api/admin/academic-documents/enrollments/${enrollmentId}/declarations/attendance`,
    period
  );
}

export function getAdminCompletionDeclarationEndpoints(enrollmentId) {
  return buildEndpoints(`/api/admin/academic-documents/enrollments/${enrollmentId}/declarations/completion`);
}

export function getAdminCertificateEndpoints(enrollmentId) {
  return buildEndpoints(`/api/admin/academic-documents/enrollments/${enrollmentId}/certificate`);
}

// Aluno -- só leitura (status/download; POST não existe do lado do backend)
export function getStudentEnrollmentDeclarationEndpoints(enrollmentId) {
  return buildEndpoints(`/api/student/academic-documents/enrollments/${enrollmentId}/declarations/enrollment`);
}

export function getStudentAttendanceDeclarationEndpoints(enrollmentId, period) {
  return buildEndpointsWithQuery(
    `/api/student/academic-documents/enrollments/${enrollmentId}/declarations/attendance`,
    period
  );
}

export function getStudentCompletionDeclarationEndpoints(enrollmentId) {
  return buildEndpoints(`/api/student/academic-documents/enrollments/${enrollmentId}/declarations/completion`);
}

export function getStudentCertificateEndpoints(enrollmentId) {
  return buildEndpoints(`/api/student/academic-documents/enrollments/${enrollmentId}/certificate`);
}

export async function getMyAcademicDocuments() {
  return apiFetch("/api/student/academic-documents/my-documents");
}

export async function getAdminCompletionEligibility(enrollmentId) {
  return apiFetch(`/api/admin/academic-documents/enrollments/${enrollmentId}/completion-eligibility`);
}

export async function getTeacherCompletionEligibility(classId, studentId) {
  return apiFetch(`/api/teacher/academic-documents/classes/${classId}/students/${studentId}/completion-eligibility`);
}

export async function listCompletionRules(courseId) {
  return apiFetch(`/api/admin/academic-documents/courses/${courseId}/completion-rules`);
}

export async function createCompletionRule(courseId, payload) {
  return apiFetch(`/api/admin/academic-documents/courses/${courseId}/completion-rules`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function revokeDeclaration(declarationId, reason) {
  return apiFetch(`/api/admin/academic-documents/declarations/${declarationId}/revoke`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function revokeCertificate(certificateId, reason) {
  return apiFetch(`/api/admin/academic-documents/certificates/${certificateId}/revoke`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function reissueCertificate(certificateId) {
  return apiFetch(`/api/admin/academic-documents/certificates/${certificateId}/reissue`, {
    method: "POST",
  });
}

export async function verifyDocument(code) {
  return apiFetch(`/api/public/documents/verify/${encodeURIComponent(code)}`);
}
